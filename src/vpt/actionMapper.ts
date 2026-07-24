/**
 * VPT Action Mapper — Maps VPT model output actions to Mineflayer bot commands.
 *
 * VPT uses a discrete action space with:
 * - Buttons: attack, back, forward, jump, left, right, sneak, sprint, use, drop, inventory, hotbar.1-9
 * - Camera: continuous pitch/yaw delta values
 *
 * This module converts VPT predicted actions into Mineflayer API calls.
 *
 * Reference:
 *   - VPT lib/action_mapping.py CameraHierarchicalMapping
 *   - MineRL standard action space (minerl_actions.py)
 *   - https://minerl.readthedocs.io/
 */

import type { Bot } from 'mineflayer';

/** VPT button names (matching VPT Buttons.ALL and MineRL KEYBOARD_BUTTON_MAPPING) */
export const VPT_BUTTONS = [
  'attack', 'back', 'forward', 'jump', 'left', 'right',
  'sneak', 'sprint', 'use', 'drop', 'inventory',
] as const;

export type VPTButton = typeof VPT_BUTTONS[number];

/** VPT action as returned by the bridge server */
export interface VPTAction {
  buttons: string[];
  camera: { pitch: number; yaw: number };
  is_null: boolean;
}

/**
 * MineRL → Mineflayer action mapping reference.
 * Mirrors vpt/minerl_actions.py MINERL_TO_MINEFLAYER.
 */
export const MINERL_MINEFLAYER_MAP: Record<string, { type: string; params: Record<string, unknown> }> = {
  forward:  { type: 'control', params: { state: 'forward', duration: 150 } },
  back:     { type: 'control', params: { state: 'back', duration: 150 } },
  left:     { type: 'control', params: { state: 'left', duration: 150 } },
  right:    { type: 'control', params: { state: 'right', duration: 150 } },
  jump:     { type: 'control', params: { state: 'jump', duration: 100 } },
  sprint:   { type: 'control', params: { state: 'sprint', duration: 200 } },
  sneak:    { type: 'control', params: { state: 'sneak', duration: 200 } },
  attack:   { type: 'attack', params: {} },
  use:      { type: 'use', params: {} },
  drop:     { type: 'drop', params: {} },
  inventory:{ type: 'inventory', params: {} },
  pickItem: { type: 'pickBlock', params: {} },
  swapHands:{ type: 'swapHands', params: {} },
  ESC:      { type: 'esc', params: {} },
  camera:   { type: 'camera', params: {} },
};
// Hotbar slots
for (let i = 1; i <= 9; i++) {
  MINERL_MINEFLAYER_MAP[`hotbar.${i}`] = { type: 'hotbar', params: { slot: i - 1 } };
}

/** MineRL camera scaler: maps mouse dx/dy to camera yaw/pitch */
export const CAMERA_SCALER = 360.0 / 2400.0; // ≈ 0.15 (matches MineRL Java code)

/** Mineflayer control states that can be toggled */
const CONTROL_MAP: Record<string, string> = {
  forward: 'forward',
  back: 'back',
  left: 'left',
  right: 'right',
  jump: 'jump',
  sprint: 'sprint',
  sneak: 'sneak',
};

// Type for Mineflayer control states
type ControlState = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint' | 'sneak';

/** Duration to hold movement controls (ms) */
const MOVEMENT_DURATION = 150;

/** Camera sensitivity multiplier for VPT yaw/pitch deltas */
const CAMERA_SENSITIVITY = 1.0;

/**
 * Execute a VPT action on a Mineflayer bot.
 *
 * @param bot - Mineflayer Bot instance
 * @param action - VPT action from bridge server
 * @returns Human-readable description of what was executed
 */
export async function executeVPTAction(bot: Bot, action: VPTAction): Promise<string> {
  const executed: string[] = [];

  // 1. Handle camera movement (yaw/pitch)
  if (action.camera.pitch !== 0 || action.camera.yaw !== 0) {
    const currentYaw = bot.entity.yaw;
    const currentPitch = bot.entity.pitch;

    // VPT camera values are deltas, apply to current look direction
    // VPT yaw is horizontal (left/right), pitch is vertical (up/down)
    const newYaw = currentYaw + (action.camera.yaw * CAMERA_SENSITIVITY * Math.PI) / 180;
    const newPitch = currentPitch + (action.camera.pitch * CAMERA_SENSITIVITY * Math.PI) / 180;

    await bot.look(newYaw, newPitch, false);
    executed.push(`camera(pitch:${action.camera.pitch.toFixed(1)}, yaw:${action.camera.yaw.toFixed(1)})`);
  }

  // 2. Handle button actions
  for (const btn of action.buttons) {
    switch (btn) {
      case 'attack': {
        const entity = bot.entityAtCursor(4);
        if (entity) {
          try {
            const botAny = bot as any;
            if (botAny.pvp) {
              await botAny.pvp.attack(entity);
            } else {
              bot.attack(entity);
            }
            executed.push(`attack(${entity.name || 'entity'})`);
          } catch {
            // Attack may fail if entity is too far
          }
        }
        break;
      }

      case 'use': {
        // Right-click: place block, interact with entity, or use item
        const entity = bot.entityAtCursor(4);
        if (entity) {
          try {
            await bot.useOn(entity);
            executed.push(`useOn(${entity.name || 'entity'})`);
          } catch {
            await bot.activateItem();
            executed.push('use(item)');
          }
        } else {
          // Try to place block from inventory
          const block = bot.blockAtCursor(5);
          if (block) {
            try {
              await bot.placeBlock(block, { x: 0, y: 1, z: 0 } as any);
              executed.push('place');
            } catch {
              await bot.activateItem();
              executed.push('use(item)');
            }
          } else {
            await bot.activateItem();
            executed.push('use(item)');
          }
        }
        break;
      }

      case 'drop': {
        const held = bot.heldItem;
        if (held) {
          await bot.tossStack(held);
          executed.push(`drop(${held.name})`);
        }
        break;
      }

      case 'inventory': {
        // Open inventory is not directly supported in Mineflayer
        // We can open a nearby chest instead
        const chest = bot.findBlock({
          matching: (block) => {
            const name = block.name || '';
            return name.includes('chest') || name.includes('barrel') || name.includes('shulker_box');
          },
          maxDistance: 5,
        });
        if (chest) {
          try {
            const botAny = bot as any;
            const chestWindow = await botAny.openContainer?.(chest);
            if (chestWindow) {
              executed.push('openChest');
              // Close after a short delay
              setTimeout(() => chestWindow.close(), 2000);
            }
          } catch {
            executed.push('inventory(ignored)');
          }
        }
        break;
      }

      case 'sprint': {
        bot.setControlState('sprint', true);
        setTimeout(() => bot.setControlState('sprint', false), MOVEMENT_DURATION * 2);
        executed.push('sprint');
        break;
      }

      case 'sneak': {
        bot.setControlState('sneak', true);
        setTimeout(() => bot.setControlState('sneak', false), MOVEMENT_DURATION * 2);
        executed.push('sneak');
        break;
      }

      default: {
        // Handle movement controls (forward, back, left, right, jump)
        const control = CONTROL_MAP[btn];
        if (control) {
          bot.setControlState(control as ControlState, true);
          setTimeout(() => bot.setControlState(control as ControlState, false), MOVEMENT_DURATION);
          executed.push(btn);
        } else if (btn.startsWith('hotbar.')) {
          // Hotbar slot selection
          const slot = parseInt(btn.split('.')[1], 10);
          if (slot >= 1 && slot <= 9) {
            await bot.setQuickBarSlot(slot - 1);
            executed.push(`hotbar.${slot}`);
          }
        }
        break;
      }
    }
  }

  if (executed.length === 0) {
    return 'noop';
  }

  return executed.join(', ');
}

/**
 * Check if a VPT action is a null action (no meaningful action).
 */
export function isNullAction(action: VPTAction): boolean {
  return action.is_null || (
    action.buttons.length === 0 &&
    Math.abs(action.camera.pitch) < 0.05 &&
    Math.abs(action.camera.yaw) < 0.05
  );
}

/**
 * Convert VPT action to a human-readable description.
 * Useful for logging and debugging.
 */
export function describeAction(action: VPTAction): string {
  if (isNullAction(action)) return 'null (no action)';

  const parts: string[] = [];

  if (action.buttons.length > 0) {
    parts.push(`buttons: [${action.buttons.join(', ')}]`);
  }

  if (Math.abs(action.camera.pitch) > 0.05 || Math.abs(action.camera.yaw) > 0.05) {
    parts.push(`camera: (p=${action.camera.pitch.toFixed(2)}, y=${action.camera.yaw.toFixed(2)})`);
  }

  return parts.join(' | ') || 'noop';
}