@echo off
REM ServiceVision Setup Script for Windows

echo ServiceVision Setup Script
echo ==========================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

echo Node.js version:
node --version
echo.

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install backend dependencies
    exit /b 1
)

REM Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env file from example...
    copy .env.example .env
    echo Please edit backend\.env with your configuration values
)

REM Install frontend dependencies
echo.
echo Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install frontend dependencies
    exit /b 1
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Edit backend\.env with your configuration
echo 2. Set up your database
echo 3. Run 'npm run dev' in both backend and frontend directories
echo.
echo See QUICKSTART.md for detailed instructions
pause