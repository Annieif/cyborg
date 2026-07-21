@echo off
REM === 我的世界AI赛博人 启动脚本 ===

echo.
echo ============================================
echo   我的世界AI赛博人 - Minecraft AI Cyborg
echo ============================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

REM 检查 .env 文件
if not exist .env (
    echo [提示] 未找到 .env 文件，从 .env.example 复制...
    copy .env.example .env
    echo [提示] 请编辑 .env 文件填入你的配置，特别是 AI_API_KEY
    echo.
    pause
)

REM 安装依赖
if not exist node_modules (
    echo [信息] 正在安装依赖...
    call npm install --legacy-peer-deps
)

REM 构建前端
if not exist frontend\dist (
    echo [信息] 构建前端...
    cd frontend
    call npm install
    call npm run build
    cd ..
)

REM 构建后端
echo [信息] 构建后端...
call npm run build

REM 启动
echo.
echo [信息] 启动赛博人...
echo [信息] Web 面板: http://localhost:3000
echo [信息] 按 Ctrl+C 停止
echo.
call npm start

pause