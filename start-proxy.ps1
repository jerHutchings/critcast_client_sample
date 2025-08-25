# CritCast Client Sample Proxy Server Launcher
# This script starts the Python proxy server that forwards rolls to api.critcast.com

Write-Host "CritCast Client Sample Proxy Server" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if Python is installed
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} else {
    Write-Host "ERROR: Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.8+ from https://python.org" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Found Python: $pythonCmd" -ForegroundColor Cyan

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    & $pythonCmd -m venv venv
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
        pause
        exit 1
    }
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    pause
    exit 1
}

# Start the proxy server
Write-Host "`nStarting CritCast Proxy Server..." -ForegroundColor Green
Write-Host "The proxy will forward rolls to: https://api.critcast.com" -ForegroundColor Cyan
Write-Host "Client interface will be available at: http://localhost:8090" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C to stop the server`n" -ForegroundColor Yellow

python crit_proxy_server.py
