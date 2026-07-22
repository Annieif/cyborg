# 我的世界AI赛博人 — 任务计划

## 目标
构建生产级质量的 Minecraft AI 赛博人工具。核心为 Mineflayer，接入外部 AI API，可与玩家聊天、与世界交互。

## 阶段状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| 阶段1-6: 初始开发 | ✅ complete | 项目初始化 → 全部功能 |
| 阶段7: v1.0.1 优化 | ✅ complete | Bug 修复 + 代码质量 |
| **阶段8: v1.0.2** | **✅ complete** | 上下文优化 + 正版兼容 + AI更多操作 + 多模态 |

---

## 阶段8: v1.0.2

### 功能清单

| # | 功能 | 优先级 | 涉及文件 |
|---|------|--------|---------|
| 1 | 优化上下文: 对话摘要 + Token估算 + 智能裁剪 | 🔴 High | `src/ai/conversation.ts`, `src/config/index.ts` |
| 2 | 正版兼容: Microsoft OAuth 认证 | 🔴 High | `src/bot/index.ts`, `src/config/index.ts`, `.env.example` |
| 3 | AI更多操作: 合成/熔炼/进食/睡觉/钓鱼/开箱/附魔 | 🔴 High | `src/bot/tools.ts` |
| 4 | 多模态支持: 截图+视觉模型 (实验性) | 🟡 Medium | `src/ai/types.ts`, `src/ai/provider.ts`, `src/bot/tools.ts`, `src/bot/index.ts`, `src/config/index.ts` |

### 操作步骤

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