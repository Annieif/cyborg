import { Bot } from 'mineflayer';
import { ConversationManager } from '../ai/conversation';
import { getLogger } from '../utils/logger';
import { getConfig } from '../config';

/** 自主活动类型 */
type AutonomousActivity = 'explore' | 'mine' | 'collect' | 'socialize' | 'rest';

/** 社交话题库 */
const SOCIAL_TOPICS = [
  '你好！你这身装备不错，在哪里打的？',
  '请问你知道末地烛的合成配方吗？我记不太清了。',
  '嘿！要不要一起去采矿？',
  '这个服务器有什么好玩的地方吗？',
  '你最近在做什么建筑？能带我去看看吗？',
  '有人想一起打怪吗？',
  '你知道怎么去下界吗？',
  '你好，我刚来这个服务器，有什么需要注意的吗？',
  '你的剑看起来很厉害，是什么附魔？',
  '附近有村庄吗？我想找村民交易。',
  '有人需要帮忙吗？我可以帮忙挖矿或者收集材料。',
  '今天天气真好！适合出去探险。',
  '你见过末影龙吗？我还没去过末地。',
  '你会用红石吗？我想学做自动农场。',
  '这个服务器有什么活动吗？',
  '你好！能给我一点食物吗？我快饿死了。',
  '你知道信标怎么合成吗？',
  '有没有人一起建个基地？',
  '你觉得钻石套和合金套哪个更好？',
  '你的房子做得好漂亮！能教教我吗？',
];

/** 类人机自主行为管理器 */
export class AutonomousBehavior {
  private bot: Bot;
  private conversation: ConversationManager;
  private enabled: boolean;
  private idleTimeout: number;
  private activityInterval: number;
  private lastChatTime: number = Date.now();
  private currentActivity: AutonomousActivity | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private idleCheckTimer: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private onSafeChat: (msg: string) => void;

  constructor(
    bot: Bot,
    conversation: ConversationManager,
    safeChat: (msg: string) => void,
  ) {
    this.bot = bot;
    this.conversation = conversation;
    this.onSafeChat = safeChat;
    const config = getConfig();
    this.enabled = config.ai.autonomous;
    this.idleTimeout = config.ai.autonomousIdleTimeout * 1000;
    this.activityInterval = config.ai.autonomousInterval * 1000;
  }

  /** 启动自主行为 */
  start(): void {
    if (!this.enabled) return;
    const logger = getLogger();
    logger.info('Autonomous mode enabled');

    // 空闲检测
    this.idleCheckTimer = setInterval(() => {
      if (!this.isActive && Date.now() - this.lastChatTime > this.idleTimeout) {
        this.activate();
      }
    }, 5000);
  }

  /** 记录聊天时间（收到消息时调用） */
  onChat(): void {
    this.lastChatTime = Date.now();
    if (this.isActive) {
      this.deactivate();
    }
  }

  /** 激活自主模式 */
  private activate(): void {
    this.isActive = true;
    getLogger().info('Autonomous mode activated - bot is idle');
    this.scheduleNextActivity();
  }

  /** 停用自主模式 */
  private deactivate(): void {
    this.isActive = false;
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    this.currentActivity = null;
    // 停止移动
    const botAny = this.bot as any;
    if (botAny.pathfinder) {
      botAny.pathfinder.setGoal(null);
    }
    getLogger().info('Autonomous mode deactivated');
  }

  /** 安排下一个活动 */
  private scheduleNextActivity(): void {
    const delay = this.activityInterval + Math.random() * this.activityInterval;
    this.activityTimer = setTimeout(() => {
      if (this.isActive) {
        this.executeRandomActivity();
      }
    }, delay);
  }

  /** 执行随机活动 */
  private async executeRandomActivity(): Promise<void> {
    const activities: AutonomousActivity[] = ['explore', 'mine', 'collect', 'socialize', 'rest'];
    const activity = activities[Math.floor(Math.random() * activities.length)];
    this.currentActivity = activity;
    const logger = getLogger();
    logger.info(`Autonomous activity: ${activity}`);

    try {
      switch (activity) {
        case 'explore':
          await this.doExplore();
          break;
        case 'mine':
          await this.doMine();
          break;
        case 'collect':
          await this.doCollect();
          break;
        case 'socialize':
          await this.doSocialize();
          break;
        case 'rest':
          await this.doRest();
          break;
      }
    } catch (err) {
      logger.error(`Autonomous activity error: ${activity}`, err);
    }

    // 如果仍处于活跃状态，安排下一个活动
    if (this.isActive) {
      this.scheduleNextActivity();
    }
  }

  /** 探索：随机移动到附近位置 */
  private async doExplore(): Promise<void> {
    const pos = this.bot.entity.position;
    const dx = (Math.random() - 0.5) * 40;
    const dz = (Math.random() - 0.5) * 40;
    const targetX = pos.x + dx;
    const targetZ = pos.z + dz;

    const botAny = this.bot as any;
    const goal = new (require('mineflayer-pathfinder').goals.GoalNear)(targetX, pos.y, targetZ, 10);
    botAny.pathfinder.setGoal(goal);

    getLogger().debug(`Exploring to (${targetX.toFixed(0)}, ${targetZ.toFixed(0)})`);
  }

  /** 挖矿：在附近寻找矿石 */
  private async doMine(): Promise<void> {
    const oreNames = [
      'diamond_ore', 'deepslate_diamond_ore',
      'iron_ore', 'deepslate_iron_ore',
      'gold_ore', 'deepslate_gold_ore',
      'copper_ore', 'deepslate_copper_ore',
      'coal_ore', 'deepslate_coal_ore',
      'emerald_ore', 'deepslate_emerald_ore',
      'redstone_ore', 'deepslate_redstone_ore',
      'lapis_ore', 'deepslate_lapis_ore',
    ];

    const ore = this.bot.findBlock({
      matching: (block) => oreNames.includes(block.name),
      maxDistance: 32,
    });

    if (ore) {
      const botAny = this.bot as any;
      const goal = new (require('mineflayer-pathfinder').goals.GoalNear)(
        ore.position.x, ore.position.y, ore.position.z, 2
      );
      botAny.pathfinder.setGoal(goal);
      getLogger().debug(`Mining: ${ore.name} at (${ore.position.x}, ${ore.position.y}, ${ore.position.z})`);
    } else {
      // 没找到矿石，去探索
      await this.doExplore();
    }
  }

  /** 收集：收集附近掉落物 */
  private async doCollect(): Promise<void> {
    const botAny = this.bot as any;
    const entities = Object.values(this.bot.entities).filter(
      (e) => e.name === 'item' || e.name === 'Item'
    );

    if (entities.length > 0) {
      for (const entity of entities.slice(0, 3)) {
        try {
          await botAny.collectBlock.collect(entity);
        } catch {
          // 收集失败，继续下一个
        }
      }
      getLogger().debug(`Collected ${Math.min(entities.length, 3)} items`);
    } else {
      // 没掉落物，去探索
      await this.doExplore();
    }
  }

  /** 社交：主动找玩家聊天 */
  private async doSocialize(): Promise<void> {
    const players = Object.values(this.bot.players).filter(
      (p) => p.entity && p.username !== this.bot.username
    );

    if (players.length === 0) {
      // 没人在线，自言自语
      const soloMessages = [
        '怎么一个人都没有呢...',
        '好安静啊，有人在线吗？',
        '孤独地在方块世界里游荡...',
        '寂寞的赛博人需要一点陪伴...',
      ];
      this.onSafeChat(soloMessages[Math.floor(Math.random() * soloMessages.length)]);
      return;
    }

    // 选择最近的玩家
    const nearest = players.reduce((a, b) => {
      const distA = a.entity ? a.entity.position.distanceTo(this.bot.entity.position) : Infinity;
      const distB = b.entity ? b.entity.position.distanceTo(this.bot.entity.position) : Infinity;
      return distA < distB ? a : b;
    });

    if (nearest.entity) {
      // 走向该玩家
      const botAny = this.bot as any;
      const goal = new (require('mineflayer-pathfinder').goals.GoalNear)(
        nearest.entity.position.x,
        nearest.entity.position.y,
        nearest.entity.position.z,
        3
      );
      botAny.pathfinder.setGoal(goal);

      // 到达后发送社交消息
      setTimeout(() => {
        if (this.isActive && nearest.entity) {
          const dist = nearest.entity.position.distanceTo(this.bot.entity.position);
          if (dist < 5) {
            const topic = SOCIAL_TOPICS[Math.floor(Math.random() * SOCIAL_TOPICS.length)];
            this.onSafeChat(topic);
            getLogger().debug(`Socializing with ${nearest.username}: ${topic}`);
          }
        }
      }, 10000); // 给 10 秒走过去
    }
  }

  /** 休息：原地不动 */
  private async doRest(): Promise<void> {
    const botAny = this.bot as any;
    botAny.pathfinder.setGoal(null);
    getLogger().debug('Resting...');
  }

  /** 获取当前活动 */
  getCurrentActivity(): AutonomousActivity | null {
    return this.currentActivity;
  }

  /** 是否活跃 */
  getIsActive(): boolean {
    return this.isActive;
  }

  /** 停止自主行为 */
  stop(): void {
    this.deactivate();
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }
    getLogger().info('Autonomous mode stopped');
  }
}