# 进度日志

## 会话 1: 2026-07-21 — 项目初始化
- 创建规划文件
- 初始化项目结构
- 阶段1-6全部完成

## 会话 2: 2026-07-21 — v1.0.1 优化
- 8 项 Bug 修复和代码质量优化
- 编译验证通过，已推送到 GitHub

## 会话 3: 2026-07-21 — v1.0.2
### 完成事项
- **上下文优化**: Token 估算器 + 对话摘要压缩 + AI_MAX_TOKENS
- **正版兼容**: MC_AUTH 配置 + Microsoft OAuth 认证
- **AI更多操作**: 7 个新工具 (eatFood/sleep/fish/openChest/craftItem/smeltItem/enchantItem)
- **多模态**: ChatMessage image_url + OpenAI vision + screenshot 工具
- 前后端编译 0 errors
- README 更新日志 + 配置表 + 工具参考表

### 修改文件
- `src/ai/conversation.ts` — 重写：Token估算 + 摘要压缩
- `src/ai/types.ts` — ChatMessage content 支持 image_url
- `src/ai/provider.ts` — OpenAI 视觉模型自动切换
- `src/bot/tools.ts` — 重写：7 个新工具 + screenshot 回调
- `src/bot/index.ts` — MC_AUTH + takeScreenshot
- `src/config/index.ts` — 新增 4 个配置项
- `package.json` — v1.0.2 + optionalDependencies
- `.env.example` — 新增配置项
- `README.md` — 更新日志 + 配置表 + 工具参考