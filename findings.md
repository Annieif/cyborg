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

## 服务器探索测试 (2026-07-22)

### API 端点测试
- 所有 11 个端点正常工作，无崩溃
- 健康状态: healthy, 零错误
- 版本: v1.0.4, Node v22.16.0
- AI 后端: Ollama / llama3.2

### 发现的 Bug
- **chatCount 统计**: /api/chat 处理器未递增 chatCount 计数器
- **messageCount**: 发送消息后不递增（可能只统计接收的消息）
- **代理移动**: move 命令疑似使用 /tp 传送而非 WASD 步行（移动 250+ 方块）
- **idleTime**: 始终等于 uptime，空闲检测未工作

### 功能缺失
- 服务器名称/版本/模式在经验记忆中显示为"未知"
- 经验记忆不记录聊天消息（仅记录加入事件）
- 代理移动缺少 back 方向
- AI 聊天响应未触发（aiCallCount 始终为 0）

## 优化修复 (2026-07-22)

### 修复的 Bug
- **chatCount**: 在 safeChat() 起始处调用 health.recordChat()，所有聊天路径统一计数
- **idleTime**: 新增 HealthMonitor.recordActivity()，在 executeProxyCommand 调用
- **代理移动**: 持续时间 500ms → 2000ms，可感知移动距离
- **BotStatus**: 新增 chatCount 字段暴露到前端

### 新增功能
- **服务器元数据**: spawn 时自动检测 version/gameMode/difficulty 并写入经验记忆
- **聊天记录**: 接收到的聊天消息自动记录到经验记忆的"重要事件"
- **出生点地标**: spawn 时自动记录出生点坐标到经验记忆的"重要地标"

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