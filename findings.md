# 研究发现

## Mineflayer
- Mineflayer 是 Node.js 的 Minecraft 协议实现
- 支持 Minecraft Java Edition 1.8 - 最新版本
- 核心 API: `bot.chat()`, `bot.pathfinder`, `bot.dig()`, `bot.placeBlock()`
- 插件系统: mineflayer-pathfinder, mineflayer-pvp, mineflayer-collectblock

## AI API 集成方案
- 统一抽象层支持多种 AI 后端
- 对话上下文管理使用滑动窗口 + 摘要
- 角色设定通过 System Prompt 实现
- 工具调用 (Function Calling) 映射 AI 决策到 Bot 动作

## 前端方案
- React + Vite 快速开发
- SVG 矢量图用于状态监控面板
- Socket.io 实现实时通信
- 响应式设计适配移动端

## 项目结构设计
```
赛博人/
├── src/
│   ├── bot/           # Mineflayer Bot 核心
│   ├── ai/            # AI API 接口
│   ├── server/        # WebSocket 服务
│   ├── config/        # 配置管理
│   └── utils/         # 工具函数
├── frontend/          # React 前端
├── config/            # 配置文件
└── logs/              # 日志文件
```