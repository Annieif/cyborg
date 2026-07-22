# Windows PowerShell
# 一键构建当前平台的可执行文件
$ErrorActionPreference = "Stop"

Write-Host "=== 构建 Minecraft AI 赛博人 可执行文件 ==="

# 1. 安装依赖
Write-Host "[1/4] 安装依赖..."
npm ci --legacy-peer-deps
Set-Location frontend; npm ci; Set-Location ..

# 2. 构建前端
Write-Host "[2/4] 构建前端..."
Set-Location frontend; npm run build; Set-Location ..

# 3. 打包前端资源 + 编译后端
Write-Host "[3/4] 打包资源 + 编译 TypeScript..."
node scripts/bundle-assets.js
npx tsc

# 4. 编译为可执行文件
Write-Host "[4/4] 编译为可执行文件..."
bun build ./dist/index.js --compile --external prismarine-viewer --external canvas --external minecraft-protocol --outfile cyborg-bot.exe
Write-Host "✓ 完成: ./cyborg-bot.exe"
$size = (Get-Item cyborg-bot.exe).Length / 1MB
Write-Host "  文件大小: $([math]::Round($size, 1)) MB"
Write-Host ""
Write-Host "运行: .\cyborg-bot.exe"
Write-Host "然后打开 http://localhost:3000"