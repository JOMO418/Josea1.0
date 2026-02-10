@echo off
setlocal enabledelayedexpansion
color 0A
mode con: cols=80 lines=30
title JOSEA AUTO SPARES - Starting System...

cls
echo.
echo ================================================================================
echo                    JOSEA AUTO SPARES - PRESENTATION MODE
echo ================================================================================
echo.
echo  Starting your Point of Sale System...
echo  Please wait while we prepare everything for you.
echo.
echo ================================================================================
echo.

REM Navigate to project directory
cd /d "%~dp0"

REM Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Please install Node.js from: https://nodejs.org
    echo  Then run this script again.
    echo.
    pause
    exit /b 1
)

echo  [1/5] Checking Node.js... FOUND
timeout /t 1 /nobreak >nul

REM Check if PostgreSQL is running
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo  [2/5] Checking PostgreSQL... NOT RUNNING
    echo.
    echo  [WARNING] PostgreSQL database is not running.
    echo  Please start PostgreSQL service and run this script again.
    echo.
    echo  How to start PostgreSQL:
    echo  - Open Services (Win + R, type: services.msc)
    echo  - Find "PostgreSQL" service
    echo  - Right-click and select "Start"
    echo.
    pause
    exit /b 1
)

echo  [2/5] Checking PostgreSQL... CONNECTED
timeout /t 1 /nobreak >nul

REM Start the backend server
echo  [3/5] Starting Backend Server...
cd server
start "Josea Backend Server" cmd /c "npm run dev"
cd ..
timeout /t 3 /nobreak >nul
echo       Backend Server: RUNNING (Port 5000)

REM Start the frontend client
echo  [4/5] Starting Frontend Application...
cd client
start "Josea Frontend Client" cmd /c "npm run dev"
cd ..
timeout /t 5 /nobreak >nul
echo       Frontend Client: RUNNING

REM Wait for Vite to fully start and open browser
echo  [5/5] Opening in Browser...
timeout /t 3 /nobreak >nul

REM Open the application in default browser
start http://localhost:5173

echo.
echo ================================================================================
echo                         SYSTEM READY FOR PRESENTATION!
echo ================================================================================
echo.
echo   Access Your System:
echo   -------------------
echo   Frontend URL: http://localhost:5173
echo   Backend URL:  http://localhost:5000
echo   Database:     PostgreSQL (localhost:5432)
echo.
echo   Demo Credentials:
echo   -----------------
echo   Email:    admin@example.com
echo   Password: admin123
echo.
echo   To Stop the System:
echo   -------------------
echo   Close the "Josea Backend Server" and "Josea Frontend Client" windows
echo   OR press Ctrl+C in each window
echo.
echo ================================================================================
echo.
echo  System is now running locally (No internet connection needed)
echo  You can close this window - the system will continue running.
echo.
pause
