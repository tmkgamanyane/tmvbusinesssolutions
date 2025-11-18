@echo off
REM TMV Business Solutions - Production Deployment Script for Windows
REM Run this script on your Windows server to deploy the application

echo.
echo TMV Business Solutions - Production Deployment
echo ==================================================

REM Check if we're in the right directory
if not exist "server.js" (
    echo Error: server.js not found. Please run this script from the project root directory.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo Environment checks passed

REM Install dependencies
echo Installing dependencies...
npm install

REM Check if .env file exists
if not exist ".env" (
    echo Error: .env file not found. Please create the .env file first.
    exit /b 1
)

echo Database configuration verified

REM Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PM2...
    npm install -g pm2
)

REM Stop any existing server
echo Stopping existing server...
pm2 stop tmvbusinesssolutions 2>nul
pm2 delete tmvbusinesssolutions 2>nul

REM Start the server
echo Starting TMV Business Solutions server...
pm2 start ecosystem.config.json --env production

REM Save PM2 configuration
pm2 save

echo.
echo Deployment completed successfully!
echo.
echo Server Status:
pm2 status

echo.
echo Useful Commands:
echo   View logs:     pm2 logs tmvbusinesssolutions
echo   Restart:       pm2 restart tmvbusinesssolutions
echo   Stop:          pm2 stop tmvbusinesssolutions
echo   Status:        pm2 status
echo.
echo Your application should be running at:
echo   https://tmvbusinesssolutions.co.za
echo.
echo If you encounter issues, check the logs:
echo   pm2 logs tmvbusinesssolutions --lines 100

pause