# 我的世界AI赛博人 (Minecraft AI Cyborg)

基于 [Mineflayer](https://github.com/PrismarineJS/mineflayer) 的 Minecraft AI 机器人。接入 OpenAI / Claude / 自定义 API 实现智能对话与世界交互，支持 Web 仪表盘监控和真人代理操控。

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs" alt="Node.js">
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Minecraft-1.8~1.21-62B47A?logo=minecraft" alt="Minecraft">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs">
</p>

---

## 目录

- [演示概览](#演示概览)
- [核心特性](#核心特性)
- [快速开始](#快速开始)
- [零基础完整教程](#零基础完整教程)
- [配置详解](#配置详解)
- [架构设计](#架构设计)
- [使用教程](#使用教程)
  - [基础使用](#基础使用)
  - [真人代理模式](#真人代理模式)
  - [AI 经验记忆](#ai-经验记忆)
  - [多 Bot 运行](#多-bot-运行)
- [常见用例配方](#常见用例配方)
- [玩家命令参考](#玩家命令参考)
- [AI 工具参考](#ai-工具参考)
- [API 参考](#api-参考)
- [Web Dashboard](#web-dashboard)
- [部署指南](#部署指南)
- [性能调优](#性能调优)
- [服务器兼容性](#服务器兼容性)
- [开发指南](#开发指南)
- [测试指南](#测试指南)
- [故障排除](#故障排除)
- [FAQ](#faq)
- [安全注意事项](#安全注意事项)
- [速查卡](#速查卡)
- [技术栈](#技术栈)
- [更新日志](#更新日志)
- [贡献](#贡献)

---

## 演示概览

### 赛博人在游戏中的表现

```
┌─────────────────────────────────────────────────────────────────┐
│  Minecraft 聊天栏                                                 │
├─────────────────────────────────────────────────────────────────┤
│  <Steve> @赛博人 你好！你能帮我挖点铁矿吗？                         │
│  <AI_Cyborg> 你好 Steve！当然可以，让我看看附近有什么。              │
│  <AI_Cyborg> 我在 (-50, 12, 200) 发现了一处铁矿脉，正在挖掘中...     │
│  <Steve> !come                                                   │
│  <AI_Cyborg> 正在前往你的位置 (20, 64, -30)                       │
│  <AI_Cyborg> 我到了！给你 12 个铁矿石。                             │
│  <Alex> 赛博人，帮我看看现在几点了？                                 │
│  <AI_Cyborg> 现在是游戏时间 14:30，晴天，适合出门探索！              │
└─────────────────────────────────────────────────────────────────┘
```

### Web Dashboard 布局

```
┌──────────────────┬────────────────────────────────┬──────────────────┐
│   状态面板 (左)    │        聊天区 (中)               │  右侧面板          │
│                  │                                │                  │
│  ● 在线           │  ┌──────────────────────────┐  │  在线玩家          │
│  ❤ 生命 20/20    │  │ [Steve] 你好！             │  │  · Steve (12m)   │
│  🍗 饥饿 18/20    │  │ [Bot]   你好 Steve！       │  │  · Alex  (45m)   │
│  📍 (-5, 77, -34) │  │ [Alex]  赛博人，来帮我     │  │                  │
│  🌍 overworld    │  └──────────────────────────┘  │  代理控制          │
│  🕐 14:30 晴天    │  ┌──────────────────────────┐  │  [W] [A] [S] [D] │
│                  │  │ 输入消息...        [发送]  │  │  [空格][Ctrl][⇧]  │
│  📊 图表          │  └──────────────────────────┘  │  [⛏][🧱][⚔][🖐]  │
│  ╭───╮           │                                │  [🗑][📦]         │
│  │❤  │ 生命环     │                                │  [👣跟随][📍前往]  │
│  ╰───╯           │                                │                  │
│  · 坐标散点图     │                                │                  │
│  · 统计柱状图     │                                │                  │
└──────────────────┴────────────────────────────────┴──────────────────┘
```

---

## 核心特性

### 智能交互
- **AI 自然语言对话**: 玩家在游戏中 @Bot 或直接说话，Bot 通过 AI API 理解并回复
- **Function Calling**: AI 可自主调用 12 个工具与世界交互（移动、挖掘、放置、战斗等）
- **角色设定**: 通过 System Prompt 自定义 Bot 的性格、语气、行为模式
- **上下文管理**: 滑动窗口 + 可配置轮数，AI 记住最近对话

### 真人代理模式
- **无需客户端**: 在 Web Dashboard 上通过 WASD 按钮操控 Bot 在 Minecraft 世界中移动
- **实时操作**: 挖掘、放置、攻击、使用物品、收集掉落物，全部通过网页完成
- **跟随/导航**: 一键跟随指定玩家，或输入坐标自动寻路前往
- **状态反馈**: 500ms 实时推送位置、生命值、朝向等状态

### 世界交互
- 自动寻路移动（A* 算法，mineflayer-pathfinder）
- 方块挖掘与放置（支持面朝向控制）
- 物品管理（背包查看、切换、丢弃、收集掉落物）
- 战斗系统（PVE，支持 6 种敌对生物识别）
- 世界感知（附近玩家、时间、天气、坐标、维度）

### 生产级质量
- **自动重连**: 指数退避算法 (3s → 4.5s → 6.75s → ... → 60s max)，最大 20 次尝试
- **聊天安全**: 智能拆分长消息（按句号/换行断句）+ 4条/10秒速率限制，防止被服务器误封
- **经验记忆**: 每个服务器独立的 `exp.md` 文件，自动解析 Markdown 为 AI 上下文
- **健康监控**: 运行时间、聊天数、AI 调用数、错误数、重连次数，自动判断 healthy/degraded
- **日志系统**: Winston 结构化日志，文件 + 控制台双输出，支持 debug/info/warn/error 四级
- **配置校验**: Zod Schema 启动时校验所有环境变量，错误配置立即报错

### Web Dashboard
- 实时状态监控（生命值、饥饿值、坐标、游戏时间、天气）
- 游戏聊天面板（实时收发消息，玩家气泡 / Bot 气泡 / 系统消息）
- 在线玩家列表（含距离显示）
- SVG 矢量图表（环形健康图、坐标散点图、统计柱状图）
- 真人代理操控面板（WASD + 跳跃/疾跑/潜行 + 6 个交互按钮 + 跟随/前往）

---

## 快速开始

### 前置要求

- **Node.js** 18+  [下载](https://nodejs.org/)
- **Minecraft Java Edition** 服务器 1.8 - 1.21
- **AI API Key**（OpenAI / Claude / 兼容格式）

### 1. 克隆并安装

```bash
git clone https://github.com/Annieif/cyborg.git minecraft-ai-cyborg
cd minecraft-ai-cyborg

# 安装后端依赖
npm install --legacy-peer-deps

# 安装并构建前端
cd frontend
npm install
npm run build
cd ..
```

### 2. 配置环境

```bash
cp .env.example .env
```

编辑 `.env`，填入必填配置：

```env
# === 必填 ===
MC_HOST=localhost                 # 服务器地址
MC_USERNAME=AI_Cyborg             # Bot 游戏名（3-16位英文，仅 a-z A-Z 0-9 _）
AI_API_KEY=sk-your-api-key-here   # AI API 密钥

# === 可选（有默认值） ===
MC_PORT=25565
MC_VERSION=1.20.1
AI_PROVIDER=openai                # openai / claude / custom
AI_MODEL=gpt-4o-mini
AI_BASE_URL=https://api.openai.com/v1
```

### 3. 启动

**Windows 一键启动:**
```bash
start.bat
```

**Docker 一键部署:**
```bash
docker-compose up -d
```

**手动启动:**
```bash
npm run build
npm start
```

### 4. 打开控制面板

浏览器访问 **http://localhost:3000**

---

## 零基础完整教程

> 本节面向从未使用过命令行或编程的新手。如果你已经熟悉 Node.js 和 Minecraft 服务器，可以跳过本节。

### 第 1 步：安装 Node.js

1. 打开浏览器，访问 https://nodejs.org/
2. 下载 **LTS 版本**（左侧绿色按钮，版本号 >= 18）
3. 双击安装包，一路点 "Next" 完成安装
4. 打开 **命令提示符**（Win+R，输入 `cmd`，回车），输入：
   ```cmd
   node --version
   ```
   如果显示 `v18.x.x` 或更高，说明安装成功。

### 第 2 步：准备 Minecraft 服务器

**选项 A：使用已有的服务器**
- 如果你已经在玩某个 Minecraft 服务器，记下它的 IP 地址和端口（默认 25565）
- 确保服务器是 **离线模式**（offline-mode=false），否则 Bot 需要正版账号
- 确认服务器版本（1.8 ~ 1.21）

**选项 B：自己搭建测试服务器（推荐新手）**
1. 下载服务端 jar 文件（如 PaperMC、Spigot 或 Vanilla）
2. 新建一个文件夹，把 jar 放进去，创建 `eula.txt` 写入 `eula=true`
3. 创建 `server.properties`，确保 `online-mode=false`
4. 双击 jar 启动服务器
5. 用 Minecraft 客户端连接 `localhost:25565` 确认服务器正常

### 第 3 步：获取 AI API Key

**选项 A：OpenAI（推荐，最简单）**
1. 访问 https://platform.openai.com/
2. 注册账号并充值（最低 $5）
3. 进入 API Keys 页面，创建新 Key
4. 复制 Key（以 `sk-` 开头）

**选项 B：国内兼容 API（如 DeepSeek、通义千问、智谱等）**
1. 注册对应平台账号
2. 获取 API Key 和 Base URL（注意：必须是兼容 OpenAI Chat Completions 格式的）
3. 后续配置时选择 `AI_PROVIDER=custom`

### 第 4 步：下载并配置赛博人

```bash
# 1. 下载项目（解压到任意文件夹，比如桌面）
# 2. 在项目文件夹中，按住 Shift + 右键 → "在此处打开 PowerShell 窗口"
# 3. 安装依赖
npm install --legacy-peer-deps

# 4. 安装前端
cd frontend
npm install
npm run build
cd ..

# 5. 复制配置文件
copy .env.example .env

# 6. 用记事本打开 .env 文件，修改以下内容：
#    MC_HOST=你的服务器IP
#    AI_API_KEY=你的API密钥
```

### 第 5 步：启动

```bash
# 方式 1：双击 start.bat（Windows）
# 方式 2：在 PowerShell 中运行
npm start
```

看到以下日志说明启动成功：
```
[INFO] Starting CyborgBot...
[INFO] Bot spawned: AI_Cyborg
[INFO] Web server running on http://localhost:3000
```

### 第 6 步：开始使用

1. 打开浏览器，访问 `http://localhost:3000`
2. 你应该看到 Bot 在线状态和实时数据
3. 打开 Minecraft，进入同一个服务器
4. 在聊天栏输入 `@AI_Cyborg 你好`，Bot 应该会回复你
5. 试试 `!help` 查看所有命令

### 常见问题速查

| 问题 | 解决方案 |
|------|---------|
| `npm` 不是内部命令 | Node.js 未安装或未重启终端 |
| Bot 连不上服务器 | 检查 `MC_HOST` 和 `MC_PORT`，测试 Minecraft 客户端能否连接 |
| AI 不回复 | 检查 `AI_API_KEY` 是否正确，网络能否访问 API 地址 |
| 前端页面空白 | 确保已运行 `cd frontend && npm run build` |
| 端口被占用 | 修改 `.env` 中 `WEB_PORT` 为其他值（如 3001） |

---

## 配置详解

### 完整配置项

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `MC_HOST` | string | `localhost` | Minecraft 服务器地址（IP 或域名） |
| `MC_PORT` | number | `25565` | 服务器端口 |
| `MC_USERNAME` | string | `AI_Cyborg` | Bot 在游戏中的名字（3-16位，仅 a-z A-Z 0-9 _） |
| `MC_VERSION` | string | `1.20.1` | Minecraft 版本（需与服务器匹配） |
| `AI_PROVIDER` | enum | `openai` | AI 提供商: `openai` / `claude` / `custom` |
| `AI_API_KEY` | string | *必填* | AI API 密钥 |
| `AI_MODEL` | string | `gpt-4o` | 模型名称 |
| `AI_BASE_URL` | url | `https://api.openai.com/v1` | API 地址（自定义兼容接口时使用） |
| `AI_PERSONA` | string | 见下方 | Bot 角色设定 System Prompt |
| `AI_MAX_CONTEXT` | number | `20` | 最大对话上下文轮数（超过后会移除最早的消息） |
| `AI_TEMPERATURE` | number | `0.7` | AI 温度参数 (0-2)，越高越有创意，越低越确定 |
| `WEB_PORT` | number | `3000` | Web 面板端口 |
| `WEB_HOST` | string | `localhost` | Web 服务绑定地址（`0.0.0.0` 允许外部访问） |
| `LOG_LEVEL` | enum | `info` | 日志级别: `debug` / `info` / `warn` / `error` |
| `LOG_FILE` | string | `logs/bot.log` | 日志文件路径 |
| `MC_AUTH` | enum | `offline` | 认证模式: `offline` / `microsoft` (正版) |
| `AI_MAX_TOKENS` | number | `8000` | AI 上下文 token 预算（超出时自动摘要压缩） |
| `AI_VISION` | boolean | `false` | 启用多模态视觉分析（实验性，耗 token） |
| `AI_VISION_MODEL` | string | `gpt-4o` | 视觉模型名称（需支持 vision） |

### 配置参数深度解析

#### `AI_MAX_CONTEXT` — 上下文窗口

控制 AI 能记住多少轮对话。每轮包含一次用户消息 + 一次 AI 回复（含工具调用）。

- **5-10**: 适合简单问答，内存占用少，但 AI 容易忘记之前说过的话
- **15-20**: 平衡选择，适合大多数场景（**推荐**）
- **30-50**: 长对话记忆，但会增加 API 调用成本和延迟

```env
AI_MAX_CONTEXT=15
```

#### `AI_TEMPERATURE` — 创造力控制

- **0.0-0.3**: 确定性强，回复一致，适合严肃角色或技术问答
- **0.5-0.8**: 平衡选择，有一定创意但不过分（**推荐**）
- **0.9-1.5**: 高创意，回复多变，适合娱乐和角色扮演
- **1.5-2.0**: 极度随机，可能产生奇怪回复，不推荐

```env
AI_TEMPERATURE=0.7
```

#### `LOG_LEVEL` — 日志详细程度

- **debug**: 记录所有细节，包括 AI 请求/响应、工具调用参数、网络包。适合开发调试
- **info**: 记录关键事件（启动、连接、AI 调用、错误）。适合生产环境（**推荐**）
- **warn**: 仅记录警告和错误。适合长期稳定运行
- **error**: 仅记录错误。适合日志量敏感的场景

```env
LOG_LEVEL=debug
```

#### `WEB_HOST` — 绑定地址安全

- **localhost / 127.0.0.1**: 仅本机访问，最安全（**推荐**）
- **0.0.0.0**: 允许局域网或公网访问，需要配合防火墙和反向代理
- **内网 IP**: 允许特定网段访问

```env
WEB_HOST=0.0.0.0   # 注意：这会暴露面板到网络，需要额外安全措施
```

### AI 角色设定

默认 Persona:
```
你是一个友善的Minecraft AI赛博人。你可以与玩家聊天、帮助他们建造、探索世界。你的名字是赛博人。
```

**自定义示例 — 战斗型 Bot:**
```env
AI_PERSONA=你是一个勇敢的战斗机器人，代号"铁拳"。你喜欢PVP，说话简短有力，总是冲在最前面。你的口号是"冲啊！"。回复不超过20字。遇到敌人时优先攻击，保护队友是你的职责。
```

**自定义示例 — 向导型 Bot:**
```env
AI_PERSONA=你是服务器向导"小灵"。你熟悉服务器的一切，会耐心回答新手问题，带路去各个地点。说话温和有礼，使用敬语。回复时可以提供坐标参考。对于不知道的事情，诚实地说不知道并建议玩家询问管理员。
```

**自定义示例 — 角色扮演 Bot:**
```env
AI_PERSONA=你是一个来自未来的机器人，穿越到了方块世界。你对这个世界的一切都感到新奇，会用数据和概率分析一切。说话带点机械感，偶尔会冒出"计算中..."、"数据不足"、"概率分析显示..."等话语。你非常喜欢红石和自动化。
```

**自定义示例 — 商人 Bot:**
```env
AI_PERSONA=你是服务器的商人NPC"老钱"。你经营着服务器商店，了解各种物品的市场价格。你说话带点市侩气，会讨价还价。你知道所有重要地标的位置，可以告诉玩家去哪里采集资源。你的口头禅是"这可是好货！"。
```

### 编写好的 Persona 的技巧

1. **明确角色身份**: 名字、职业、背景故事
2. **限定语气风格**: 用词习惯、句子长度、是否使用敬语/口语
3. **设定行为准则**: 什么情况下做什么事，优先处理什么
4. **控制回复长度**: "回复不超过30字"防止 AI 刷屏
5. **利用经验记忆**: Persona 中可以引用 `exp.md` 中的信息

### 使用自定义 API（如 DeepSeek、通义千问等）

任何兼容 OpenAI Chat Completions 格式的 API 都可以直接使用。

```env
AI_PROVIDER=custom
AI_API_KEY=your-key
AI_BASE_URL=https://your-api-endpoint.com/v1
AI_MODEL=your-model-name
```

**国内常用 API 配置参考:**

| 平台 | BASE_URL | 模型示例 |
|------|----------|---------|
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-plus` |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4` | `glm-4` |
| Moonshot | `https://api.moonshot.cn/v1` | `moonshot-v1-8k` |
| 零一万物 | `https://api.lingyiwanwu.com/v1` | `yi-large` |

> **注意**: 以上 BASE_URL 和模型名可能需要根据各平台最新文档调整。确保 API 支持 Function Calling / Tools 功能。

### Claude API 配置

```env
AI_PROVIDER=claude
AI_API_KEY=sk-ant-api03-your-key
AI_MODEL=claude-3-5-sonnet-20241022
AI_BASE_URL=https://api.anthropic.com/v1
```

---

## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                     Web Dashboard (React 18)                      │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │StatusPanel│  │ ChatArea  │  │PlayerList │  │ ProxyControl │ │
│  │ SVG 图表  │  │ 消息气泡  │  │ 玩家+工具  │  │ WASD+交互    │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│        └──────────────┴──────────────┴───────────────┘          │
│                          │ Socket.io (WebSocket)                  │
└──────────────────────────┼──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                      Express Server (:3000)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    REST API 路由                             │ │
│  │  GET  /api/status      POST /api/chat                       │ │
│  │  GET  /api/health      GET  /api/history                    │ │
│  │  POST /api/proxy/*     GET  /api/exp  POST /api/exp/record  │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  WebSocket 事件总线                          │ │
│  │  status | chat | playerJoin | playerLeave | death           │ │
│  │  reconnecting | proxy:result | proxy:command                │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                       CyborgBot 核心                              │
│                                                                   │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────────┐ │
│  │ Mineflayer   │  │ Conversation   │  │  CommandSystem       │ │
│  │ · 协议连接   │  │ Manager        │  │ · 8 个玩家命令       │ │
│  │ · 事件处理   │  │ · 上下文管理   │  │ · !help !status ...  │ │
│  │ · 插件加载   │  │ · 工具调用循环 │  │ · 别名系统           │ │
│  │ · 心跳检测   │  │ · 角色设定     │  │ · 自动分片回复       │ │
│  └──────┬───────┘  └───────┬────────┘  └──────────┬───────────┘ │
│         │                  │                       │              │
│  ┌──────┴──────────────────┴───────────────────────┴──────────┐ │
│  │                     工具层 (12 个工具)                       │ │
│  │  moveTo | sendChat | whisper | digBlock | placeBlock        │ │
│  │  getInventory | equipItem | collectNearbyItems              │ │
│  │  getNearbyPlayers | getPosition | getTime | attackHostile   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ RateLimiter  │  │HealthMonitor │  │  ExperienceMemory      │ │
│  │ · 滑动窗口   │  │ · 运行指标   │  │  · exp.md 读写          │ │
│  │ · 4条/10秒   │  │ · 健康报告   │  │  · Markdown 解析       │ │
│  │ · 防封禁     │  │ · 错误追踪   │  │  · AI 上下文注入        │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────────┘
                           │ TCP (Minecraft Protocol)
┌──────────────────────────┴──────────────────────────────────────┐
│               Minecraft Server (Java Edition)                    │
│               Vanilla / Paper / Spigot / Fabric                  │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流详解

**1. 玩家消息 → AI 回复流程:**
```
玩家在游戏聊天发言
  → Minecraft 服务器广播
  → Mineflayer 接收 chat 事件
  → 检查是否 @Bot / 叫名字 / 含关键词
  → ConversationManager.sendMessage()
  → AI Provider API 调用（含 tools 定义）
  → AI 返回文本回复 或 工具调用请求
  → 如果是工具调用：执行工具 → 结果回传 AI → AI 生成最终回复
  → CyborgBot.safeChat() 拆分+限速发送
  → 消息显示在游戏聊天中
```

**2. Web 指令 → Bot 动作流程:**
```
用户在 Dashboard 点击按钮或输入消息
  → WebSocket 发送事件到服务端
  → Express Server 路由到 CyborgBot
  → CyborgBot 调用 Mineflayer API
  → Mineflayer 发送 Minecraft 协议包
  → 服务器执行动作
  → 状态变化通过 WebSocket 推回 Dashboard
```

**3. 状态推送循环:**
```
每 500ms（代理模式）或 1000ms（普通模式）:
  CyborgBot.getStatus() 收集所有状态
  → WebSocket 广播 status 事件
  → Dashboard 更新所有组件
```

**4. 经验记忆积累:**
```
自动事件（玩家加入/离开、Bot 死亡）
  → CyborgBot 事件处理
  → ExperienceMemory.recordPlayer() / recordEvent()
  → 写入 experience/<host>_<port>.md

手动记录（API 调用）
  → POST /api/exp/record
  → ExperienceMemory 对应方法
  → 写入文件

Bot 启动时
  → ExperienceMemory 加载 exp.md
  → 解析 Markdown 为结构化数据
  → getSystemPrompt() 生成 AI 上下文
  → 注入 ConversationManager 的 System Message
```

### 类关系图

```
┌─────────────────────────────────────────────────────────────┐
│                         CyborgBot                            │
│  - bot: mineflayer.Bot                                      │
│  - conversation: ConversationManager                        │
│  - chatLimiter: RateLimiter                                 │
│  - health: HealthMonitor                                    │
│  - expMemory: ExperienceMemory                              │
│  - proxyMode: boolean                                       │
│  - reconnectAttempts: number                                │
├─────────────────────────────────────────────────────────────┤
│  + start() / stop()                                         │
│  + chat() / safeChat() / smartChunk()                       │
│  + getStatus(): BotStatus                                   │
│  + enableProxyMode() / disableProxyMode()                   │
│  + executeProxyCommand(cmd: ProxyCommand)                   │
│  + attemptReconnect()                                       │
│  + getConversation() / getHealth()                          │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐
│ConversationManager│  │HealthMonitor  │  │ExperienceMemory  │
│ - provider       │  │ - chatCount   │  │ - filePath       │
│ - messages[]     │  │ - aiCallCount │  │ - memory (Map)   │
│ - tools[]        │  │ - errorCount  │  │ + load()/save()  │
│ + sendMessage()  │  │ + getReport() │  │ + recordPlayer() │
│ + registerTool() │  │ + record*()   │  │ + getSystemPrompt│
│ + reset()        │  └───────────────┘  └──────────────────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  AIProvider      │
│  (接口)          │
│  + chat()        │
│  + name          │
│  + models        │
└─────────────────┘
         △
         │ 实现
    ┌────┴────┬──────────┐
    ▼         ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│OpenAI  │ │Claude  │ │Custom  │
│Provider│ │Provider│ │Provider│
└────────┘ └────────┘ └────────┘
```

---

## 使用教程

### 基础使用

#### 启动 Bot

```bash
npm start
```

Bot 启动后会自动连接配置的 Minecraft 服务器。连接成功后，Web Dashboard 显示 "在线" 状态。

#### 在 Minecraft 中与 Bot 对话

在游戏聊天中输入以下方式触发 Bot 响应：

- `@Bot名 你好` — @提及（最推荐）
- `Bot名 帮帮我` — 直接叫名字
- `赛博人 你在哪` — 包含 Bot 名字关键词

Bot 会通过 AI 理解你的意图并回复。你可以让它：
- "帮我挖 10 个石头"
- "附近有什么玩家？"
- "现在几点了？"
- "跟我来，我去建房子"
- "攻击那只僵尸！"

#### 使用玩家命令

在游戏聊天中输入 `!` 开头的命令：

```
!help          # 查看所有命令
!status        # 查看 Bot 状态
!come          # 让 Bot 过来
!list          # 查看在线玩家
!collect       # 收集附近掉落物
```

#### 通过 Web 面板发送消息

在 Dashboard 聊天输入框输入消息，Bot 会在游戏中发出。适合你不方便在游戏里打字时使用。

---

### 真人代理模式

无需 Minecraft 客户端，通过 Web 面板直接操控 Bot 在服务器中游玩。

#### 开启代理模式

1. 打开 Web Dashboard
2. 在右侧面板找到 "真人代理模式"
3. 点击 "已关闭" 按钮切换为 "已开启"

开启后状态面板会显示 "代理模式开启" 警告标签。

#### 操控方式

**移动控制（7 个按键）:**
| 按钮 | 动作 | 说明 |
|------|------|------|
| W | 前进 | 按住不放持续前进 |
| S | 后退 | 按住不放持续后退 |
| A | 左移 | 按住不放持续左移 |
| D | 右移 | 按住不放持续右移 |
| 空格 | 跳跃 | 点击跳跃 |
| Ctrl | 疾跑 | 移动时加速 |
| Shift | 潜行 | 防止从边缘掉落 |

**交互操作（6 个按钮）:**
| 按钮 | 动作 | 说明 |
|------|------|------|
| 挖掘 | 挖掘准星对准的方块 | 需要空手或工具 |
| 放置 | 放置手中方块 | 需要对准方块表面 |
| 攻击 | 攻击准星对准的实体 | 可攻击玩家或生物 |
| 使用 | 使用手中物品 | 吃食物、拉弓、开门等 |
| 丢弃 | 丢弃手中物品 | 丢弃整组物品 |
| 收集 | 自动收集附近掉落物 | Bot 自动走过去捡 |

**快捷操作:**
| 按钮 | 动作 | 说明 |
|------|------|------|
| 跟随 | 输入玩家名，Bot 自动跟随 | 使用 A* 寻路 |
| 前往 | 输入坐标，Bot 自动寻路前往 | 使用 A* 寻路 |

#### API 方式操控

```bash
# 开启代理模式
curl -X POST http://localhost:3000/api/proxy/enable

# 发送移动指令
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"move","params":{"direction":"forward"}}'

# 挖掘
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"dig","params":{}}'

# 放置方块
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"place","params":{}}'

# 攻击
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"attack","params":{}}'

# 使用物品
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"use","params":{}}'

# 丢弃物品
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"drop","params":{}}'

# 收集掉落物
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"collect","params":{}}'

# 跟随玩家
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"follow","params":{"player":"Steve"}}'

# 前往坐标
curl -X POST http://localhost:3000/api/proxy/command \
  -H "Content-Type: application/json" \
  -d '{"action":"goto","params":{"x":100,"y":64,"z":200}}'

# 关闭代理模式
curl -X POST http://localhost:3000/api/proxy/disable
```

#### 代理模式内部机制

- 开启代理后，AI 自动回复功能**暂停**（防止 AI 和代理操作冲突）
- 状态推送频率从 1 秒提升到 **500ms**，确保操控实时性
- 所有移动操作通过 `bot.setControlState()` 实现，松开按钮自动停止
- 代理模式下状态 `proxyMode: true` 会推送到 WebSocket

---

### AI 经验记忆

每个服务器自动维护独立的经验文件 `experience/<host>_<port>.md`，AI 会将这些信息作为上下文记忆。

#### 自动记录

Bot 自动记录以下信息：
- 玩家加入/离开服务器
- Bot 死亡
- 服务器信息（版本、模式）

#### 手动记录

**通过 API:**
```bash
# 记录地标
curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"landmark","key":"主城","value":"坐标 (100, 64, 200)，有传送门和商店"}'

# 记录规则
curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"rule","value":"禁止在出生点附近PVP"}'

# 记录玩家信息
curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"player","key":"Steve","value":"服务器管理员，喜欢建造红石机器"}'

# 记录重要事件
curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"event","value":"主城扩建完成，新增了附魔区"}'

# 追加备注
curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"notes","value":"服务器每周五晚上8点举行活动"}'

# 查看经验内容
curl http://localhost:3000/api/exp
```

**直接编辑文件:**
```
experience/localhost_25565.md
```

编辑后 Bot 在下次启动或对话时会自动加载最新内容。

#### 经验文件格式

```markdown
# 服务器经验记忆

> 自动生成于 2026-07-21 14:11:15

## 服务器信息

- **名称**: 生存服务器
- **版本**: 1.20.1
- **模式**: survival

## 已知玩家

- **Steve**: 管理员，友好
- **Alex**: 建筑师，在(-200, 64, 300)有基地

## 重要地标

- **出生点**: 坐标 (0, 64, 0)，有欢迎中心
- **商店**: 坐标 (100, 64, 200)，出售各种材料

## 服务器规则

- 禁止破坏他人建筑
- PVP 需双方同意

## 重要事件

- **2026-07-20 15:30:00**: 服务器更新到 1.20.1
- **2026-07-21 10:00:00**: 举办建筑比赛

## 备注

这是一个友好社区服务器，玩家们都很热情。
```

#### 经验记忆工作原理

1. **Bot 启动时**: 读取 `exp.md`，解析 Markdown 各区块为结构化数据
2. **生成 System Prompt**: 将玩家列表、地标、规则、最近 5 条事件注入 AI 上下文
3. **运行时动态更新**: 调用 `conversation.updateExpPrompt()` 同步最新内容
4. **自动保存**: 每次记录操作后立即写入文件（最多保留 100 条事件）
5. **跨服务器隔离**: 不同服务器有独立的 `experience/<host>_<port>.md` 文件

---

### 多 Bot 运行

可以同时运行多个赛博人，每个 Bot 独立配置。

#### 方法 1: 多进程（推荐）

```bash
# 终端 1 — Bot Alpha
MC_USERNAME=Cyborg_Alpha node dist/index.js

# 终端 2 — Bot Beta（Web 面板用不同端口）
MC_USERNAME=Cyborg_Beta WEB_PORT=3001 node dist/index.js
```

#### 方法 2: 使用测试脚本

```bash
npm run test:bots
```

此脚本启动两个预设性格的 Bot：
- **Cyborg_Alpha**: 好战型，喜欢 PVP，说话简短有力
- **Cyborg_Beta**: 友善型，乐于助人，喜欢建造

两个 Bot 在测试服务器中自动运行全套测试：聊天、PVP、移动、物品交互。

#### 方法 3: 编程方式

```typescript
import { CyborgBot } from './bot';

const bot1 = new CyborgBot('localhost', 25565);
const bot2 = new CyborgBot('localhost', 25565);
const bot3 = new CyborgBot('localhost', 25565);

await Promise.all([bot1.start(), bot2.start(), bot3.start()]);
```

#### 多 Bot 注意事项

1. **每个 Bot 需要不同的用户名**: 不能重复登录
2. **Web 面板端口不能冲突**: 每个 Bot 需要不同的 `WEB_PORT`
3. **API Key 共享**: 多个 Bot 可以共用同一个 API Key
4. **经验文件独立**: 同一服务器上的多个 Bot 共享同一个 `exp.md`
5. **资源消耗**: 每个 Bot 额外消耗约 100-200MB 内存和少量 CPU

---

## 常见用例配方

### 配方 1：AFK 挂机 Bot

让 Bot 24 小时在线，帮你守着基地。

```env
MC_HOST=your-server.com
MC_USERNAME=Guardian_Bot
AI_PERSONA=你是基地守卫机器人。你守在基地中，不会主动离开。当有玩家靠近时，你会礼貌地打招呼。如果发现可疑行为，你会记录并警告玩家。
AI_MODEL=gpt-4o-mini
AI_TEMPERATURE=0.3
AI_MAX_CONTEXT=10
```

**额外配置建议:**
- 设置 `LOG_LEVEL=warn` 减少日志输出
- 使用 `AI_MODEL=gpt-4o-mini` 降低 API 成本
- 可选：编写定时移动脚本防止被 AFK 踢出

### 配方 2：服务器向导 Bot

帮新玩家了解服务器，回答问题，带路去各个地点。

```env
MC_USERNAME=Guide_Bot
AI_PERSONA=你是服务器向导"小灵"。你熟悉服务器的一切，包括：所有传送点、商店位置、资源区、建筑区。你会主动欢迎新玩家，耐心回答任何问题。不知道的事情会诚实地说不知道，并建议询问管理员。回复时提供坐标和方向参考。
AI_TEMPERATURE=0.5
AI_MAX_CONTEXT=20
```

**搭配经验记忆:**
```bash
# 记录关键地点
curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"landmark","key":"主城","value":"坐标 (0, 65, 0)，有传送大厅、商店、公告板"}'

curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"landmark","key":"资源世界","value":"通过主城传送门进入，可自由采集资源"}'

# 记录规则
curl -X POST http://localhost:3000/api/exp/record \
  -H "Content-Type: application/json" \
  -d '{"type":"rule","value":"禁止在主世界挖直线矿道，请去资源世界采集"}'
```

### 配方 3：PVP 竞技 Bot

用于 PVP 训练或竞技场。

```env
MC_USERNAME=Arena_Bot
AI_PERSONA=你是竞技场战斗机器人。你的唯一职责是PVP战斗。你说话简短有力，只回应战斗相关的话题。你对任何攻击都会立即反击。你擅长使用剑和盾牌，会在战斗中切换装备。你的口头禅是"来战！"。
AI_TEMPERATURE=0.8
AI_MODEL=gpt-4o
```

**注意**: 在 PVP 服务器上使用 Bot 前，确认服务器规则允许。

### 配方 4：建筑助手 Bot

帮玩家完成重复性建造任务。

```env
MC_USERNAME=Builder_Bot
AI_PERSONA=你是建筑助手机器人。你擅长帮助玩家完成重复性建造工作，如：铺设地板、建造围墙、挖掘地基。你会在玩家指导下精确执行方块放置和挖掘。你了解各种建筑材料的特性。回复简短实用，以"收到"、"完成"等确认性语言为主。
AI_TEMPERATURE=0.2
```

### 配方 5：真人代理专用 Bot

完全不使用 AI，纯粹作为真人代理在服务器上游玩。

```env
MC_USERNAME=Proxy_Player
AI_PROVIDER=custom
AI_API_KEY=no-key-needed
AI_BASE_URL=http://localhost:9999/v1
AI_MODEL=unused
AI_PERSONA=你是一个沉默的代理机器人。你从不主动说话，只响应代理指令。
```

启动后立即通过 API 开启代理模式：
```bash
curl -X POST http://localhost:3000/api/proxy/enable
```

然后在 Web Dashboard 上操控 Bot。

---

## 玩家命令参考

在游戏聊天中发送 `!` 前缀命令：

| 命令 | 别名 | 说明 | 用法 | 示例 |
|------|------|------|------|------|
| `!help` | `!h`, `!?` | 查看所有命令 | `!help [命令名]` | `!help status` |
| `!status` | `!stats`, `!info` | 查看 Bot 状态 | `!status` | `!status` |
| `!come` | `!follow` | Bot 移动到你的位置 | `!come` | `!come` |
| `!give` | `!item` | Bot 丢弃指定物品 | `!give <物品名>` | `!give diamond` |
| `!list` | `!players`, `!who` | 查看在线玩家 | `!list` | `!list` |
| `!collect` | `!pickup` | 收集附近掉落物 | `!collect` | `!collect` |
| `!stop` | `!cancel` | 停止当前移动 | `!stop` | `!stop` |
| `!reset` | `!clear` | 重置 AI 对话记忆 | `!reset` | `!reset` |

**命令行为细节:**
- 所有命令不区分大小写（`!Help` = `!help`）
- 命令执行结果会分片发送（每条最多 200 字符），防止刷屏
- `!give` 使用模糊匹配，输入 `diamond` 可以匹配到 `diamond_sword`、`diamond_pickaxe` 等
- `!come` 命令 Bot 走到你身边 2 格范围内
- `!reset` 会清除 AI 的所有对话记忆，但不影响经验记忆文件

---

## AI 工具参考

AI 可通过 Function Calling 自主调用以下 12 个工具。工具描述会自动发送给 AI，AI 根据用户意图决定调用哪个工具。

### 移动

| 工具名 | 参数 | 说明 | 超时 |
|--------|------|------|------|
| `moveTo` | `x, y, z` (number) | 使用 A* 算法寻路移动到指定坐标 | 30 秒 |

### 通信

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `sendChat` | `message` (string) | 在公屏发送消息 |
| `whisper` | `player` (string), `message` (string) | 私聊指定玩家（使用 /msg 命令） |

### 方块操作

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `digBlock` | `x, y, z` (number) | 挖掘指定坐标方块（需在可达范围内） |
| `placeBlock` | `x, y, z` (number), `faceX, faceY, faceZ` (number, 默认 0,1,0) | 放置方块（需手中持有方块） |

> `faceX/Y/Z` 控制放置面方向。默认 `(0,1,0)` 表示放在方块上方。`(0,-1,0)` 表示下方，`(1,0,0)` 表示东侧。

### 物品管理

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `getInventory` | — | 查看背包所有物品（名称+数量+槽位） |
| `equipItem` | `itemName` (string) | 切换到指定物品到手中（模糊匹配） |
| `collectNearbyItems` | `radius` (number, 默认 16) | 收集范围内最近的掉落物 |

### 世界感知

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `getNearbyPlayers` | `radius` (number, 默认 50) | 获取附近玩家列表（含距离） |
| `getPosition` | — | 获取当前坐标和维度 |
| `getTime` | — | 获取游戏时间、天气、生命值、饥饿值 |

### 战斗

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `attackNearestHostile` | `range` (number, 默认 5) | 攻击最近敌对生物（6 种：僵尸、骷髅、蜘蛛、苦力怕、女巫、末影人） |

### 生存

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `eatFood` | — | 自动从背包中寻找食物并食用 |
| `sleep` | — | 在附近床上睡觉（需夜晚/雷暴） |
| `fish` | — | 在附近水域钓鱼（需手持钓鱼竿） |
| `openChest` | — | 打开附近箱子查看内容（汇总统计） |
| `craftItem` | `itemName` (string), `count` (number, 默认 1) | 在工作台合成物品（需附近有工作台） |
| `smeltItem` | `itemName` (string) | 在熔炉熔炼物品（自动添加燃料） |
| `enchantItem` | — | 查看附魔台可用附魔选项 |

### 多模态（实验性）

| 工具名 | 参数 | 说明 |
|--------|------|------|
| `screenshot` | `detail` (string, 默认 low) | 截取游戏画面供 AI 视觉分析（需 `AI_VISION=true` + prismarine-viewer） |

### 工具调用流程

```
用户: "帮我挖点铁矿石"
  → AI 分析: 需要先获取位置，然后寻找铁矿
  → 调用 getPosition() → 返回 "(20, 12, -30)"
  → 调用 getNearbyPlayers({radius: 50}) → 了解周围环境
  → 调用 moveTo({x: -50, y: 12, z: 200}) → 移动到已知矿点
  → 调用 digBlock({x: -50, y: 12, z: 200}) → 挖掘铁矿
  → AI 生成回复: "我在 (-50, 12, 200) 挖到了铁矿石！"
```

---

## API 参考

### REST API 端点

#### 基础端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| `GET` | `/api/health` | 健康检查与监控报告 | 无 |
| `GET` | `/api/status` | Bot 运行状态 | 无 |
| `POST` | `/api/chat` | 发送聊天消息 | 无 |
| `GET` | `/api/history` | 获取 AI 对话历史 | 无 |

#### 代理模式

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/proxy/enable` | 开启代理模式 |
| `POST` | `/api/proxy/disable` | 关闭代理模式 |
| `POST` | `/api/proxy/command` | 发送代理指令 |

**代理指令请求体格式:**
```json
{
  "action": "move|look|dig|place|attack|use|drop|collect|chat|follow|goto",
  "params": {
    "direction": "forward|back|left|right|jump|sprint|sneak",
    "player": "玩家名",
    "x": 100, "y": 64, "z": 200
  }
}
```

#### 经验记忆

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/exp` | 查看经验内容 |
| `POST` | `/api/exp/record` | 记录经验 |

**经验记录请求体格式:**
```json
{
  "type": "player|landmark|rule|event|notes",
  "key": "名称（player/landmark 类型需要）",
  "value": "描述内容"
}
```

### WebSocket 事件

客户端通过 Socket.io 连接 `ws://localhost:3000`：

**接收事件（服务端 → 客户端）:**

| 事件 | 数据格式 | 频率 | 说明 |
|------|---------|------|------|
| `status` | `BotStatus` | 1s / 500ms(代理) | Bot 状态更新 |
| `chat` | `{username, message, timestamp}` | 实时 | 游戏聊天消息 |
| `playerJoin` | `{username, timestamp}` | 实时 | 玩家加入 |
| `playerLeave` | `{username, timestamp}` | 实时 | 玩家离开 |
| `death` | `{timestamp}` | 实时 | Bot 死亡 |
| `reconnecting` | `{attempt, maxAttempts}` | 按需 | 重连状态 |
| `proxy:result` | `{action, result}` | 按需 | 代理指令结果 |

**发送事件（客户端 → 服务端）:**

| 事件 | 数据格式 | 说明 |
|------|---------|------|
| `chat` | `string` | 发送聊天消息 |
| `proxy:enable` | — | 开启代理模式 |
| `proxy:disable` | — | 关闭代理模式 |
| `proxy:command` | `{action, params}` | 发送代理指令 |

### 状态响应示例

```json
{
  "online": true,
  "username": "AI_Cyborg",
  "health": 20,
  "food": 18,
  "position": { "x": -5.5, "y": 77.0, "z": -34.0 },
  "yaw": 1.57,
  "pitch": 0,
  "dimension": "overworld",
  "time": 6000,
  "isRaining": false,
  "players": 3,
  "entities": 45,
  "messageCount": 42,
  "proxyMode": false,
  "reconnecting": false
}
```

### 健康报告示例

```json
{
  "status": "healthy",
  "timestamp": "2026-07-21T14:30:00.000Z",
  "report": {
    "status": "healthy",
    "uptime": 3600,
    "uptimeFormatted": "1h 0m 0s",
    "idleTime": 5,
    "stats": {
      "chatCount": 120,
      "aiCallCount": 15,
      "errorCount": 0,
      "reconnectCount": 0
    },
    "config": {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "mcHost": "localhost",
      "mcPort": 25565
    },
    "lastError": null
  }
}
```

> 健康状态: `healthy`（正常）/ `degraded`（降级，错误数 > 10）/ `unhealthy`（不健康）

---

## Web Dashboard

### 面板布局

```
┌───────────┬──────────────────────┬───────────┐
│           │                      │           │
│  状态面板  │     实时聊天区        │  玩家列表  │
│  (260px)  │     (弹性宽度)        │  (220px)  │
│           │                      │           │
│  · 在线状态 │  [玩家] 你好！        │  · Steve  │
│  · 生命值   │  [Bot]  你好！        │  · Alex   │
│  · 饥饿值   │  [系统] Bot 已死亡    │           │
│  · 坐标     │                      │  代理控制  │
│  · 游戏时间 │                      │           │
│  · 天气     │                      │  [WASD]  │
│           │                      │  [交互]   │
│  SVG 图表  │  ─────────────────   │  [快捷]   │
│  · 环形图   │  输入框  [发送]       │           │
│  · 散点图   │                      │           │
│  · 柱状图   │                      │           │
└───────────┴──────────────────────┴───────────┘
```

### 状态面板

左侧面板实时显示 Bot 所有状态信息：

- **在线状态**: 绿色圆点 + 文字，重连时显示橙色 "重连中..."
- **生命值**: 红心图标 + 数值 (0-20)
- **饥饿值**: 食物图标 + 数值 (0-20)
- **坐标**: 精确到小数点后一位
- **维度**: overworld / nether / end
- **游戏时间**: 格式化为 HH:MM
- **天气**: 晴天 / 下雨 / 雷暴
- **代理模式警告**: 开启时显示黄色警告标签

**SVG 矢量图表:**
- **环形健康图**: 同心圆环表示生命值百分比，hover 显示详细数据
- **坐标散点图**: 实时追踪 Bot 位置变化，显示移动轨迹
- **统计柱状图**: 聊天数、AI 调用数、错误数对比

### 聊天区域

中央区域显示游戏内所有聊天消息：

- **玩家消息**: 左侧灰色气泡，显示玩家名和时间
- **Bot 消息**: 右侧绿色气泡，显示 Bot 名和时间
- **系统消息**: 居中斜体灰色文字（玩家加入/离开、Bot 死亡等）
- **代理操作结果**: 特殊样式显示代理指令执行结果
- **自动滚动**: 新消息自动滚动到底部
- **输入框**: 底部固定，支持 Enter 发送

### 代理控制

右侧面板底部，开启后显示：

- **WASD 移动按钮**: 4 列网格布局，mousedown 开始移动，mouseup 停止
- **跳跃/疾跑/潜行**: 与 WASD 同行显示
- **交互按钮**: 3 列网格，6 个操作按钮（挖掘/放置/攻击/使用/丢弃/收集）
- **快捷操作**: 跟随（弹窗输入玩家名）、前往（弹窗输入坐标）
- **操作结果反馈**: 底部显示最近一次操作的结果文本

---

## 部署指南

### Docker 部署

```bash
# 1. 配置环境
cp .env.example .env
# 编辑 .env 填入配置

# 2. 构建并启动
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 查看状态
docker-compose ps

# 5. 停止
docker-compose down

# 6. 更新后重新部署
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Docker 镜像结构

- **多阶段构建**: 构建阶段（安装依赖+编译）→ 生产阶段（仅保留必要文件）
- **非 root 用户**: 以 `cyborg` 用户运行，提升安全性
- **健康检查**: 每 30 秒检查 `/api/health` 端点，连续失败 3 次标记为 unhealthy
- **日志持久化**: 挂载 `./logs` 目录到宿主机
- **经验文件持久化**: 挂载 `./experience` 目录到宿主机

### Docker Compose 配置

```yaml
# docker-compose.yml 示例片段
services:
  cyborg:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./logs:/app/logs
      - ./experience:/app/experience
    environment:
      - MC_HOST=${MC_HOST}
      - AI_API_KEY=${AI_API_KEY}
    restart: unless-stopped
```

### 生产环境建议

1. **反向代理**: 使用 Nginx 或 Caddy 代理 Web 面板
   ```nginx
   # Nginx 示例
   server {
       listen 443 ssl;
       server_name cyborg.example.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **HTTPS**: 使用 Let's Encrypt 配置 SSL 证书
   ```bash
   certbot --nginx -d cyborg.example.com
   ```

3. **环境变量管理**: 使用 Docker secrets 或 `.env` 文件管理敏感信息
4. **监控**: 接入 Prometheus + Grafana 监控 `/api/health`
5. **日志轮转**: 配置 Docker 日志驱动或 Winston 内置轮转
6. **进程守护**: 使用 systemd 或 Docker `restart: unless-stopped` 确保崩溃自动重启

### 开机自启 (Linux systemd)

```ini
# /etc/systemd/system/cyborg-bot.service
[Unit]
Description=Minecraft AI Cyborg Bot
After=network.target

[Service]
Type=simple
User=cyborg
WorkingDirectory=/opt/cyborg-bot
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
EnvironmentFile=/opt/cyborg-bot/.env
StandardOutput=append:/opt/cyborg-bot/logs/stdout.log
StandardError=append:/opt/cyborg-bot/logs/stderr.log

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cyborg-bot
sudo systemctl start cyborg-bot
sudo systemctl status cyborg-bot
```

### Windows 开机自启

1. 在 `start.bat` 所在目录，右键 → 创建快捷方式
2. Win+R 输入 `shell:startup`，打开启动文件夹
3. 将快捷方式拖入启动文件夹

---

## 性能调优

### 内存优化

| 场景 | 内存占用 | 优化建议 |
|------|---------|---------|
| 单 Bot 基础运行 | ~150MB | 默认配置即可 |
| 单 Bot + AI 高频调用 | ~200MB | 降低 `AI_MAX_CONTEXT` |
| 多 Bot (3个) | ~400MB | 每个 Bot 使用 `gpt-4o-mini` |
| 长期运行 (>24h) | ~300MB+ | 设置 `LOG_LEVEL=warn`，定时重启 |

**降低内存占用:**
```env
# 减少上下文窗口
AI_MAX_CONTEXT=10

# 减少日志输出
LOG_LEVEL=warn
```

### CPU 优化

Bot 的 CPU 消耗主要来自：
1. **Mineflayer 协议处理**: 通常很低，< 5% CPU
2. **A* 寻路计算**: 长距离移动时可能短暂占用 10-20% CPU
3. **AI API 调用**: 网络 I/O 等待，不占 CPU

**优化建议:**
- 减少状态推送频率（修改 `server/index.ts` 中 `setInterval` 间隔）
- 复杂寻路时避免同时执行多个移动任务

### 网络优化

- **AI API 延迟**: 选择离服务器近的 API 区域节点
- **WebSocket 状态推送**: 默认 1 秒/次，可根据需要调整
- **Minecraft 连接**: 心跳检测间隔 30 秒，可在 `bot/index.ts` 中调整

### API 成本控制

| 模型 | 单次对话成本（估算） | 适用场景 |
|------|---------------------|---------|
| `gpt-4o-mini` | ~$0.0002 | 简单对话、AFK 挂机 |
| `gpt-4o` | ~$0.003 | 复杂交互、需要精确理解 |
| `claude-3-5-sonnet` | ~$0.003 | 长对话、角色扮演 |
| `deepseek-chat` | ~$0.0001 | 预算有限、国内服务器 |

**节约成本技巧:**
1. 使用 `gpt-4o-mini` 作为默认模型
2. 降低 `AI_MAX_CONTEXT` 减少每次请求的 token 数
3. 设置 `AI_TEMPERATURE=0` 减少不必要的重试
4. 在 Persona 中加入 "回复简洁，不超过 30 字" 减少输出 token

---

## 服务器兼容性

### 已测试的服务器类型

| 服务器类型 | 兼容性 | 备注 |
|-----------|--------|------|
| **Vanilla** (原版) | 完全兼容 | 推荐 1.20.1 |
| **PaperMC** | 完全兼容 | 推荐，性能好 |
| **Spigot** | 完全兼容 | 推荐 |
| **Purpur** | 完全兼容 | Paper 分支 |
| **Fabric** | 兼容 | 需要确保无反作弊插件 |
| **Forge** | 兼容 | 需要确保无反作弊 mod |
| **Bukkit** | 兼容 | 旧版服务器 |

### 版本支持

- **完全支持**: 1.18 - 1.21（Mineflayer 官方测试版本）
- **良好支持**: 1.12 - 1.17
- **基础支持**: 1.8 - 1.11（部分新特性不可用）

### 离线模式 vs 在线模式

| 模式 | 支持 | 说明 |
|------|------|------|
| **离线模式** (`online-mode=false`) | 原生支持 | 直接用 `MC_USERNAME` 登录 |
| **在线模式** (`online-mode=true`) | 需要正版账号 | 需要配置 Microsoft 认证 |

> 在线模式需要额外配置 Microsoft OAuth，建议测试环境使用离线模式。

### 反作弊兼容性

大多数反作弊插件会检测 Bot 行为，可能导致被踢出或封禁。建议：

1. **使用前确认服务器允许 Bot**
2. **避免过于机械的行为**: 使用 Persona 让 Bot 行为更自然
3. **控制操作频率**: 速率限制已内置，但可进一步降低
4. **白名单服务器**: 优先在使用白名单的私人服务器上运行

---

## 开发指南

### 项目结构

```
赛博人/
├── src/
│   ├── ai/                       # AI 接口层
│   │   ├── types.ts              # 类型定义 (AIProvider, ChatMessage, BotTool, AIResponse)
│   │   ├── provider.ts           # AI 提供商 (OpenAIProvider, ClaudeProvider, CustomProvider)
│   │   ├── conversation.ts       # 对话管理器 (上下文管理 + 工具调用循环 + 经验注入)
│   │   └── index.ts              # 统一导出
│   ├── bot/                      # Bot 核心
│   │   ├── index.ts              # CyborgBot 主类 (Mineflayer 连接 + 事件处理 + 重连 + 代理)
│   │   ├── tools.ts              # 12 个 AI Function Calling 工具定义
│   │   └── commands.ts           # 8 个玩家命令系统 (!help, !status, !come, ...)
│   ├── server/                   # Web 服务层
│   │   └── index.ts              # Express + Socket.io 服务器 + REST API + WebSocket 路由
│   ├── config/                   # 配置管理
│   │   └── index.ts              # Zod Schema 校验 + 环境变量加载 + 单例模式
│   ├── utils/                    # 工具库
│   │   ├── logger.ts             # Winston 结构化日志 (文件 + 控制台)
│   │   ├── rateLimiter.ts        # 滑动窗口速率限制器 (4条/10秒)
│   │   ├── healthMonitor.ts      # 健康监控指标 (运行时间/聊天数/AI调用/错误/重连)
│   │   └── experienceMemory.ts   # AI 经验记忆 (Markdown 解析/生成/注入)
│   ├── index.ts                  # 主入口 (启动 Bot + 启动 Web 服务器 + 优雅关闭)
│   └── test-bots.ts              # 双 Bot 自动化测试脚本
├── frontend/                     # React 前端
│   ├── src/
│   │   ├── App.tsx               # 主应用 (WebSocket 连接管理 + 状态同步 + 布局)
│   │   ├── index.css             # 暗色主题全局样式 (CSS 变量 + 3 栏布局)
│   │   └── components/
│   │       ├── StatusPanel.tsx    # 状态面板 (在线/生命/坐标/时间 + SVG 环形图)
│   │       ├── ChatArea.tsx       # 聊天区域 (消息气泡 + 输入框 + 自动滚动)
│   │       ├── PlayerList.tsx     # 玩家列表 (在线玩家 + Bot 工具图标展示)
│   │       ├── SVGCharts.tsx      # SVG 矢量图表 (环形健康图 + 坐标散点图 + 统计柱状图)
│   │       └── ProxyControl.tsx   # 真人代理操控面板 (WASD + 交互 + 快捷操作)
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
├── experience/                   # AI 经验记忆文件 (自动生成，格式: <host>_<port>.md)
├── logs/                         # 日志文件 (Winston 自动创建)
├── dist/                         # 编译输出 (TypeScript → JavaScript)
├── Dockerfile                    # 多阶段 Docker 构建 (构建阶段 + 生产阶段)
├── docker-compose.yml            # Docker 编排 (bot + 日志持久化)
├── start.bat                     # Windows 一键启动脚本
├── .env.example                  # 环境变量模板
├── .env                          # 实际配置 (不提交到 Git)
├── tsconfig.json                 # TypeScript 配置 (ES2020, CommonJS)
└── package.json                  # npm 依赖与脚本
```

### 添加新的 AI 工具

在 `src/bot/tools.ts` 中 `createBotTools` 函数返回数组添加新工具：

```typescript
{
  name: 'myNewTool',                    // 工具名（AI 调用时使用）
  description: '工具的详细描述，AI 根据此描述决定何时调用。描述越清晰，AI 调用越准确。',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: '参数1的说明，AI 根据此描述传参' },
      param2: { type: 'number', description: '参数2的说明' },
    },
    required: ['param1'],               // 必填参数列表
  },
  execute: async (args) => {
    const { param1, param2 } = args as { param1: string; param2: number };
    const botAny = bot as any;

    // 执行你的工具逻辑
    // 使用 botAny 访问 Mineflayer Bot 实例

    return `执行结果描述，会作为 AI 的上下文`;
  },
}
```

**工具编写最佳实践:**
1. **描述清晰**: AI 依赖描述决定何时调用，越详细越好
2. **错误处理**: 工具内应处理异常情况，返回友好的错误描述
3. **超时控制**: 长时间操作（如移动）应设置超时
4. **返回值**: 返回的字符串会成为 AI 的上下文，应包含足够信息

### 添加新的玩家命令

在 `src/bot/commands.ts` 中 `register()` 调用：

```typescript
register({
  name: 'mycommand',              // 命令名（玩家输入 !mycommand）
  aliases: ['mc', 'mycmd'],       // 别名
  description: '我的命令说明',
  usage: '!mycommand <参数>',
  handler: async (bot, args, conversation, playerName) => {
    // args: 命令参数数组
    // conversation: AI 对话管理器
    // playerName: 发送命令的玩家名

    // 处理命令逻辑
    return '回复给玩家的消息（支持 Minecraft 颜色代码 §a §6 等）';
  },
});
```

### 添加新的 AI 提供商

在 `src/ai/provider.ts` 中：

```typescript
// 1. 创建新类
export class MyProvider extends OpenAIProvider {
  readonly name = 'myprovider';
  readonly models = ['my-model-1', 'my-model-2'];

  // 如 API 格式与 OpenAI 不同，覆盖 chat 方法
  // async chat(messages: ChatMessage[], tools?: BotTool[]): Promise<AIResponse> {
  //   // 自定义实现
  // }
}

// 2. 在 createAIProvider 函数中添加 case
function createAIProvider(): AIProvider {
  switch (config.ai.provider) {
    case 'myprovider':
      return new MyProvider(config);
    // ...
  }
}

// 3. 在 config/index.ts 的 Zod Schema 中添加 'myprovider'
provider: z.enum(['openai', 'claude', 'custom', 'myprovider'])
```

### 调试

```bash
# 开启 debug 日志（查看所有 AI 请求详情和工具调用）
LOG_LEVEL=debug npm start

# 单独运行测试（不启动 Web 面板）
npm run test:bots

# TypeScript 类型检查（不编译）
npx tsc --noEmit

# 前端开发模式（热更新）
cd frontend && npm run dev

# 查看运行日志
# Windows:
type logs\bot.log
# Linux/Mac:
tail -f logs/bot.log
```

---

## 测试指南

### 搭建测试服务器

1. **下载 PaperMC** (推荐，性能好):
   ```bash
   # 在测试服务器目录
   # 下载 Paper 1.20.1
   ```

2. **配置 `server.properties`:**
   ```properties
   online-mode=false       # 离线模式，允许非正版登录
   spawn-protection=0      # 关闭出生点保护
   difficulty=easy         # 简单难度
   max-players=20
   ```

3. **接受 EULA:**
   ```bash
   echo "eula=true" > eula.txt
   ```

4. **启动服务器:**
   ```bash
   java -Xmx2G -jar paper-1.20.1.jar nogui
   ```

### 运行测试

```bash
# 启动测试（自动启动 2 个 Bot 并运行全套测试）
npm run test:bots
```

**测试覆盖内容:**
1. **连接测试**: 2 个 Bot 同时连接服务器
2. **聊天测试**: Bot 之间互相发送消息
3. **PVP 测试**: Bot 之间进行战斗
4. **移动测试**: Bot 执行寻路移动
5. **物品测试**: Bot 查看背包、切换物品
6. **世界感知**: 获取时间、天气、玩家列表
7. **命令测试**: 玩家命令系统
8. **经验记忆**: 验证 exp.md 文件生成
9. **重连测试**: 模拟断线重连
10. **代理模式**: 测试 Web 操控

### 手动测试

```bash
# 1. 启动测试服务器
cd "测试服务器/1.20.1"
java -Xmx2G -jar paper-1.20.1.jar nogui

# 2. 在另一个终端启动 Bot
npm start

# 3. 打开 Minecraft 客户端，连接 localhost:25565
# 4. 在游戏中测试：
#    - @AI_Cyborg 你好
#    - !help
#    - !status
#    - !come

# 5. 打开浏览器 http://localhost:3000 查看 Dashboard
```

---

## 故障排除

### Bot 无法连接服务器

1. **检查服务器是否在线**: 用 Minecraft 客户端测试连接
2. **检查 `online-mode`**: 如果服务器是离线模式（`online-mode=false`），Bot 可以直接连接；如果是在线模式，需要正版账号
3. **检查防火墙**: 确保 25565 端口未被防火墙阻止
4. **检查用户名**: Minecraft 用户名只能包含英文、数字、下划线，3-16 位
5. **检查版本匹配**: `MC_VERSION` 必须与服务器版本一致
6. **查看详细错误**: 设置 `LOG_LEVEL=debug` 查看连接过程

### Bot 频繁掉线

1. **检查网络稳定性**: 不稳定的网络连接会导致频繁掉线
2. **检查服务器配置**: 有些服务器有 AFK 踢出机制，Bot 需要定时移动
3. **查看日志**: `logs/bot.log` 中查看具体断开原因
4. **自动重连**: Bot 已内置自动重连（指数退避，最多 20 次），无需手动干预
5. **检查心跳**: 如果网络延迟高，可在 `bot/index.ts` 中增加 `checkTimeoutInterval`

### AI 不回复

1. **检查 API Key**: 确保 `.env` 中 `AI_API_KEY` 正确且未过期
2. **检查网络**: 能否访问 API 地址（如 `api.openai.com`）
3. **检查 API 余额**: 确保 API 账户有足够余额
4. **查看日志**: `LOG_LEVEL=debug` 会显示 AI 请求详情和响应
5. **检查触发条件**: Bot 只在被 @提及、叫名字、含关键词时才回复
6. **检查代理模式**: 代理模式开启时 AI 自动回复暂停

### 前端无法连接

1. **确认后端已启动**: 后端服务必须先启动
2. **检查端口**: 确认 `WEB_PORT=3000` 未被占用
3. **检查 CORS**: 如果从其他域名访问，需要配置 CORS
4. **浏览器控制台**: 按 F12 查看 WebSocket 连接状态和错误
5. **确认前端已构建**: 运行 `cd frontend && npm run build`

### 聊天消息发送失败

1. **速率限制**: 4条/10秒限制，发送太快会被拦截（日志会显示警告）
2. **消息过长**: 超过 200 字符自动拆分，拆分后间隔 800ms 发送
3. **服务器限制**: 有些服务器有聊天频率限制，可能需要降低速率
4. **服务器屏蔽**: 某些服务器会屏蔽 Bot 的聊天消息

### 寻路/移动失败

1. **目标不可达**: A* 算法无法找到路径（如目标在空中、被包围）
2. **移动超时**: 30 秒超时，远距离移动可能超时
3. **被卡住**: Bot 可能被方块或实体卡住
4. **解决方案**: 使用 `!stop` 停止当前移动，然后重新下达指令

### 性能问题

1. **降低状态推送频率**: 在 `server/index.ts` 中修改 `setInterval` 间隔
2. **减少 AI 模型**: 使用 `gpt-4o-mini` 替代 `gpt-4o`
3. **限制上下文轮数**: 减小 `AI_MAX_CONTEXT` 值
4. **日志级别**: 设置 `LOG_LEVEL=warn` 减少日志输出
5. **定时重启**: 长期运行后内存可能增长，建议使用 systemd 或 Docker 定时重启

---

## FAQ

### 一般问题

**Q: 赛博人是什么？**
A: 赛博人是一个基于 Mineflayer 的 Minecraft AI 机器人。它连接到你的 Minecraft 服务器，像一个真实玩家一样活动。它可以通过 AI API 与玩家自然对话，还能执行移动、挖掘、战斗等操作。

**Q: 需要正版 Minecraft 账号吗？**
A: 如果服务器是离线模式（`online-mode=false`），不需要。如果是在线模式，需要正版账号进行 Microsoft 认证。

**Q: 赛博人会被服务器封禁吗？**
A: 已内置多重防护：智能拆分长消息 + 4条/10秒速率限制 + 指数退避重连。但在有反作弊插件的服务器上，Bot 仍可能被检测。建议在允许 Bot 的服务器上使用。

**Q: 支持哪些 Minecraft 版本？**
A: 1.8 - 1.21。Mineflayer 官方测试版本为 1.18-1.21，其他版本可能部分功能不可用。

### AI 和功能

**Q: 必须使用 OpenAI 吗？可以用国内的 AI 吗？**
A: 不一定。支持三种模式：`openai`（OpenAI 官方）、`claude`（Anthropic Claude）、`custom`（任何兼容 OpenAI Chat Completions 格式的 API，如 DeepSeek、通义千问、智谱 GLM 等）。

**Q: AI 会自动做所有事情吗？**
A: AI 会根据玩家的话决定做什么。它不会主动乱跑或破坏。如果玩家说"帮我挖石头"，AI 会调用挖掘工具。如果玩家只是聊天，AI 就只聊天。

**Q: AI 会记住之前说过的话吗？**
A: 会。通过滑动窗口上下文管理，默认记住最近 20 轮对话。可以通过 `AI_MAX_CONTEXT` 调整。另外，经验记忆文件（`exp.md`）会永久存储服务器信息。

**Q: 真人代理模式是什么？**
A: 一种不需要 Minecraft 客户端就能玩服务器的模式。开启后，你可以在 Web Dashboard 上用 WASD 按钮操控 Bot 移动、挖掘、攻击等。此时 AI 自动回复会暂停。

**Q: 可以同时运行多个赛博人吗？**
A: 可以。每个 Bot 需要不同的用户名和 Web 面板端口。参考 [多 Bot 运行](#多-bot-运行) 章节。

### 部署和运维

**Q: 赛博人消耗多少资源？**
A: 单 Bot 基础运行约 150MB 内存，低 CPU 占用。AI API 调用消耗取决于使用频率和模型选择。

**Q: 如何让赛博人 24 小时在线？**
A: 使用 Docker 部署（`docker-compose up -d`）或 Linux systemd 服务。Bot 内置自动重连，服务器重启后会自动恢复。

**Q: 日志文件会越来越大吗？**
A: Winston 默认会写入 `logs/bot.log`。建议设置 `LOG_LEVEL=warn` 减少日志量，或使用日志轮转工具。

**Q: 如何更新赛博人？**
A: 拉取最新代码 → 重新安装依赖 → 重新构建 → 重启。
```bash
git pull
npm install --legacy-peer-deps
cd frontend && npm install && npm run build && cd ..
npm run build
# 重启服务
```

### 安全

**Q: API Key 安全吗？**
A: API Key 存储在 `.env` 文件中，该文件不应提交到 Git。`.env.example` 是模板文件，不含真实 Key。生产环境建议使用环境变量或 Docker secrets。

**Q: Web Dashboard 可以公开访问吗？**
A: 默认绑定 `localhost`，仅本机访问。如需远程访问，设置 `WEB_HOST=0.0.0.0`，但必须配合反向代理和 HTTPS，并设置访问控制。

**Q: Bot 会执行危险操作吗？**
A: Bot 根据 AI 的决策执行操作。如果 AI 被恶意提示词操控，可能会执行不当操作。建议在信任的服务器上使用，并设置合理的 Persona 限制 Bot 行为。

---

## 安全注意事项

### API Key 安全

- 永远不要将 `.env` 文件提交到 Git（已在 `.gitignore` 中排除）
- 使用环境变量或 Docker secrets 管理敏感信息
- 定期轮换 API Key
- 为 API Key 设置使用限额，防止意外超支

### 网络安全

- 生产环境使用 HTTPS 反向代理（Nginx + Let's Encrypt）
- 限制 Web Dashboard 访问 IP（如仅内网访问）
- 不要在公网直接暴露 3000 端口
- 使用防火墙限制入站连接

### Bot 行为安全

- Bot 会执行 AI 建议的任何操作，确保 AI 不会被恶意提示词操控
- 在信任的服务器上使用，避免被利用进行破坏
- 速率限制已内置（4条/10秒），但建议根据服务器规则调整
- 设置合理的 Persona 限制 Bot 行为范围

### 服务器合规

- 使用 Bot 前确认服务器允许机器人
- 遵守服务器规则，避免被 Ban
- 离线模式服务器通常对 Bot 更友好
- 在 PVP 服务器上使用 Bot 前，确认规则允许

### 速率限制详情

内置的速率限制器使用滑动窗口算法：

```
窗口大小: 10 秒
最大请求: 4 条消息

时间线:
0s    → 发送消息 1 ✓
2s    → 发送消息 2 ✓
4s    → 发送消息 3 ✓
6s    → 发送消息 4 ✓
8s    → 发送消息 5 ✗ (被限速)
10s   → 发送消息 5 ✓ (窗口滑过，消息1过期)
```

长消息自动拆分后，每片段间隔 800ms 发送，避免触发速率限制。

---

## 速查卡

### 环境变量速查

```env
# 必填
MC_HOST=localhost              # 服务器地址
MC_USERNAME=AI_Cyborg          # Bot 名字 (3-16位英文)
AI_API_KEY=sk-xxx              # AI API 密钥

# 常用
AI_MODEL=gpt-4o-mini           # AI 模型
MC_VERSION=1.20.1              # 游戏版本
AI_PROVIDER=openai             # openai|claude|custom
WEB_PORT=3000                  # 面板端口

# 进阶
AI_MAX_CONTEXT=20              # 上下文轮数 (5-50)
AI_TEMPERATURE=0.7             # 创造力 (0-2)
LOG_LEVEL=info                 # debug|info|warn|error
```

### 命令速查

```
!help [命令]    查看帮助
!status         查看 Bot 状态
!come           让 Bot 来你身边
!give <物品>    给 Bot 手中的物品
!list           在线玩家列表
!collect        收集附近掉落物
!stop           停止移动
!reset          重置 AI 记忆
```

### API 速查

```bash
# 状态
curl http://localhost:3000/api/status
curl http://localhost:3000/api/health

# 聊天
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d '{"message":"你好"}'

# 代理
curl -X POST http://localhost:3000/api/proxy/enable
curl -X POST http://localhost:3000/api/proxy/command -H "Content-Type: application/json" -d '{"action":"move","params":{"direction":"forward"}}'

# 记忆
curl http://localhost:3000/api/exp
curl -X POST http://localhost:3000/api/exp/record -H "Content-Type: application/json" -d '{"type":"landmark","key":"家","value":"坐标 (0,64,0)"}'
```

### 目录速查

```
赛博人/
├── src/ai/           AI 接口（对话/工具/提供商）
├── src/bot/          Bot 核心（连接/命令/工具）
├── src/server/       Web 服务（API/WebSocket）
├── src/config/       配置（Zod 校验）
├── src/utils/        工具（日志/限速/监控/记忆）
├── frontend/         React 面板
├── experience/       经验记忆文件
├── logs/             日志文件
├── .env              配置文件
└── start.bat         一键启动
```

---

## 技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| **Bot 核心** | [Mineflayer](https://github.com/PrismarineJS/mineflayer) | ^4.37 | Minecraft 协议实现 |
| | [mineflayer-pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder) | ^2.4 | A* 寻路算法 |
| | [mineflayer-pvp](https://github.com/PrismarineJS/mineflayer-pvp) | ^1.3 | PVP 战斗系统 |
| | [mineflayer-collectblock](https://github.com/PrismarineJS/mineflayer-collectblock) | ^1.6 | 方块收集 |
| **AI** | OpenAI API / Claude API | — | 大语言模型 |
| | [openai](https://github.com/openai/openai-node) | ^6.48 | OpenAI SDK |
| | Function Calling | — | 工具调用 |
| **后端** | [Node.js](https://nodejs.org/) | 18+ | 运行时 |
| | [TypeScript](https://www.typescriptlang.org/) | ^5.5 | 类型安全 |
| | [Express](https://expressjs.com/) | ^5.2 | HTTP 服务 |
| | [Socket.io](https://socket.io/) | ^4.8 | WebSocket 实时通信 |
| | [Winston](https://github.com/winstonjs/winston) | ^3.19 | 日志系统 |
| | [Zod](https://zod.dev/) | ^3.23 | 配置验证 |
| | [dotenv](https://github.com/motdotla/dotenv) | ^17.4 | 环境变量加载 |
| **前端** | [React](https://react.dev/) | 18 | UI 框架 |
| | [Vite](https://vitejs.dev/) | 5 | 构建工具 |
| | [Socket.io Client](https://socket.io/) | ^4.8 | WebSocket 客户端 |
| | SVG | — | 矢量图表 |
| **部署** | [Docker](https://www.docker.com/) | — | 容器化 |
| | [Docker Compose](https://docs.docker.com/compose/) | — | 服务编排 |

---

## 更新日志

### v1.0.2 (2026-07-21)

**上下文优化 + 正版兼容 + AI更多操作 + 多模态（实验性）**

- **上下文优化**: 新增 Token 估算器（中英文混合）+ 智能摘要压缩（超预算时自动合并历史对话）
- **上下文优化**: 新增 `AI_MAX_TOKENS` 配置项（默认 8000），控制 token 预算
- **正版兼容**: 新增 `MC_AUTH` 配置项（`offline` / `microsoft`），支持 Microsoft OAuth 认证
- **AI更多操作**: 新增 7 个工具 — `eatFood`（进食）、`sleep`（睡觉）、`fish`（钓鱼）、`openChest`（查看箱子）、`craftItem`（工作台合成）、`smeltItem`（熔炉熔炼）、`enchantItem`（附魔台查看）
- **多模态（实验性）**: 新增 `screenshot` 工具 + `AI_VISION` / `AI_VISION_MODEL` 配置，支持视觉模型分析游戏截图
- **多模态（实验性）**: ChatMessage 支持 `image_url` 内容类型，OpenAIProvider 自动检测视觉内容并切换模型
- **依赖**: `prismarine-viewer` 和 `canvas` 移至 `optionalDependencies`（仅多模态需要）

### v1.0.1 (2026-07-21)

**Bug 修复 + 代码质量优化**

- 修复代理模式下 AI 仍会回复消息的 bug（`handleChatMessage` 现检查 `proxyMode`）
- Claude API 提供商重写：从 OpenAI 兼容格式改为原生 Anthropic Messages API（支持 `x-api-key` 认证、`system` 分离、`tool_use` 格式）
- `/api/health` 响应格式扁平化，移除冗余嵌套
- 新增 `/api/version` 端点（返回版本号、Node 版本、运行时间）
- 前端 WebSocket URL 从硬编码 `localhost:3000` 改为相对路径 `io()`
- 移除未使用的 `prismarine-viewer` 依赖
- `experience/` 目录加入 `.gitignore`
- 更新模型列表：Claude 新增 `claude-3-5-sonnet-20241022` 和 `claude-3-5-haiku-20241022`

### v1.0.0 (2026-07-21)

**初始版本**

- Mineflayer Bot 核心（连接、事件、插件）
- 12 个 AI Function Calling 工具（移动、聊天、挖掘、放置、物品管理、世界感知、战斗）
- 8 个玩家命令系统（!help, !status, !come, !give, !list, !collect, !stop, !reset）
- OpenAI / Claude / Custom 三种 AI 提供商
- 对话上下文管理（滑动窗口 + 可配置轮数）
- React + Vite Web Dashboard（状态面板、聊天区、玩家列表、SVG 图表）
- 真人代理模式（WASD + 6 交互 + 跟随/前往）
- 自动重连（指数退避，最多 20 次）
- 聊天安全（智能拆分 + 4条/10秒速率限制）
- AI 经验记忆（每服务器独立 exp.md）
- 健康监控（运行时间、聊天数、AI 调用数、错误数、重连次数）
- Winston 结构化日志（文件 + 控制台）
- Zod 配置校验
- Docker 多阶段构建 + Docker Compose
- 双 Bot 自动化测试脚本

---

## 贡献

欢迎提交 Issue 和 Pull Request。

### 开发流程

```bash
# 1. Fork 并克隆
git clone <your-fork-url>

# 2. 安装依赖
npm install --legacy-peer-deps
cd frontend && npm install && cd ..

# 3. 开发模式
# 后端 TypeScript watch
npx tsc --watch

# 前端开发服务器（热更新，端口 5173）
cd frontend && npm run dev

# 4. 测试
npm run test:bots

# 5. 提交前检查
npm run build                       # 后端编译
cd frontend && npm run build && cd ..  # 前端编译
npx tsc --noEmit                    # 类型检查
```

### 代码风格

- TypeScript 严格模式
- 使用 `const botAny = bot as any` 访问 Mineflayer 插件属性
- 日志使用 Winston，通过 `getLogger()` 获取
- 配置使用 `getConfig()` 获取，不要直接读 `process.env`
- 新工具添加到 `tools.ts`，新命令添加到 `commands.ts`

### 提交规范

使用 Conventional Commits 格式：
```
feat: 添加新功能
fix: 修复 Bug
docs: 文档更新
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

---

## 许可证

MIT

---

<p align="center">
  <sub>Built with Mineflayer, TypeScript, and AI</sub>
</p>