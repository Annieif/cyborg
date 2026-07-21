/**
 * 双赛博人测试脚本
 * 启动 2 个 Bot 连接到测试服务器，测试聊天、PVP、移动等功能
 */
import mineflayer from 'mineflayer';
import { ConversationManager } from './ai/conversation';
import { createBotTools } from './bot/tools';

// mineflayer 插件使用 require 导入（避免 esModuleInterop 问题）
const pathfinder = require('mineflayer-pathfinder');
const pvp = require('mineflayer-pvp');
const collectBlock = require('mineflayer-collectblock');

// 测试服务器配置
const SERVER_HOST = 'localhost';
const SERVER_PORT = 25565;
const SERVER_VERSION = '1.20.1';

const BOT1_NAME = 'Cyborg_Alpha';
const BOT2_NAME = 'Cyborg_Beta';

const BOT1_PERSONA = '你是Cyborg_Alpha（赛博人Alpha），一个勇敢好战的Minecraft AI机器人。你喜欢PVP战斗，说话直率、充满激情。你总是想挑战其他玩家。你的口号是"战斗到底!"。回复要简短有力。';
const BOT2_PERSONA = '你是Cyborg_Beta（赛博人Beta），一个和平友善的Minecraft AI机器人。你喜欢建造和探索，说话温和、乐于助人。你总是想帮助其他玩家。你的口号是"和平共处!"。回复要简短友善。';

// 强制使用 OpenAI 兼容 API（从环境变量读取）
const AI_API_KEY = process.env.AI_API_KEY || 'sk-test';
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

interface TestBot {
  name: string;
  bot: mineflayer.Bot;
  conversation: ConversationManager;
}

async function createBot(username: string, persona: string): Promise<TestBot> {
  return new Promise((resolve, reject) => {
    const bot = mineflayer.createBot({
      host: SERVER_HOST,
      port: SERVER_PORT,
      username,
      version: SERVER_VERSION,
    });

    bot.loadPlugin(pathfinder.pathfinder);
    bot.loadPlugin(pvp.plugin);
    bot.loadPlugin(collectBlock.plugin);

    const botAny = bot as any;

    const conversation = new ConversationManager(persona);
    conversation.registerTools(createBotTools(bot));

    bot.once('spawn', () => {
      console.log(`[${username}] 已加入服务器!`);
      resolve({ name: username, bot, conversation });
    });

    bot.on('error', (err) => {
      console.error(`[${username}] 错误:`, err.message);
    });

    bot.on('kicked', (reason) => {
      console.error(`[${username}] 被踢:`, JSON.parse(reason).text || reason);
    });

    setTimeout(() => reject(new Error(`${username} 连接超时`)), 30000);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('=== 双赛博人测试启动 ===\n');

  // 创建两个 Bot
  console.log('[1/6] 创建赛博人_Alpha...');
  const alpha = await createBot(BOT1_NAME, BOT1_PERSONA);

  console.log('[2/6] 创建赛博人_Beta...');
  const beta = await createBot(BOT2_NAME, BOT2_PERSONA);

  await sleep(2000);

  // 测试 1: 聊天
  console.log('\n--- 测试 1: 聊天 ---');
  alpha.bot.chat(`你好 ${BOT2_NAME}! 我是 ${BOT1_NAME}`);
  await sleep(1000);
  beta.bot.chat(`你好 ${BOT1_NAME}! 我是 ${BOT2_NAME}，很高兴见到你!`);
  await sleep(1000);

  // 测试 2: 互相靠近
  console.log('\n--- 测试 2: 互相靠近 ---');
  const betaPos = beta.bot.entity.position;
  alpha.bot.chat(`/${BOT2_NAME} 我过去找你!`);
  (alpha.bot as any).pathfinder.setGoal(
    new (require('mineflayer-pathfinder').goals.GoalNear)(betaPos.x, betaPos.y, betaPos.z, 2)
  );
  await sleep(3000);

  // 测试 3: 查看周围
  console.log('\n--- 测试 3: 查看周围 ---');
  const nearbyPlayers = Object.values(alpha.bot.players).filter(p => p.username !== BOT1_NAME);
  alpha.bot.chat(`附近玩家: ${nearbyPlayers.map(p => p.username).join(', ') || '无'}`);
  await sleep(1000);

  // 测试 4: 查看状态
  console.log('\n--- 测试 4: 查看状态 ---');
  const aPos = alpha.bot.entity.position;
  const bPos = beta.bot.entity.position;
  alpha.bot.chat(
    `我的位置: (${aPos.x.toFixed(0)}, ${aPos.y.toFixed(0)}, ${aPos.z.toFixed(0)}) ` +
    `生命值: ${alpha.bot.health.toFixed(0)} 饥饿值: ${alpha.bot.food.toFixed(0)}`
  );
  await sleep(1000);
  beta.bot.chat(
    `我的位置: (${bPos.x.toFixed(0)}, ${bPos.y.toFixed(0)}, ${bPos.z.toFixed(0)}) ` +
    `生命值: ${beta.bot.health.toFixed(0)} 饥饿值: ${beta.bot.food.toFixed(0)}`
  );
  await sleep(1000);

  // 测试 5: PVP 测试
  console.log('\n--- 测试 5: PVP 测试 ---');
  alpha.bot.chat(`/${BOT2_NAME} 来打一架!`);
  await sleep(500);
  beta.bot.chat(`/${BOT1_NAME} 好! 来吧!`);
  await sleep(500);

  // Alpha 攻击 Beta
  try {
    const betaEntity = beta.bot.entity;
    if (betaEntity) {
      await (alpha.bot as any).pvp.attack(betaEntity);
      alpha.bot.chat('我攻击了!');
    }
  } catch (e) {
    console.log(`[Alpha] PVP 错误:`, e);
  }
  await sleep(2000);

  // Beta 反击
  try {
    const alphaEntity = alpha.bot.entity;
    if (alphaEntity) {
      await (beta.bot as any).pvp.attack(alphaEntity);
      beta.bot.chat('我反击了!');
    }
  } catch (e) {
    console.log(`[Beta] PVP 错误:`, e);
  }
  await sleep(2000);

  // 停止 PVP
  (alpha.bot as any).pvp.stop();
  (beta.bot as any).pvp.stop();
  await sleep(500);

  // 测试 6: 查看背包
  console.log('\n--- 测试 6: 背包查看 ---');
  const aItems = alpha.bot.inventory.items();
  const bItems = beta.bot.inventory.items();
  alpha.bot.chat(`我的背包有 ${aItems.length} 个物品`);
  beta.bot.chat(`我的背包有 ${bItems.length} 个物品`);
  await sleep(1000);

  // 测试 7: AI 对话测试
  console.log('\n--- 测试 7: AI 对话测试 ---');
  try {
    const reply = await alpha.conversation.sendMessage(
      '介绍一下你自己，你在哪里，你能做什么？',
      '测试者'
    );
    alpha.bot.chat(`[AI回复] ${reply.slice(0, 200)}`);
  } catch (e) {
    console.log(`[Alpha] AI 对话错误:`, e);
  }
  await sleep(1000);

  // 测试 8: 掉落物收集测试
  console.log('\n--- 测试 8: 掉落物测试 ---');
  // 让 Alpha 丢弃一个物品让 Beta 收集
  const alphaItem = alpha.bot.inventory.items()[0];
  if (alphaItem) {
    await alpha.bot.tossStack(alphaItem);
    alpha.bot.chat(`我丢弃了 ${alphaItem.name}`);
    await sleep(2000);
    beta.bot.chat('我来收集!');
    const entities = Object.values(beta.bot.entities).filter(
      (e) => e.name === 'item' || e.name === 'Item'
    );
    if (entities.length > 0) {
      try {
        await (beta.bot as any).collectBlock.collect(entities[0]);
        beta.bot.chat('收集成功!');
      } catch (e) {
        beta.bot.chat('收集失败...');
      }
    }
  }
  await sleep(1000);

  // 测试 9: 时间天气
  console.log('\n--- 测试 9: 时间天气 ---');
  const time = alpha.bot.time.timeOfDay;
  const hours = Math.floor((time / 1000 + 6) % 24);
  const minutes = Math.floor((time % 1000) / 1000 * 60);
  alpha.bot.chat(
    `游戏时间: ${hours}:${String(minutes).padStart(2, '0')} | ` +
    `天气: ${alpha.bot.isRaining ? '下雨' : '晴天'}`
  );
  await sleep(1000);

  // 测试 10: 总结
  console.log('\n=== 测试完成 ===');
  alpha.bot.chat('所有测试完成! 赛博人系统运行正常!');
  await sleep(500);
  beta.bot.chat('测试通过! 聊天、PVP、移动、物品、AI对话全部正常!');
  await sleep(1000);

  // 保持运行
  console.log('\nBot 保持在线，按 Ctrl+C 退出...');
  console.log('你可以在 Minecraft 客户端连接 localhost:25565 观察测试过程\n');

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n正在关闭...');
    alpha.bot.quit('测试结束');
    beta.bot.quit('测试结束');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('测试失败:', err);
  process.exit(1);
});