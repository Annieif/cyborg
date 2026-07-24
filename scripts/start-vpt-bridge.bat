@echo off
REM ========================================
REM  VPT Bridge Server Launcher (Windows)
REM ========================================
REM  Starts the Python VPT Bridge service for visual AI inference.
REM
REM  Prerequisites:
REM    1. Python 3.9+ installed
REM    2. Install dependencies: pip install -r vpt/requirements.txt
REM    3. Download VPT model weights from:
REM       https://github.com/openai/Video-Pre-Training
REM    4. Copy VPT lib/ folder to vpt/lib/
REM
REM  Usage:
REM    scripts\start-vpt-bridge.bat [model_path] [weights_path]
REM
REM  Example:
REM    scripts\start-vpt-bridge.bat foundation-model-1x.model foundation-model-1x.weights
REM ========================================

setlocal

set MODEL_PATH=%1
set WEIGHTS_PATH=%2
set HOST=127.0.0.1
set PORT=8765

if "%MODEL_PATH%"=="" (
    echo ERROR: Please specify model and weights paths.
    echo Usage: scripts\start-vpt-bridge.bat [model_path] [weights_path]
    echo.
    echo Download VPT model weights from:
    echo   https://github.com/openai/Video-Pre-Training
    pause
    exit /b 1
)

if "%WEIGHTS_PATH%"=="" (
    echo ERROR: Please specify weights path.
    echo Usage: scripts\start-vpt-bridge.bat [model_path] [weights_path]
    pause
    exit /b 1
)

echo ========================================
echo  VPT Bridge Server
echo ========================================
echo Model:  %MODEL_PATH%
echo Weights: %WEIGHTS_PATH%
echo Address: %HOST%:%PORT%
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.9+ from https://python.org
    pause
    exit /b 1
)

REM Check if vpt directory exists
if not exist "vpt\bridge_server.py" (
    echo ERROR: vpt\bridge_server.py not found.
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

REM Check if vpt/lib/ exists
if not exist "vpt\lib\" (
    echo WARNING: vpt\lib\ not found.
    echo For full VPT model inference, copy the lib/ folder from:
    echo   https://github.com/openai/Video-Pre-Training
    echo The bridge will start in stub mode (no model inference).
    echo.
)

REM Start the bridge server
echo Starting VPT Bridge Server...
python vpt/bridge_server.py --model "%MODEL_PATH%" --weights "%WEIGHTS_PATH%" --host %HOST% --port %PORT%

if errorlevel 1 (
    echo.
    echo VPT Bridge Server exited with an error.
    pause
)

endlocal