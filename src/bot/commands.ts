import { Bot } from 'mineflayer';
import { ConversationManager } from '../ai/conversation';
import { getLogger } from '../utils/logger';

/** 命令处理器类型 */
type CommandHandler = (bot: Bot, args: string[], conversation: ConversationManager, playerName?: string) => Promise<string>;

interface Command {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  handler: CommandHandler;
}

/**
 * 创建命令系统
 * 玩家可以通过 !command 前缀触发 Bot 指令
 */
export function createCommandSystem(bot: Bot, conversation: ConversationManager) {
  const botAny = bot as any;
  const logger = getLogger();
  const commands = new Map<string, Command>();

  function register(cmd: Command): void {
    commands.set(cmd.name.toLowerCase(), cmd);
    for (const alias of cmd.aliases) {
      commands.set(alias.toLowerCase(), cmd);
    }
  }

  // === 注册所有命令 ===

  register({
    name: 'help',
    aliases: ['h', '?'],
    description: '显示所有可用命令',
    usage: '!help [命令名]',
    handler: async (_bot, args) => {
      if (args.length > 0) {
        const cmd = commands.get(args[0].toLowerCase());
        if (cmd) {
          return `§a${cmd.name}§r: ${cmd.description}\n用法: ${cmd.usage}`;
        }
        return `未知命令: ${args[0]}`;
      }
      const unique = new Set<string>();
      const lines: string[] = ['§6=== 赛博人命令列表 ===§r'];
      for (const [, cmd] of commands) {
        if (unique.has(cmd.name)) continue;
        unique.add(cmd.name);
        lines.push(`§a!${cmd.name}§r - ${cmd.description}`);
      }
      return lines.join('\n');
    },
  });

  register({
    name: 'status',
    aliases: ['stats', 'info'],
    description: '查看 Bot 当前状态',
    usage: '!status',
    handler: async () => {
      const pos = bot.entity.position;
      const time = bot.time.timeOfDay;
      const hours = Math.floor((time / 1000 + 6) % 24);
      const minutes = Math.floor((time % 1000) / 1000 * 60);
      const weather = bot.isRaining ? (bot.thunderState > 0 ? '雷暴' : '下雨') : '晴天';

      return [
        `§6=== 赛博人状态 ===§r`,
        `§a生命值§r: ${bot.health.toFixed(0)}/20`,
        `§a饥饿值§r: ${bot.food.toFixed(0)}/20`,
        `§a坐标§r: (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`,
        `§a维度§r: ${bot.game.dimension}`,
        `§a时间§r: ${hours}:${String(minutes).padStart(2, '0')}`,
        `§a天气§r: ${weather}`,
        `§a附近玩家§r: ${Object.keys(bot.players).length - 1}`,
      ].join('\n');
    },
  });

  register({
    name: 'come',
    aliases: ['follow'],
    description: '让 Bot 移动到你的位置',
    usage: '!come',
    handler: async (_bot, _args, _conv, playerName?: string) => {
      if (!playerName) return '只有玩家可以使用此命令';
      const player = bot.players[playerName];
      if (!player?.entity) return '找不到你的位置';
      const pos = player.entity.position;
      botAny.pathfinder.setGoal(
        new (require('mineflayer-pathfinder').goals.GoalNear)(pos.x, pos.y, pos.z, 2)
      );
      return `正在前往你的位置 (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`;
    },
  });

  register({
    name: 'give',
    aliases: ['item'],
    description: '给指定玩家物品',
    usage: '!give <物品名>',
    handler: async (_bot, args) => {
      const itemName = args.join('_');
      const item = bot.inventory.items().find(
        (i) => i.name.toLowerCase().includes(itemName.toLowerCase())
      );
      if (!item) return `背包中没有 ${itemName}`;
      await bot.tossStack(item);
      return `已丢弃 ${item.name} x${item.count}`;
    },
  });

  register({
    name: 'list',
    aliases: ['players', 'who'],
    description: '查看在线玩家列表',
    usage: '!list',
    handler: async () => {
      const players = Object.values(bot.players)
        .filter((p) => p.username !== bot.username)
        .map((p) => {
          const dist = p.entity
            ? p.entity.position.distanceTo(bot.entity.position).toFixed(0)
            : '?';
          return `${p.username} (${dist}m)`;
        });
      if (players.length === 0) return '附近没有其他玩家';
      return `§6在线玩家 (${players.length}):§r\n${players.join('\n')}`;
    },
  });

  register({
    name: 'reset',
    aliases: ['clear'],
    description: '重置 AI 对话记忆',
    usage: '!reset',
    handler: async () => {
      conversation.reset();
      return '对话记忆已重置';
    },
  });

  register({
    name: 'collect',
    aliases: ['pickup'],
    description: '收集附近掉落物',
    usage: '!collect',
    handler: async () => {
      const entities = Object.values(bot.entities).filter(
        (e) => e.name === 'item' || e.name === 'Item'
      );
      if (entities.length === 0) return '附近没有掉落物';
      try {
        await botAny.collectBlock.collect(entities[0]);
        return `已收集掉落物 (共 ${entities.length} 个)`;
      } catch {
        return '收集失败';
      }
    },
  });

  register({
    name: 'stop',
    aliases: ['cancel'],
    description: '停止当前路径移动',
    usage: '!stop',
    handler: async () => {
      botAny.pathfinder.setGoal(null);
      return '已停止移动';
    },
  });

  // === 处理命令 ===
  bot.on('chat', async (username: string, message: string) => {
    if (username === bot.username) return;

    // 检查是否是命令
    if (!message.startsWith('!')) return;

    const parts = message.slice(1).trim().split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const cmd = commands.get(cmdName);
    if (!cmd) {
      bot.chat(`未知命令: !${cmdName}。输入 !help 查看可用命令。`);
      return;
    }

    logger.info(`Command: ${username} -> !${cmdName} ${args.join(' ')}`);

    try {
      const result = await cmd.handler(bot, args, conversation, username);
      // 分割长消息发送
      const lines = result.split('\n');
      for (const line of lines) {
        if (line.length > 200) {
          const chunks = line.match(/.{1,200}/g) || [];
          for (const chunk of chunks) {
            bot.chat(chunk);
          }
        } else {
          bot.chat(line);
        }
      }
    } catch (err) {
      logger.error(`Command error: ${cmdName}`, err);
      bot.chat(`执行命令时出错: ${err}`);
    }
  });

  return { commands, register };
}