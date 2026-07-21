# 我的世界AI赛博人 — 任务计划

## 目标
构建生产级质量的 Minecraft AI 赛博人工具。核心为 Mineflayer，接入外部 AI API，可与玩家聊天、与世界交互。

## 阶段状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段1: 项目初始化 | ✅ complete | 项目结构、依赖、配置 |
| 阶段2: AI 接口层 | ✅ complete | AIProvider、ConversationManager、12 个工具 |
| 阶段3: Bot 核心 | ✅ complete | Mineflayer 连接、命令系统、事件处理 |
| 阶段4: Web 服务 | ✅ complete | Express + Socket.io 服务器 |
| 阶段5: 前端 Dashboard | ✅ complete | React + SVG 矢量图表 |
| 阶段6: 增强功能 | ✅ complete | 代理模式、自动重连、聊天安全、经验记忆 |
| **阶段7: v1.0.1 优化** | **in_progress** | Bug 修复 + 代码质量 + 未使用依赖清理 |

---

## 阶段7: v1.0.1 优化

### 发现的问题

| # | 问题 | 严重性 | 文件 |
|---|------|--------|------|
| 1 | 代理模式下 AI 仍会回复消息 | 🔴 Critical | `src/bot/index.ts` |
| 2 | `/api/health` 响应格式不一致 | 🟡 Medium | `src/server/index.ts` |
| 3 | `prismarine-viewer` 依赖未使用 | 🟡 Medium | `package.json` |
| 4 | `experience/` 目录应加入 .gitignore | 🟡 Medium | `.gitignore` |
| 5 | 前端 WebSocket URL 硬编码 `localhost:3000` | 🟡 Medium | `frontend/src/App.tsx` |
| 6 | 缺少 `/api/version` 端点 | 🟢 Low | `src/server/index.ts` |
| 7 | ClaudeProvider 未实现真正的 Anthropic API | 🟡 Medium | `src/ai/provider.ts` |
| 8 | package.json version 仍是 1.0.0 | 🟢 Low | `package.json` |

### 操作步骤

- [ ] fix1: 修复代理模式下 AI 仍会回复的 bug
- [ ] fix2: 修复 /api/health 响应格式一致性
- [ ] fix3: 移除未使用的 prismarine-viewer 依赖
- [ ] fix4: experience/ 加入 .gitignore + 从 git 中移除已跟踪的 exp 文件
- [ ] fix5: 前端 WebSocket URL 改为相对路径
- [ ] fix6: 添加 /api/version 端点
- [ ] fix7: ClaudeProvider 实现真正的 Anthropic API 格式
- [ ] fix8: 更新 package.json version 到 1.0.1 + README 更新日志

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
| bot.pathfinder/pvp TypeScript 类型错误 | 1 | 使用 botAny as any |
| test-bots.ts replace_all 副作用 | 1 | 手动修正类型断言 |
| frontend tsconfig 缺少 jsx | 1 | 添加 "jsx": "react-jsx" |
| frontend import type 语法 | 1 | 改用 import type |
| AI API 网络超时 | 1 | 代码完整，需真实 API Key |
| git add -A 被 Minecraft 世界文件锁定 | 1 | 添加测试服务器到 .gitignore |