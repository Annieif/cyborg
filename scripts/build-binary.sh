#!/bin/bash
# 一键构建当前平台的可执行文件
set -e

echo "=== 构建 Minecraft AI 赛博人 可执行文件 ==="

# 1. 安装依赖
echo "[1/4] 安装依赖..."
npm ci --legacy-peer-deps
cd frontend && npm ci && cd ..

# 2. 构建前端
echo "[2/4] 构建前端..."
cd frontend && npm run build && cd ..

# 3. 打包前端资源 + 编译后端
echo "[3/4] 打包资源 + 编译 TypeScript..."
node scripts/bundle-assets.js
npx tsc

# 4. 编译为可执行文件
echo "[4/4] 编译为可执行文件..."
if command -v bun &> /dev/null; then
  bun build ./dist/index.js --compile --external prismarine-viewer --external canvas --external minecraft-protocol --outfile cyborg-bot
  echo "✓ 完成: ./cyborg-bot"
  
  SIZE=$(du -h cyborg-bot | cut -f1)
  echo "  文件大小: $SIZE"
  echo ""
  echo "运行: ./cyborg-bot"
  echo "然后打开 http://localhost:3000"
else
  echo "需要 Bun 来编译可执行文件。"
  echo "安装: curl -fsSL https://bun.sh/install | bash"
  exit 1
fi