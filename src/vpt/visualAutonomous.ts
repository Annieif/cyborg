/**
 * VPT Visual Autonomous Mode — Vision-based autonomous behavior powered by VPT.
 *
 * Unlike the AI-driven autonomous mode (which uses LLM text-based decisions),
 * this mode uses the VPT vision model to predict Minecraft actions directly
 * from screen captures.
 *
 * Workflow:
 *   1. Capture screenshot from bot's perspective (prismarine-viewer)
 *   2. Send to VPT Bridge for action prediction
 *   3. Execute predicted action on the bot
 *   4. Repeat at configurable interval
 *
 * This mode operates independently from the LLM chat system and can
 * coexist with it — VPT handles basic movement/exploration while the
 * LLM handles chat and complex tool interactions.
 */

import type { Bot } from 'mineflayer';
import { VPTClient } from './client';
import { executeVPTAction, isNullAction, describeAction } from './actionMapper';
import { getLogger } from '../utils/logger';

const logger = getLogger();

export interface VPTAutonomousConfig {
  /** VPT bridge server URL */
  bridgeUrl: string;
  /** Interval between VPT actions (ms) */
  interval: number;
  /** Whether to enable stochastic action sampling */
  stochastic: boolean;
  /** Maximum consecutive null actions before taking a random action */
  maxNullActions: number;
  /** Resume delay after chat interruption (ms) */
  resumeDelay: number;
}

const DEFAULT_CONFIG: VPTAutonomousConfig = {
  bridgeUrl: 'http://127.0.0.1:8765',
  interval: 200,
  stochastic: true,
  maxNullActions: 30,
  resumeDelay: 5000,
};

export class VPTAutonomousBehavior {
  private bot: Bot;
  private client: VPTClient;
  private config: VPTAutonomousConfig;
  private loopTimer: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = false;
  private paused: boolean = false;
  private nullActionCount: number = 0;
  private actionCount: number = 0;
  private lastAction: string = 'none';

  constructor(bot: Bot, config?: Partial<VPTAutonomousConfig>) {
    this.bot = bot;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = new VPTClient(this.config.bridgeUrl);
  }

  /** Start the VPT autonomous loop */
  async start(): Promise<void> {
    if (this.enabled) return;

    // Check bridge health first
    const health = await this.client.checkHealth();
    if (!health || !health.model_loaded) {
      logger.warn('VPT bridge not available — visual autonomous mode disabled');
      logger.warn('Start the VPT bridge: python vpt/bridge_server.py --model <model> --weights <weights>');
      return;
    }

    logger.info(`VPT visual autonomous mode started (device: ${health.device}, interval: ${this.config.interval}ms)`);
    this.enabled = true;
    this.paused = false;
    this.nullActionCount = 0;
    this.actionCount = 0;

    // Reset agent state for new episode
    await this.client.reset();

    this.loop();
  }

  /** Stop the VPT autonomous loop */
  stop(): void {
    this.enabled = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    logger.info('VPT visual autonomous mode stopped');
  }

  /** Pause VPT mode (e.g., when player is chatting) */
  pause(): void {
    this.paused = true;
    logger.debug('VPT mode paused');
  }

  /** Resume VPT mode after a delay */
  resume(): void {
    if (!this.enabled) return;
    setTimeout(() => {
      this.paused = false;
      logger.debug('VPT mode resumed');
    }, this.config.resumeDelay);
  }

  /** Main autonomous loop */
  private async loop(): Promise<void> {
    if (!this.enabled) return;

    try {
      if (!this.paused) {
        await this.step();
      }
    } catch (err) {
      logger.error('VPT step error:', err);
    }

    // Schedule next step
    this.loopTimer = setTimeout(() => this.loop(), this.config.interval);
  }

  /** Single VPT step: capture → predict → execute */
  private async step(): Promise<void> {
    // 1. Capture screenshot from bot's perspective
    const screenshot = await this.captureScreenshot();
    if (!screenshot) {
      // No screenshot available, skip this step
      this.nullActionCount++;
      return;
    }

    // 2. Get action prediction from VPT bridge
    const action = await this.client.predictAction(screenshot, this.config.stochastic);
    if (!action) {
      this.nullActionCount++;
      return;
    }

    // 3. Handle null actions (no buttons, no camera movement)
    if (isNullAction(action)) {
      this.nullActionCount++;
      this.lastAction = 'null';

      // If too many consecutive null actions, inject a small random action
      if (this.nullActionCount >= this.config.maxNullActions) {
        logger.debug('Too many null actions, injecting random movement');
        this.injectRandomAction();
        this.nullActionCount = 0;
      }
      return;
    }

    // 4. Execute the action
    this.nullActionCount = 0;
    this.actionCount++;
    const description = await executeVPTAction(this.bot, action);
    this.lastAction = description;

    if (description !== 'noop') {
      logger.debug(`VPT action #${this.actionCount}: ${describeAction(action)} → ${description}`);
    }
  }

  /** Capture a screenshot from the bot's perspective */
  private async captureScreenshot(): Promise<string | null> {
    try {
      // Try using prismarine-viewer headless mode
      const viewer = require('prismarine-viewer');
      const { createCanvas } = require('canvas');

      const canvas = createCanvas(640, 360);
      const worldView = viewer.headless;

      if (worldView && typeof worldView.render === 'function') {
        await worldView.render(this.bot, canvas);
        // Convert to base64 PNG
        const buffer = canvas.toBuffer('image/png');
        return buffer.toString('base64');
      }

      return null;
    } catch {
      // prismarine-viewer or canvas not available
      return null;
    }
  }

  /**
   * Inject a random movement action to break out of "stuck" states.
   * This simulates the exploration behavior that VPT would normally produce.
   */
  private injectRandomAction(): void {
    const actions = ['forward', 'jump', 'left', 'right'];
    const action = actions[Math.floor(Math.random() * actions.length)];

    switch (action) {
      case 'forward':
        this.bot.setControlState('forward', true);
        setTimeout(() => this.bot.setControlState('forward', false), 200);
        break;
      case 'jump':
        this.bot.setControlState('jump', true);
        setTimeout(() => this.bot.setControlState('jump', false), 100);
        break;
      case 'left':
        this.bot.setControlState('left', true);
        setTimeout(() => this.bot.setControlState('left', false), 150);
        break;
      case 'right':
        this.bot.setControlState('right', true);
        setTimeout(() => this.bot.setControlState('right', false), 150);
        break;
    }

    this.lastAction = `random(${action})`;
  }

  /** Get current status */
  getStatus() {
    return {
      enabled: this.enabled,
      paused: this.paused,
      connected: this.client.isConnected(),
      modelLoaded: this.client.isModelLoaded(),
      actionCount: this.actionCount,
      nullActionCount: this.nullActionCount,
      lastAction: this.lastAction,
    };
  }
}