import { Bot } from 'mineflayer';
import { BotTool } from '../ai/types';

/**
 * 创建 Bot 可用工具集（供 AI Function Calling 使用）
 */
export function createBotTools(bot: Bot): BotTool[] {
  const botAny = bot as any;
  return [
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
        const collectBlock = require('mineflayer-collectblock').plugin;
        // 找到最近的掉落物
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
  ];
}