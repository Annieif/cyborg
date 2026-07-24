# 我的世界AI赛博人 — 任务计划

## 目标
构建生产级质量的 Minecraft AI 赛博人工具。核心为 Mineflayer，接入外部 AI API，可与玩家聊天、与世界交互。

## 阶段状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段1-6: 初始开发 | ✅ complete | 项目初始化 → 全部功能 |
| 阶段7: v1.0.1 优化 | ✅ complete | Bug 修复 + 代码质量 |
| 阶段8: v1.0.2 | ✅ complete | 上下文优化 + 正版兼容 + AI更多操作 + 多模态 |
| 阶段9: v1.0.3 | ✅ complete | 类人机自主模式 (硬编码+AI驱动) |
| 阶段10: v1.0.4 | ✅ complete | Ollama 本地模型支持 |
| **阶段11: CLI测试+优化** | **✅ complete** | CLI客户端 + 服务器测试 + 4Bug修复 + 3功能增强 |
| **阶段12: v1.2.0 零基础版** | **✅ complete** | Docker一键部署 + Web配置向导 + 可执行文件 + 云平台部署 + 文档重写 |
| **阶段13: v2.0.0 VPT视觉智能** | **✅ complete** | VPT视觉模型集成 + Python Bridge + 视觉自主模式 + MineRL全面集成 |

---

## 阶段13: v2.0.0 VPT视觉智能 (2026-07-24)

### 设计目标
参考 OpenAI Video-Pre-Training (VPT) 项目，为 CyborgBot 集成视觉理解能力，实现基于视觉的自主行为模式。

### 架构设计
```
┌─────────────┐   HTTP/WS   ┌──────────────────┐
│  CyborgBot  │◄───────────►│  Python VPT      │
│  (Node.js)  │  截图/动作   │  Bridge Service  │
│  Mineflayer │             │  (PyTorch)       │
└──────┬──────┘             └──────────────────┘
       │                            │
       ▼                            ▼
  prismarine-viewer          VPT Model Weights
  (headless 截图)            (.model + .weights)
```

### 功能清单
| # | 功能 | 优先级 | 涉及文件 |
|---|------|--------|---------|
| 1 | Python VPT Bridge 服务 | 🔴 High | `vpt/bridge_server.py`, `vpt/vpt_agent.py`, `vpt/requirements.txt` |
| 2 | VPT 动作映射器 (TS) | 🔴 High | `src/vpt/actionMapper.ts` |
| 3 | VPT 客户端 (TS) | 🔴 High | `src/vpt/client.ts` |
| 4 | 视觉状态捕获增强 | 🟡 Medium | `src/bot/index.ts`, `src/bot/tools.ts` |
| 5 | VPT 视觉自主模式 | 🔴 High | `src/vpt/visualAutonomous.ts` |
| 6 | 配置与启动脚本 | 🟡 Medium | `.env.example`, `src/config/index.ts`, `scripts/start-vpt-bridge.bat` |
| 7 | MineRL 动作空间定义 | 🔴 High | `vpt/minerl_actions.py` |
| 8 | MineRL 环境测试工具 | 🔴 High | `vpt/minerl_runner.py` |
| 9 | MineRL 数据集工具 | 🟡 Medium | `vpt/minerl_data.py` |
| 10 | VPT+MineRL 增强 Agent | 🔴 High | `vpt/vpt_agent.py` (VPTMineRLAgent) |
| 11 | Bridge 增强 (Benchmark端点) | 🟡 Medium | `vpt/bridge_server.py` |
| 12 | MineRL 基准测试与评估 | 🔴 High | `vpt/minerl_benchmark.py` |
| 13 | 编译验证与发布 | 🔴 High | 版本号、编译、Release |

### 操作步骤
- [x] **VPT Bridge**: 创建 Python 服务，加载 VPT 模型，提供 `/api/vpt/act` 端点
- [x] **VPT Bridge**: 实现 CameraHierarchicalMapping 动作映射
- [x] **VPT Bridge**: 实现 ActionTransformer 相机量化
- [x] **VPT ActionMapper (TS)**: 将 VPT 输出动作映射到 Mineflayer API
- [x] **VPT Client (TS)**: 通过 HTTP 与 Python Bridge 通信
- [x] **VPT Client (TS)**: 发送截图 base64，接收动作预测
- [x] **视觉捕获**: 完善 prismarine-viewer headless 截图
- [x] **VPT 视觉自主模式**: 定时截图 → VPT 推理 → 执行动作
- [x] **VPT 视觉自主模式**: 与现有 AI 对话模式共存
- [x] **配置**: 新增 VPT_BRIDGE_URL, VPT_ENABLED, VPT_MODEL_PATH 配置项
- [x] **启动脚本**: scripts/start-vpt-bridge.bat (Windows)
- [x] **MineRL 动作空间**: vpt/minerl_actions.py — 完整键盘/鼠标/相机映射 + 验证
- [x] **MineRL 环境测试**: vpt/minerl_runner.py — 离线 VPT 模型测试
- [x] **MineRL 数据集**: vpt/minerl_data.py — 下载/检查/列出数据集
- [x] **VPTMineRLAgent**: vpt_agent.py — 增强版 Agent 支持 MineRL 环境
- [x] **Bridge 增强**: 新增 /api/vpt/minerl/actions, /tasks, /validate 端点
- [x] **TS 动作映射增强**: 引用 MINERL_MINEFLAYER_MAP 和 CAMERA_SCALER
- [x] **编译验证**: 前后端 TypeScript 0 errors
- [x] **MineRL 基准测试**: 竞赛标准评估 (EpisodeMetrics, TaskBenchmark, 基线对比, 环境验证, JSON报告)
- [x] **Bridge 基准端点**: /api/vpt/minerl/benchmark/baselines, /status, /validate
- [x] **Release**: v2.0.0 版本发布

---

## 阶段12: v1.2.0 零基础版 (2026-07-22)

### 设计目标
让零基础、无编程环境的用户也能一键部署并使用 Minecraft AI 赛博人。

### 功能清单
| # | 功能 | 优先级 | 涉及文件 |
|---|------|--------|---------|
| 1 | Docker 一键部署增强 | 🔴 High | `docker-compose.yml`, `Dockerfile`, `.dockerignore` |
| 2 | Web 配置向导 (5步引导) | 🔴 High | `frontend/src/components/SetupWizard.tsx`, `SetupWizard.css`, `App.tsx` |
| 3 | 后端配置保存 API | 🔴 High | `src/server/index.ts` |
| 4 | 云平台一键部署模板 | 🟡 Medium | `deploy/railway.json`, `deploy/render.yaml` |
| 5 | 文档重写 (零基础) | 🟡 Medium | `QUICKSTART.md`, `README.md` |
| 6 | 可执行文件打包 | 🔴 High | `scripts/`, `.github/workflows/`, `src/server/index.ts`, `src/frontendAssets.ts` |
| 7 | 版本更新 | 🟢 Low | `package.json`, `.env.example` |

### 操作步骤
- [x] Docker: docker-compose.yml 内置所有默认值
- [x] Docker: Dockerfile 升级到 Node 20 + experience 目录
- [x] Docker: 创建 .dockerignore
- [x] Wizard: 创建 SetupWizard.tsx 组件 (5步引导)
- [x] Wizard: 创建 SetupWizard.css 样式
- [x] Wizard: App.tsx 集成首次运行检测
- [x] API: 新增 /api/config/check 端点
- [x] API: 新增 /api/config/save 端点 (写入 .env)
- [x] Cloud: 创建 deploy/railway.json
- [x] Cloud: 创建 deploy/render.yaml
- [x] Docs: 创建 QUICKSTART.md (3步快速开始)
- [x] Docs: 重写 README 开头
- [x] Binary: 创建 scripts/bundle-assets.js (前端资源打包)
- [x] Binary: 创建 src/frontendAssets.ts (开发模式 fallback)
- [x] Binary: 修改 src/server/index.ts (内存静态文件服务)
- [x] Binary: 创建 scripts/build-binary.sh / .ps1 (构建脚本)
- [x] Binary: 创建 .github/workflows/release-binaries.yml (CI 自动构建)
- [x] Build: 编译验证 (前后端 0 errors)
- [x] Docker: 构建验证
- [x] Binary: 构建验证 (bun build --compile)
- [x] Release: 更新版本号 + 推送

---

## 阶段8: v1.0.2

### 功能清单

- [ ] ctx: 对话摘要 (超过阈值时自动合并历史消息为摘要)
- [ ] ctx: Token估算器 (中英文混合估算)
- [ ] ctx: 新增 AI_MAX_TOKENS 配置项
- [ ] auth: MC_AUTH 配置项 (offline/microsoft)
- [ ] auth: Microsoft OAuth 认证实现
- [ ] tools: craftItem (合成台合成)
- [ ] tools: smeltItem (熔炉熔炼)
- [ ] tools: eatFood (自动进食)
- [ ] tools: sleep (睡觉)
- [ ] tools: fish (钓鱼)
- [ ] tools: openChest (查看箱子)
- [ ] tools: enchantItem (附魔台)
- [ ] vision: ChatMessage 支持 image_url 内容类型
- [ ] vision: OpenAIProvider 支持 vision 请求
- [ ] vision: screenshot 工具 (截图+AI分析)
- [ ] vision: AI_VISION / AI_VISION_MODEL 配置项
- [ ] build: 编译验证
- [ ] release: 更新版本号 + README + 推送 + Release

## 阶段11: CLI测试+优化 (2026-07-22)

### 功能清单

| # | 功能 | 优先级 | 涉及文件 |
|---|------|--------|---------|
| 1 | CLI交互式客户端 (Socket.io) | 🔴 High | `cli-client.mjs` |
| 2 | Subagent 服务器探索测试 | 🔴 High | `optimization_findings.md` |
| 3 | Bug修复: chatCount 统计 | 🔴 High | `src/bot/index.ts` |
| 4 | Bug修复: idleTime 跟踪 | 🔴 High | `src/utils/healthMonitor.ts`, `src/bot/index.ts` |
| 5 | Bug修复: 代理移动延长 | 🟡 Medium | `src/bot/index.ts` |
| 6 | 服务器元数据自动检测 | 🟡 Medium | `src/bot/index.ts` |
| 7 | 聊天消息记录到经验记忆 | 🟡 Medium | `src/bot/index.ts`, `src/utils/experienceMemory.ts` |
| 8 | 出生点自动记录 | 🟢 Low | `src/bot/index.ts` |

### 操作步骤

- [x] CLI: 创建 cli-client.mjs (Socket.io + readline 交互)
- [x] CLI: 支持 /help /status /say /proxy /move /look /dig /attack /use /goto /health /exp /version
- [x] Test: Subagent 连接 127.0.0.1:25568 测试所有 API 端点
- [x] Test: 探索服务器，记录 4 个 Bug + 5 个缺失功能
- [x] Fix: safeChat() 中调用 health.recordChat()
- [x] Fix: BotStatus 增加 chatCount 字段
- [x] Fix: HealthMonitor 增加 recordActivity() 方法
- [x] Fix: executeProxyCommand 调用 recordActivity()
- [x] Fix: 代理 move 持续时间 500ms → 2000ms
- [x] Feat: spawn 时自动检测服务器元数据 (version/gameMode)
- [x] Feat: ExperienceMemory 增加 recordChatMessage() 方法
- [x] Feat: Chat 事件记录到经验记忆
- [x] Feat: 自动记录出生点地标
- [x] build: 编译验证通过 (0 errors)

## 遇到的错误

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| npm init 不支持中文目录名 | 1 | 手动创建 package.json |
| TypeScript 3.9.10 太旧 | 1 | 升级到 typescript@5.5.4 |
| zod v4 类型不兼容 | 1 | 降级到 zod@3.23.8 |
| mineflayer-pathfinder import 失败 | 1 | 改用 require() |
| mineflayer-pvp/collectblock import 失败 | 1 | 改用 require() |
| bot.maxHealth 不存在 | 1 | 使用 health/20 比例 |
| 中文用户名被拒绝 | 1 | 改为英文用户名 |
| 前端 import type 语法 | 1 | 改用 import type |
| git add -A 被 Minecraft 世界文件锁定 | 1 | 添加测试服务器到 .gitignore |
| 前端 ChatArea proxyMode prop 错误 | 1 | 移除未使用的 prop |