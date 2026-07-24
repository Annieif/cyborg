# MineRL VPT 项目 — 任务计划 (test/minerl-only 分支)

## 目标
将项目完全重写为纯 MineRL/VPT 项目，移除所有 LLM AI、Web 前端、Docker 部署等非 MineRL 内容。不再接入外部 AI。

## 新项目结构
```
minerl-vpt/                     # 项目根目录
├── vpt/                        # MineRL VPT 核心 (保持不变)
│   ├── bridge_server.py        # VPT 推理服务 (FastAPI)
│   ├── vpt_agent.py            # VPT 模型封装
│   ├── minerl_actions.py       # MineRL 动作空间
│   ├── minerl_runner.py        # MineRL 环境测试
│   ├── minerl_data.py          # MineRL 数据集工具
│   ├── minerl_benchmark.py     # MineRL 基准评估
│   └── requirements.txt        # Python 依赖
├── scripts/
│   └── start-vpt-bridge.bat    # Windows 启动脚本
├── .github/workflows/          # CI (更新)
├── .gitignore
├── LICENSE
└── README.md                   # 重写
```

## 阶段状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段1: 删除非MineRL文件 | 🔄 in_progress | 删除 src/, frontend/, Docker, deploy, docs 等 |
| 阶段2: 重写 README | ⏳ pending | 纯 MineRL VPT 项目文档 |
| 阶段3: 更新 .gitignore | ⏳ pending | 清理不需要的忽略规则 |
| 阶段4: 验证 | ⏳ pending | 确认 vpt/ 文件可独立运行 |
| 阶段5: 提交 | ⏳ pending | 提交并推送 test/minerl-only |

## 删除文件清单

### TypeScript 源码 (全部删除)
- [ ] `src/ai/conversation.ts` — LLM 对话管理
- [ ] `src/ai/provider.ts` — AI API 提供商
- [ ] `src/ai/types.ts` — AI 类型定义
- [ ] `src/bot/autonomous.ts` — AI 自主模式
- [ ] `src/bot/commands.ts` — 命令系统
- [ ] `src/bot/index.ts` — Mineflayer Bot 核心
- [ ] `src/bot/tools.ts` — AI 工具定义
- [ ] `src/config/index.ts` — 配置管理
- [ ] `src/frontendAssets.ts` — 前端资源内联
- [ ] `src/index.ts` — 入口
- [ ] `src/server/index.ts` — Web 服务器
- [ ] `src/test-bots.ts` — 测试机器人
- [ ] `src/utils/experienceMemory.ts` — 经验记忆
- [ ] `src/utils/healthMonitor.ts` — 健康监控
- [ ] `src/utils/logger.ts` — 日志
- [ ] `src/utils/rateLimiter.ts` — 限流
- [ ] `src/vpt/actionMapper.ts` — VPT 动作映射 (TS)
- [ ] `src/vpt/client.ts` — VPT 客户端 (TS)
- [ ] `src/vpt/index.ts` — 导出
- [ ] `src/vpt/visualAutonomous.ts` — VPT 自主模式 (TS)

### 前端 (全部删除)
- [ ] `frontend/` — 整个目录

### Docker & 部署
- [ ] `Dockerfile`
- [ ] `docker-compose.yml`
- [ ] `.dockerignore`
- [ ] `deploy/railway.json`
- [ ] `deploy/render.yaml`

### 文档与时旧文件
- [ ] `docs/superpowers/plans/2026-07-22-v1.2.0-zero-basics.md`
- [ ] `QUICKSTART.md`
- [ ] `optimization_findings.md`
- [ ] `findings.md`
- [ ] `progress.md`
- [ ] `task_plan.md` (本文件，重写)

### 脚本 & 配置 (旧)
- [ ] `cli-client.mjs`
- [ ] `cyborg-bot.bat`
- [ ] `start.bat`
- [ ] `package.json`
- [ ] `package-lock.json`
- [ ] `tsconfig.json`
- [ ] `.env.example`
- [ ] `scripts/build-binary.ps1`
- [ ] `scripts/build-binary.sh`
- [ ] `scripts/bundle-assets.js`

### CI/CD (更新)
- [ ] `.github/workflows/release-binaries.yml` — 删除
- [ ] `.github/workflows/upload-release-assets.yml` — 删除

## 保留文件
- [x] `vpt/bridge_server.py`
- [x] `vpt/vpt_agent.py`
- [x] `vpt/minerl_actions.py`
- [x] `vpt/minerl_runner.py`
- [x] `vpt/minerl_data.py`
- [x] `vpt/minerl_benchmark.py`
- [x] `vpt/requirements.txt`
- [x] `scripts/start-vpt-bridge.bat`
- [x] `LICENSE`
- [x] `.gitignore` (更新)

## 遇到的错误
| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| — | — | — |