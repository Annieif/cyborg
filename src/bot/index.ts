import mineflayer from 'mineflayer';
import { getConfig } from '../config';
import { getLogger } from '../utils/logger';
import { ConversationManager } from '../ai/conversation';
import { createBotTools, ScreenshotCallback } from './tools';
import { createCommandSystem } from './commands';
import { RateLimiter } from '../utils/rateLimiter';
import { HealthMonitor } from '../utils/healthMonitor';
import { ExperienceMemory } from '../utils/experienceMemory';
import { AutonomousBehavior } from './autonomous';
import { EventEmitter } from 'events';

const pathfinder = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp');
const collectBlock = require('mineflayer-collectblock');

export interface BotEvent {
  chat: (username: string, message: string) => void;
  playerJoined: (username: string) => void;
  playerLeft: (username: string) => void;
  death: () => void;
  error: (error: Error) => void;
  ready: () => void;
  kicked: (reason: string) => void;
  end: (reason: string) => void;
  reconnecting: (attempt: number, maxAttempts: number) => void;
}

/** 真人代理指令 */
export interface ProxyCommand {
  action: 'move' | 'look' | 'dig' | 'place' | 'attack' | 'use' | 'drop' | 'collect' | 'chat' | 'follow' | 'goto';
  params: Record<string, unknown>;
}

export class CyborgBot extends EventEmitter {
  private bot: mineflayer.Bot | null = null;
  private conversation: ConversationManager | null = null;
  private chatLimiter: RateLimiter;
  private health: HealthMonitor;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private reconnectBaseDelay = 3000;
  private reconnectMaxDelay = 60000;
  private isShuttingDown = false;
  private proxyMode = false; // 真人代理模式
  private expMemory: ExperienceMemory;
  private autonomous: AutonomousBehavior | null = null; // 类人机自主模式

  constructor(host?: string, port?: number) {
    super();
    this.chatLimiter = new RateLimiter(4, 10000);
    this.health = new HealthMonitor();
    const config = getConfig();
    this.expMemory = new ExperienceMemory(host || config.minecraft.host, port || config.minecraft.port);
  }

  /** 启动 Bot */
  async start(): Promise<void> {
    const config = getConfig();
    const logger = getLogger();

    logger.info('Starting CyborgBot...');

    this.bot = mineflayer.createBot({
      host: config.minecraft.host,
      port: config.minecraft.port,
      username: config.minecraft.username,
      version: config.minecraft.version,
      auth: config.minecraft.auth as 'offline' | 'microsoft',
      checkTimeoutInterval: 30000,
    });

    this.bot.loadPlugin(pathfinder.pathfinder);
    this.bot.loadPlugin(pvp.plugin);
    this.bot.loadPlugin(collectBlock.plugin);

    this.conversation = new ConversationManager(
      undefined, // 使用默认 persona
      this.expMemory.getSystemPrompt()
    );
    this.conversation.registerTools(createBotTools(this.bot, this.takeScreenshot.bind(this)));

    createCommandSystem(this.bot, this.conversation);

    // 启动类人机自主模式
    this.autonomous = new AutonomousBehavior(this.bot, this.conversation, (msg) => this.safeChat(msg));
    this.autonomous.start();

    this.registerEvents();

    return new Promise((resolve) => {
      this.bot!.once('spawn', () => {
        this.reconnectAttempts = 0; // 连接成功，重置重连计数
        logger.info('Bot spawned in world');
        this.emit('ready');
        resolve();
      });
    });
  }

  /** 注册事件处理器 */
  private registerEvents(): void {
    const bot = this.bot!;
    const logger = getLogger();

    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      logger.info(`[Chat] ${username}: ${message}`);
      this.emit('chat', username, message);

      // 任何聊天都退出自主模式
      this.autonomous?.onChat();

      if (
        message.startsWith(bot.username) ||
        message.startsWith('@') ||
        message.includes('赛博人')
      ) {
        this.handleChatMessage(username, message);
      }
    });

    bot.on('playerJoined', (player) => {
      logger.info(`Player joined: ${player.username}`);
      this.expMemory.recordPlayer(player.username, '新玩家');
      this.expMemory.recordEvent(`${player.username} 加入了游戏`);
      this.emit('playerJoined', player.username);
    });

    bot.on('playerLeft', (player) => {
      logger.info(`Player left: ${player.username}`);
      this.expMemory.recordEvent(`${player.username} 离开了游戏`);
      this.emit('playerLeft', player.username);
    });

    bot.on('death', () => {
      logger.warn('Bot died!');
      this.expMemory.recordEvent('Bot 死亡');
      this.emit('death');
    });

    bot.on('kicked', (reason) => {
      const reasonText = typeof reason === 'string'
        ? (() => { try { return JSON.parse(reason).text || reason; } catch { return reason; } })()
        : String(reason);
      logger.warn(`Kicked: ${reasonText}`);
      this.emit('kicked', reasonText);
      this.attemptReconnect();
    });

    bot.on('error', (err) => {
      logger.error('Bot error:', err);
      this.health.recordError(err);
      this.emit('error', err);
    });

    bot.on('end', (reason) => {
      logger.warn(`Disconnected: ${reason}`);
      this.emit('end', reason);
      if (!this.isShuttingDown) {
        this.health.recordReconnect();
        this.attemptReconnect();
      }
    });

    bot.on('health', () => {
      if (bot.health <= 0) {
        logger.warn('Bot health is 0!');
      }
    });
  }

  /** 处理聊天消息（AI 回复） */
  async handleChatMessage(username: string, message: string): Promise<void> {
    if (!this.conversation) return;
    if (this.proxyMode) return; // 代理模式下不触发 AI 回复
    const logger = getLogger();

    try {
      const reply = await this.conversation.sendMessage(message, username);
      this.safeChat(reply);
    } catch (err) {
      logger.error('AI reply error:', err);
      this.safeChat('抱歉，我暂时无法回复...');
    }
  }

  /** 安全发送聊天消息（拆分+限速） */
  safeChat(message: string): void {
    if (!this.bot) return;
    // 拆分长消息（按句子边界，200字符一组）
    const chunks = this.smartChunk(message, 200);
    for (let i = 0; i < chunks.length; i++) {
      setTimeout(() => {
        if (this.bot && this.chatLimiter.allow('chat')) {
          this.bot.chat(chunks[i]);
        }
      }, i * 800); // 每组间隔 800ms 防封禁
    }
  }

  /** 智能拆分长消息（按句子边界） */
  private smartChunk(message: string, maxLen: number): string[] {
    if (message.length <= maxLen) return [message];

    const chunks: string[] = [];
    let remaining = message;

    while (remaining.length > maxLen) {
      // 尝试在句子边界拆分
      const cutPoint = remaining.lastIndexOf('。', maxLen);
      const cutPoint2 = remaining.lastIndexOf('\n', maxLen);
      const cutPoint3 = remaining.lastIndexOf('！', maxLen);
      const cutPoint4 = remaining.lastIndexOf('？', maxLen);
      const bestCut = Math.max(cutPoint, cutPoint2, cutPoint3, cutPoint4, maxLen - 1);

      if (bestCut > 0) {
        chunks.push(remaining.slice(0, bestCut + 1));
        remaining = remaining.slice(bestCut + 1);
      } else {
        chunks.push(remaining.slice(0, maxLen));
        remaining = remaining.slice(maxLen);
      }
    }
    if (remaining.trim()) {
      chunks.push(remaining);
    }
    return chunks;
  }

  /** 尝试重连（指数退避） */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      getLogger().error('Max reconnect attempts reached');
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      this.reconnectMaxDelay
    );

    getLogger().info(
      `Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );
    this.emit('reconnecting', this.reconnectAttempts, this.maxReconnectAttempts);

    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.start().catch((err) => {
          getLogger().error('Reconnect failed:', err);
          // 重连失败继续尝试
          this.attemptReconnect();
        });
      }
    }, delay);
  }

  /** 发送聊天消息 */
  chat(message: string): void {
    this.safeChat(message);
  }

  /** === 真人代理模式 === */
  enableProxyMode(): void { this.proxyMode = true; }
  disableProxyMode(): void { this.proxyMode = false; }
  isProxyMode(): boolean { return this.proxyMode; }

  /** 执行真人代理指令 */
  async executeProxyCommand(cmd: ProxyCommand): Promise<string> {
    const bot = this.bot;
    const botAny = bot as any;
    if (!bot) return 'Bot 未连接';

    try {
      switch (cmd.action) {
        case 'move': {
          const { direction } = cmd.params as { direction: string };
          bot.setControlState(direction as any, true);
          setTimeout(() => bot.setControlState(direction as any, false), 500);
          return `已向 ${direction} 移动`;
        }
        case 'look': {
          const { yaw, pitch } = cmd.params as { yaw?: number; pitch?: number };
          if (yaw !== undefined) bot.look(yaw, pitch ?? 0, true);
          return `已转向 yaw=${yaw?.toFixed(1)} pitch=${pitch?.toFixed(1)}`;
        }
        case 'dig': {
          const target = bot.blockAtCursor(5);
          if (target) {
            await bot.dig(target);
            return `已挖掘 ${target.name}`;
          }
          return '未找到可挖掘的方块';
        }
        case 'place': {
          const ref = bot.blockAtCursor(5);
          if (ref) {
            await bot.placeBlock(ref, { x: 0, y: 1, z: 0 } as any);
            return '已放置方块';
          }
          return '未找到放置位置';
        }
        case 'attack': {
          const entity = bot.entityAtCursor(5);
          if (entity) {
            await botAny.pvp.attack(entity);
            return `已攻击 ${entity.name || '目标'}`;
          }
          return '未找到目标';
        }
        case 'use': {
          await bot.activateItem();
          return '已使用物品';
        }
        case 'drop': {
          const held = bot.heldItem;
          if (held) {
            await bot.tossStack(held);
            return `已丢弃 ${held.name}`;
          }
          return '手中无物品';
        }
        case 'collect': {
          const entities = Object.values(bot.entities).filter(
            (e) => e.name === 'item' || e.name === 'Item'
          );
          if (entities.length > 0) {
            await botAny.collectBlock.collect(entities[0]);
            return `已收集 ${entities.length} 个掉落物`;
          }
          return '附近无掉落物';
        }
        case 'chat': {
          const { message } = cmd.params as { message: string };
          this.safeChat(message);
          return `已发送: ${message}`;
        }
        case 'follow': {
          const { player } = cmd.params as { player: string };
          const target = bot.players[player];
          if (target?.entity) {
            const pos = target.entity.position;
            botAny.pathfinder.setGoal(
              new (require('mineflayer-pathfinder').goals.GoalFollow)(target.entity, 2)
            );
            return `正在跟随 ${player}`;
          }
          return `找不到玩家 ${player}`;
        }
        case 'goto': {
          const { x, y, z } = cmd.params as { x: number; y: number; z: number };
          botAny.pathfinder.setGoal(
            new (require('mineflayer-pathfinder').goals.GoalNear)(x, y, z, 1)
          );
          return `正在前往 (${x}, ${y}, ${z})`;
        }
        default:
          return `未知指令: ${cmd.action}`;
      }
    } catch (err) {
      return `执行失败: ${err}`;
    }
  }

  /** 获取 Bot 实例 */
  getBot(): mineflayer.Bot | null { return this.bot; }

  /** 获取对话管理器 */
  getConversation(): ConversationManager | null { return this.conversation; }

  /** 获取 Bot 状态 */
  getStatus(): BotStatus {
    const bot = this.bot;
    if (!bot) return { online: false, reconnecting: this.reconnectAttempts > 0 };

    return {
      online: true,
      username: bot.username,
      health: bot.health,
      food: bot.food,
      position: {
        x: bot.entity.position.x,
        y: bot.entity.position.y,
        z: bot.entity.position.z,
      },
      yaw: bot.entity.yaw,
      pitch: bot.entity.pitch,
      dimension: bot.game.dimension,
      time: bot.time.timeOfDay,
      isRaining: bot.isRaining,
      players: Object.keys(bot.players).length,
      entities: Object.keys(bot.entities).length,
      messageCount: this.conversation?.messageCount ?? 0,
      proxyMode: this.proxyMode,
      reconnecting: false,
    };
  }

  getHealth(): HealthMonitor { return this.health; }
  getExpMemory(): ExperienceMemory { return this.expMemory; }
  getAutonomous(): AutonomousBehavior | null { return this.autonomous; }

  /** 截图（实验性多模态，需要 prismarine-viewer） */
  async takeScreenshot(): Promise<string | null> {
    if (!this.bot) return null;
    try {
      // 尝试使用 prismarine-viewer 进行截图
      const viewer = require('prismarine-viewer');
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(640, 480);
      const ctx = canvas.getContext('2d');

      // 渲染当前视野
      const worldView = viewer.headless;
      if (worldView) {
        await worldView.render(this.bot, canvas);
        return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
      }
      return null;
    } catch {
      return null; // prismarine-viewer 或 canvas 未安装
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.autonomous?.stop();
    if (this.bot) {
      this.bot.quit('Shutting down');
      this.bot = null;
    }
    getLogger().info('Bot shut down');
  }
}

export interface BotStatus {
  online: boolean;
  username?: string;
  health?: number;
  food?: number;
  position?: { x: number; y: number; z: number };
  yaw?: number;
  pitch?: number;
  dimension?: string;
  time?: number;
  isRaining?: boolean;
  players?: number;
  entities?: number;
  messageCount?: number;
  proxyMode?: boolean;
  reconnecting?: boolean;
}