@echo off
echo CritCast Client Sample Proxy Server
echo =====================================

REM Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo Found Python
echo.

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Start the proxy server
echo.
echo Starting CritCast Proxy Server...
echo The proxy will forward rolls to: https://api.critcast.com
echo Client interface will be available at: http://localhost:8090
echo.
echo Press Ctrl+C to stop the server
echo.

python crit_proxy_server.py
