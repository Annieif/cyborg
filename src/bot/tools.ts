import { Bot } from 'mineflayer';
import { BotTool } from '../ai/types';

/** 截图回调类型 */
export type ScreenshotCallback = () => Promise<string | null>;

/**
 * 创建 Bot 可用工具集（供 AI Function Calling 使用）
 */
export function createBotTools(bot: Bot, onScreenshot?: ScreenshotCallback): BotTool[] {
  const botAny = bot as any;
  const tools: BotTool[] = [
    // === 移动相关 ===
    {
      name: 'moveTo',
      description: '移动到指定坐标。参数 x, y, z 为目标坐标。',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X 坐标' },
          y: { type: 'number', description: 'Y 坐标' },
          z: { type: 'number', description: 'Z 坐标' },
        },
        required: ['x', 'y', 'z'],
      },
      execute: async (args) => {
        const { x, y, z } = args as { x: number; y: number; z: number };
        return new Promise((resolve) => {
          botAny.pathfinder.setGoal(
            new (require('mineflayer-pathfinder').goals.GoalNear)(x, y, z, 1)
          );
          (bot as any).once('goal_reached', () => resolve('已到达目标位置'));
          setTimeout(() => resolve('移动超时'), 30000);
        });
      },
    },

    // === 聊天相关 ===
    {
      name: 'sendChat',
      description: '在游戏公屏发送聊天消息',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '要发送的消息内容' },
        },
        required: ['message'],
      },
      execute: async (args) => {
        const { message } = args as { message: string };
        bot.chat(message);
        return `已发送消息: ${message}`;
      },
    },

    {
      name: 'whisper',
      description: '私聊某个玩家',
      parameters: {
        type: 'object',
        properties: {
          player: { type: 'string', description: '玩家名称' },
          message: { type: 'string', description: '私聊内容' },
        },
        required: ['player', 'message'],
      },
      execute: async (args) => {
        const { player, message } = args as { player: string; message: string };
        bot.chat(`/msg ${player} ${message}`);
        return `已私聊 ${player}: ${message}`;
      },
    },

    // === 方块操作 ===
    {
      name: 'digBlock',
      description: '挖掘指定位置的方块',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X 坐标' },
          y: { type: 'number', description: 'Y 坐标' },
          z: { type: 'number', description: 'Z 坐标' },
        },
        required: ['x', 'y', 'z'],
      },
      execute: async (args) => {
        const { x, y, z } = args as { x: number; y: number; z: number };
        const block = bot.blockAt(new (require('vec3'))(x, y, z));
        if (!block || block.name === 'air') return '该位置没有可挖掘的方块';
        await bot.dig(block);
        return `已挖掘 ${block.name} 在 (${x}, ${y}, ${z})`;
      },
    },

    {
      name: 'placeBlock',
      description: '在指定位置放置方块。需要先选择要放置的方块到手中。',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X 坐标' },
          y: { type: 'number', description: 'Y 坐标' },
          z: { type: 'number', description: 'Z 坐标' },
          faceX: { type: 'number', description: '放置面的 X 方向', default: 0 },
          faceY: { type: 'number', description: '放置面的 Y 方向', default: 1 },
          faceZ: { type: 'number', description: '放置面的 Z 方向', default: 0 },
        },
        required: ['x', 'y', 'z'],
      },
      execute: async (args) => {
        const { x, y, z, faceX = 0, faceY = 1, faceZ = 0 } = args as {
          x: number; y: number; z: number;
          faceX: number; faceY: number; faceZ: number;
        };
        const referenceBlock = bot.blockAt(new (require('vec3'))(x, y, z));
        if (!referenceBlock) return '无法找到参考方块';
        const faceVec = new (require('vec3'))(faceX, faceY, faceZ);
        await bot.placeBlock(referenceBlock, faceVec);
        return `已在 (${x}, ${y}, ${z}) 放置方块`;
      },
    },

    // === 物品管理 ===
    {
      name: 'getInventory',
      description: '查看背包物品列表',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const items = bot.inventory.items();
        if (items.length === 0) return '背包为空';
        return items
          .map((item) => `${item.name} x${item.count} (槽位 ${item.slot})`)
          .join('\n');
      },
    },

    {
      name: 'equipItem',
      description: '将指定物品切换到手中',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: '物品名称（英文）' },
        },
        required: ['itemName'],
      },
      execute: async (args) => {
        const { itemName } = args as { itemName: string };
        const item = bot.inventory.items().find(
          (i) => i.name.toLowerCase().includes(itemName.toLowerCase())
        );
        if (!item) return `背包中没有 ${itemName}`;
        await bot.equip(item, 'hand');
        return `已装备 ${item.name} 到手中`;
      },
    },

    {
      name: 'collectNearbyItems',
      description: '收集附近的掉落物',
      parameters: {
        type: 'object',
        properties: {
          radius: { type: 'number', description: '收集半径', default: 16 },
        },
      },
      execute: async (args) => {
        const { radius = 16 } = args as { radius: number };
        const entities = Object.values(bot.entities).filter(
          (e) => e.name === 'item' || e.name === 'Item'
        );
        if (entities.length === 0) return '附近没有掉落物';
        const nearest = entities[0];
        if (!nearest) return '附近没有掉落物';
        try {
          await botAny.collectBlock.collect(nearest);
          return `已收集 ${entities.length} 个掉落物中最近的`;
        } catch {
          return '收集失败';
        }
      },
    },

    // === 世界感知 ===
    {
      name: 'getNearbyPlayers',
      description: '获取附近玩家列表',
      parameters: {
        type: 'object',
        properties: {
          radius: { type: 'number', description: '搜索半径', default: 50 },
        },
      },
      execute: async (args) => {
        const { radius = 50 } = args as { radius: number };
        const players = Object.values(bot.players)
          .filter((p) => p.entity && p.username !== bot.username)
          .map((p) => {
            const dist = p.entity
              ? p.entity.position.distanceTo(bot.entity.position).toFixed(1)
              : '?';
            return `${p.username} (距离: ${dist}m)`;
          });
        if (players.length === 0) return '附近没有其他玩家';
        return players.join('\n');
      },
    },

    {
      name: 'getPosition',
      description: '获取当前坐标和所在维度',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const pos = bot.entity.position;
        return `当前位置: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) 维度: ${bot.game.dimension}`;
      },
    },

    {
      name: 'getTime',
      description: '获取当前游戏时间和天气',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const time = bot.time.timeOfDay;
        const hours = Math.floor((time / 1000 + 6) % 24);
        const minutes = Math.floor((time % 1000) / 1000 * 60);
        const weather = bot.isRaining ? (bot.thunderState > 0 ? '雷暴' : '下雨') : '晴天';
        return `游戏时间: ${hours}:${String(minutes).padStart(2, '0')} | 天气: ${weather} | 生命值: ${bot.health.toFixed(0)} | 饥饿值: ${bot.food.toFixed(0)}/20`;
      },
    },

    // === 战斗相关 ===
    {
      name: 'attackNearestHostile',
      description: '攻击最近的敌对生物',
      parameters: {
        type: 'object',
        properties: {
          range: { type: 'number', description: '攻击范围', default: 5 },
        },
      },
      execute: async (args) => {
        const { range = 5 } = args as { range: number };
        const hostiles = ['zombie', 'skeleton', 'spider', 'creeper', 'witch', 'enderman'];
        const entity = bot.nearestEntity(
          (e) => e.type === 'mob' && hostiles.includes(e.name || '') && e !== bot.entity
        );
        if (!entity) return '附近没有敌对生物';
        const dist = entity.position.distanceTo(bot.entity.position);
        if (dist > range) return `最近的敌对生物在 ${dist.toFixed(1)}m 外，超出范围`;
        await botAny.pvp.attack(entity);
        return `正在攻击 ${entity.name || '未知生物'}`;
      },
    },

    // === 生存操作 ===
    {
      name: 'eatFood',
      description: '自动进食。从背包中寻找食物并食用，恢复饥饿值。',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const foodNames = [
          'cooked_beef', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken',
          'cooked_rabbit', 'cooked_cod', 'cooked_salmon', 'steak', 'porkchop',
          'mutton', 'chicken', 'rabbit', 'cod', 'salmon', 'bread',
          'apple', 'golden_apple', 'golden_carrot', 'carrot', 'baked_potato',
          'potato', 'beetroot', 'beetroot_soup', 'mushroom_stew', 'rabbit_stew',
          'pumpkin_pie', 'cookie', 'melon_slice', 'sweet_berries', 'glow_berries',
          'chorus_fruit', 'dried_kelp', 'tropical_fish', 'rotten_flesh',
        ];
        const foodItem = bot.inventory.items().find((item) =>
          foodNames.includes(item.name)
        );
        if (!foodItem) return '背包中没有食物';
        await bot.equip(foodItem, 'hand');
        await bot.consume();
        return `已食用 ${foodItem.name}`;
      },
    },

    {
      name: 'sleep',
      description: '在附近的床上睡觉。需要附近有床且是夜晚或雷暴天气。',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const bed = bot.findBlock({
          matching: (block) => block.name.includes('bed'),
          maxDistance: 5,
        });
        if (!bed) return '附近没有床';
        try {
          await bot.sleep(bed);
          return '已躺下睡觉';
        } catch (err) {
          return `无法睡觉: ${err}`;
        }
      },
    },

    {
      name: 'fish',
      description: '在附近水域钓鱼。需要手持钓鱼竿。',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const fishingRod = bot.inventory.items().find((i) => i.name === 'fishing_rod');
        if (!fishingRod) return '背包中没有钓鱼竿';
        await bot.equip(fishingRod, 'hand');
        const waterBlock = bot.findBlock({
          matching: (block) => block.name === 'water',
          maxDistance: 10,
        });
        if (!waterBlock) return '附近没有水域';
        try {
          await bot.lookAt(waterBlock.position);
          await bot.fish();
          return '开始钓鱼...';
        } catch (err) {
          return `钓鱼失败: ${err}`;
        }
      },
    },

    {
      name: 'openChest',
      description: '打开附近的箱子并查看内容。',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const chest = bot.findBlock({
          matching: (block) => block.name === 'chest' || block.name === 'trapped_chest' || block.name === 'barrel' || block.name === 'shulker_box',
          maxDistance: 5,
        });
        if (!chest) return '附近没有箱子';
        try {
          const container = await bot.openContainer(chest);
          const items = container.containerItems();
          container.close();
          if (items.length === 0) return '箱子为空';
          const summary: Record<string, number> = {};
          for (const item of items) {
            summary[item.name] = (summary[item.name] || 0) + item.count;
          }
          return '箱子内容:\n' + Object.entries(summary)
            .map(([name, count]) => `${name} x${count}`)
            .join('\n');
        } catch (err) {
          return `无法打开箱子: ${err}`;
        }
      },
    },

    {
      name: 'craftItem',
      description: '在工作台合成物品。需要附近有工作台，背包中有足够材料。',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: '要合成的物品名称（英文）' },
          count: { type: 'number', description: '合成数量', default: 1 },
        },
        required: ['itemName'],
      },
      execute: async (args) => {
        const { itemName, count = 1 } = args as { itemName: string; count: number };
        const table = bot.findBlock({
          matching: (block) => block.name === 'crafting_table',
          maxDistance: 5,
        });
        if (!table) return '附近没有工作台，无法合成';
        try {
          const recipe = bot.recipesFor(
            require('minecraft-data')(bot.version).itemsByName[itemName]?.id || 0,
            null,
            1,
            true
          )[0];
          if (!recipe) return `没有 ${itemName} 的合成配方`;
          await bot.craft(recipe, count, table);
          return `已合成 ${count} 个 ${itemName}`;
        } catch (err) {
          return `合成失败: ${err}`;
        }
      },
    },

    {
      name: 'smeltItem',
      description: '在熔炉中熔炼物品。需要附近有熔炉，背包中有燃料和原料。',
      parameters: {
        type: 'object',
        properties: {
          itemName: { type: 'string', description: '要熔炼的原料名称（英文）' },
        },
        required: ['itemName'],
      },
      execute: async (args) => {
        const { itemName } = args as { itemName: string };
        const furnace = bot.findBlock({
          matching: (block) => block.name === 'furnace' || block.name === 'blast_furnace',
          maxDistance: 5,
        });
        if (!furnace) return '附近没有熔炉';
        const item = bot.inventory.items().find(
          (i) => i.name.toLowerCase().includes(itemName.toLowerCase())
        );
        if (!item) return `背包中没有 ${itemName}`;
        try {
          const furnaceBlock = await bot.openFurnace(furnace);
          // 放入原料
          await furnaceBlock.putInput(item.type, null, 1);
          // 自动寻找燃料
          const fuelItems = ['coal', 'charcoal', 'oak_planks', 'birch_planks', 'spruce_planks',
            'jungle_planks', 'acacia_planks', 'dark_oak_planks', 'mangrove_planks',
            'cherry_planks', 'bamboo_planks', 'crimson_planks', 'warped_planks', 'lava_bucket'];
          const fuel = bot.inventory.items().find((i) => fuelItems.includes(i.name));
          if (fuel) {
            await furnaceBlock.putFuel(fuel.type, null, 1);
          }
          furnaceBlock.close();
          return `已将 ${itemName} 放入熔炉熔炼`;
        } catch (err) {
          return `熔炼失败: ${err}`;
        }
      },
    },

    {
      name: 'enchantItem',
      description: '在附魔台给物品附魔。需要附近有附魔台，手中持有可附魔物品，且有足够经验等级。',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const table = bot.findBlock({
          matching: (block) => block.name === 'enchanting_table',
          maxDistance: 5,
        });
        if (!table) return '附近没有附魔台';
        const heldItem = bot.heldItem;
        if (!heldItem) return '手中没有物品';
        try {
          const enchantTable = await bot.openEnchantmentTable(table);
          const enchantments = enchantTable.enchantments;
          enchantTable.close();
          if (!enchantments || enchantments.length === 0) {
            return '附魔台没有可用的附魔选项';
          }
          return `附魔台可用选项: ${enchantments.map((e: any) =>
            `${e.level}级 - ${e.name || '未知附魔'}`
          ).join(', ')}`;
        } catch (err) {
          return `附魔失败: ${err}`;
        }
      },
    },
  ];

  // === 多模态：截图工具（实验性） ===
  if (onScreenshot) {
    tools.push({
      name: 'screenshot',
      description: '截取当前游戏画面截图，用于分析周围环境。仅在配置了视觉模式时可用。注意：此操作消耗大量 token。',
      parameters: {
        type: 'object',
        properties: {
          detail: { type: 'string', description: '截图质量: low/high/auto', default: 'low' },
        },
      },
      execute: async () => {
        try {
          const base64 = await onScreenshot();
          if (!base64) return '截图功能不可用（未安装 prismarine-viewer）';
          return `截图已捕获 (base64 长度: ${base64.length})`;
        } catch (err) {
          return `截图失败: ${err}`;
        }
      },
    });
  }

  return tools;
}