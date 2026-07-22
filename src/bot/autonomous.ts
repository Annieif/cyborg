import { Bot } from 'mineflayer';
import { ConversationManager } from '../ai/conversation';
import { getLogger } from '../utils/logger';
import { getConfig } from '../config';

/** 自主活动类型 */
type AutonomousActivity = 'explore' | 'mine' | 'collect' | 'socialize' | 'rest' | 'ai_driven';

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

/** AI 驱动模式的自主提示词 */
function buildAiDrivenPrompt(bot: Bot): string {
  const pos = bot.entity.position;
  const players = Object.values(bot.players).filter(
    (p) => p.entity && p.username !== bot.username
  );
  const nearbyOres = bot.findBlocks({
    matching: (block) =>
      block.name.includes('ore') || block.name.includes('diamond') || block.name.includes('emerald'),
    maxDistance: 32,
    count: 3,
  });

  let prompt = `[系统] 你现在处于自由活动时间，没有玩家在和你聊天。你可以根据自己的判断做任何事。\n`;
  prompt += `当前状态: 位置(${pos.x.toFixed(0)},${pos.y.toFixed(0)},${pos.z.toFixed(0)}), 生命${bot.health.toFixed(0)}, 饥饿${bot.food.toFixed(0)}, 维度${bot.game.dimension}\n`;

  if (players.length > 0) {
    prompt += `附近玩家: ${players.map((p) => {
      const dist = p.entity ? p.entity.position.distanceTo(pos).toFixed(0) : '?';
      return `${p.username}(${dist}m)`;
    }).join(', ')}\n`;
  } else {
    prompt += `附近没有其他玩家。\n`;
  }

  if (nearbyOres.length > 0) {
    prompt += `附近有可采集的矿石资源。\n`;
  }

  const heldItem = bot.heldItem;
  if (heldItem) {
    prompt += `手中物品: ${heldItem.name} x${heldItem.count}\n`;
  }

  prompt += `\n请决定你想做什么。你可以探索、挖矿、收集物品、合成、熔炼、进食、钓鱼，或者找玩家聊天。用工具执行你的计划，用聊天告诉世界你在做什么。简短回复，然后行动。`;

  return prompt;
}

/** 类人机自主行为管理器 */
export class AutonomousBehavior {
  private bot: Bot;
  private conversation: ConversationManager;
  private enabled: boolean;
  private aiDriven: boolean;
  private idleTimeout: number;
  private activityInterval: number;
  private lastChatTime: number = Date.now();
  private currentActivity: AutonomousActivity | null = null;
  private activityTimer: NodeJS.Timeout | null = null;
  private idleCheckTimer: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private aiCycleRunning: boolean = false;
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
    this.aiDriven = config.ai.autonomousAiDriven;
    this.idleTimeout = config.ai.autonomousIdleTimeout * 1000;
    this.activityInterval = config.ai.autonomousInterval * 1000;
  }

  /** 启动自主行为 */
  start(): void {
    if (!this.enabled) return;
    const logger = getLogger();
    logger.info(`Autonomous mode enabled (${this.aiDriven ? 'AI-driven' : 'hardcoded'})`);

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

    if (this.aiDriven) {
      this.runAiDrivenCycle();
    } else {
      this.scheduleNextActivity();
    }
  }

  /** 停用自主模式 */
  private deactivate(): void {
    this.isActive = false;
    this.aiCycleRunning = false;
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    this.currentActivity = null;
    const botAny = this.bot as any;
    if (botAny.pathfinder) {
      botAny.pathfinder.setGoal(null);
    }
    getLogger().info('Autonomous mode deactivated');
  }

  // ==========================================
  //  AI 驱动模式（真正自主，由 AI 做决定）
  // ==========================================

  /** AI 驱动循环：AI 自主决定做什么 */
  private async runAiDrivenCycle(): Promise<void> {
    if (!this.isActive || this.aiCycleRunning) return;
    this.aiCycleRunning = true;
    this.currentActivity = 'ai_driven';
    const logger = getLogger();

    try {
      const prompt = buildAiDrivenPrompt(this.bot);
      logger.debug('AI-driven prompt sent', { promptLen: prompt.length });

      // 通过 AI 对话管理器发送提示，获取 AI 决策
      const reply = await this.conversation.sendMessage(prompt, undefined);
      logger.info(`AI decided: ${reply.slice(0, 100)}`);

      // 将 AI 的决策作为聊天发送（让玩家看到 Bot 在做什么）
      if (reply && reply.trim() && reply !== '（无响应）') {
        this.onSafeChat(reply);
      }
    } catch (err) {
      logger.error('AI-driven cycle error:', err);
    }

    this.aiCycleRunning = false;

    // 如果仍活跃，安排下一轮 AI 决策
    if (this.isActive) {
      this.activityTimer = setTimeout(() => {
        if (this.isActive) {
          this.runAiDrivenCycle();
        }
      }, this.activityInterval);
    }
  }

  // ==========================================
  //  硬编码模式（随机活动状态机）
  // ==========================================

  private scheduleNextActivity(): void {
    const delay = this.activityInterval + Math.random() * this.activityInterval;
    this.activityTimer = setTimeout(() => {
      if (this.isActive) {
        this.executeRandomActivity();
      }
    }, delay);
  }

  private async executeRandomActivity(): Promise<void> {
    const activities: AutonomousActivity[] = ['explore', 'mine', 'collect', 'socialize', 'rest'];
    const activity = activities[Math.floor(Math.random() * activities.length)];
    this.currentActivity = activity;
    const logger = getLogger();
    logger.info(`Autonomous activity: ${activity}`);

    try {
      switch (activity) {
        case 'explore': await this.doExplore(); break;
        case 'mine': await this.doMine(); break;
        case 'collect': await this.doCollect(); break;
        case 'socialize': await this.doSocialize(); break;
        case 'rest': await this.doRest(); break;
      }
    } catch (err) {
      logger.error(`Autonomous activity error: ${activity}`, err);
    }

    if (this.isActive) {
      this.scheduleNextActivity();
    }
  }

  private async doExplore(): Promise<void> {
    const pos = this.bot.entity.position;
    const dx = (Math.random() - 0.5) * 40;
    const dz = (Math.random() - 0.5) * 40;
    const botAny = this.bot as any;
    botAny.pathfinder.setGoal(
      new (require('mineflayer-pathfinder').goals.GoalNear)(pos.x + dx, pos.y, pos.z + dz, 10)
    );
  }

  private async doMine(): Promise<void> {
    const oreNames = [
      'diamond_ore', 'deepslate_diamond_ore', 'iron_ore', 'deepslate_iron_ore',
      'gold_ore', 'deepslate_gold_ore', 'copper_ore', 'deepslate_copper_ore',
      'coal_ore', 'deepslate_coal_ore', 'emerald_ore', 'deepslate_emerald_ore',
      'redstone_ore', 'deepslate_redstone_ore', 'lapis_ore', 'deepslate_lapis_ore',
    ];
    const ore = this.bot.findBlock({ matching: (b) => oreNames.includes(b.name), maxDistance: 32 });
    if (ore) {
      const botAny = this.bot as any;
      botAny.pathfinder.setGoal(
        new (require('mineflayer-pathfinder').goals.GoalNear)(ore.position.x, ore.position.y, ore.position.z, 2)
      );
    } else {
      await this.doExplore();
    }
  }

  private async doCollect(): Promise<void> {
    const botAny = this.bot as any;
    const entities = Object.values(this.bot.entities).filter((e) => e.name === 'item' || e.name === 'Item');
    if (entities.length > 0) {
      for (const entity of entities.slice(0, 3)) {
        try { await botAny.collectBlock.collect(entity); } catch { /* continue */ }
      }
    } else {
      await this.doExplore();
    }
  }

  private async doSocialize(): Promise<void> {
    const players = Object.values(this.bot.players).filter((p) => p.entity && p.username !== this.bot.username);
    if (players.length === 0) {
      const msgs = ['怎么一个人都没有呢...', '好安静啊，有人在线吗？', '孤独地在方块世界里游荡...', '寂寞的赛博人需要一点陪伴...'];
      this.onSafeChat(msgs[Math.floor(Math.random() * msgs.length)]);
      return;
    }
    const nearest = players.reduce((a, b) => {
      const dA = a.entity ? a.entity.position.distanceTo(this.bot.entity.position) : Infinity;
      const dB = b.entity ? b.entity.position.distanceTo(this.bot.entity.position) : Infinity;
      return dA < dB ? a : b;
    });
    if (nearest.entity) {
      const botAny = this.bot as any;
      botAny.pathfinder.setGoal(
        new (require('mineflayer-pathfinder').goals.GoalNear)(nearest.entity.position.x, nearest.entity.position.y, nearest.entity.position.z, 3)
      );
      setTimeout(() => {
        if (this.isActive && nearest.entity && nearest.entity.position.distanceTo(this.bot.entity.position) < 5) {
          this.onSafeChat(SOCIAL_TOPICS[Math.floor(Math.random() * SOCIAL_TOPICS.length)]);
        }
      }, 10000);
    }
  }

  private async doRest(): Promise<void> {
    (this.bot as any).pathfinder.setGoal(null);
  }

  getCurrentActivity(): AutonomousActivity | null { return this.currentActivity; }
  getIsActive(): boolean { return this.isActive; }

  stop(): void {
    this.deactivate();
    if (this.idleCheckTimer) { clearInterval(this.idleCheckTimer); this.idleCheckTimer = null; }
    getLogger().info('Autonomous mode stopped');
  }
}