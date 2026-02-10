@echo off
setlocal enabledelayedexpansion
color 0B
mode con: cols=80 lines=35
title JOSEA AUTO SPARES - First Time Setup

cls
echo.
echo ================================================================================
echo                    JOSEA AUTO SPARES - FIRST TIME SETUP
echo ================================================================================
echo.
echo  This will install all required dependencies and set up the system.
echo  This only needs to be done ONCE on this computer.
echo.
echo  Estimated time: 3-5 minutes
echo.
echo ================================================================================
echo.
pause

REM Navigate to project directory
cd /d "%~dp0"

echo.
echo  [1/6] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo       [ERROR] Node.js is not installed!
    echo.
    echo  Please install Node.js first:
    echo  1. Go to: https://nodejs.org
    echo  2. Download and install the LTS version
    echo  3. Run this setup script again
    echo.
    pause
    exit /b 1
)
node --version
echo       Node.js: FOUND
echo.

echo  [2/6] Checking PostgreSQL installation...
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo       [WARNING] PostgreSQL is not running or not installed
    echo.
    echo  Make sure PostgreSQL is installed and running.
    echo  If you need help, check INSTALLATION-GUIDE.md
    echo.
)
echo       PostgreSQL: CHECKED
echo.

echo  [3/6] Installing Backend Dependencies...
echo       This may take 2-3 minutes...
cd server
call npm install
if %errorlevel% neq 0 (
    echo       [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo       Backend Dependencies: INSTALLED
cd ..
echo.

echo  [4/6] Installing Frontend Dependencies...
echo       This may take 2-3 minutes...
cd client
call npm install
if %errorlevel% neq 0 (
    echo       [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo       Frontend Dependencies: INSTALLED
cd ..
echo.

echo  [5/6] Setting up Database...
cd server
call npx prisma generate
call npx prisma db push
echo       Database Schema: CREATED
cd ..
echo.

echo  [6/6] Seeding Initial Data...
cd server
call npm run seed
if %errorlevel% neq 0 (
    echo       [WARNING] Database seeding encountered an issue
    echo       The system will still work, but may have no initial data
)
echo       Initial Data: LOADED
cd ..
echo.

echo ================================================================================
echo                         SETUP COMPLETED SUCCESSFULLY!
echo ================================================================================
echo.
echo  Next Steps:
echo  -----------
echo  1. Double-click "START-JOSEA-PRESENTATION.bat" to launch the system
echo  2. The system will open in your default web browser
echo  3. Use the demo credentials to login
echo.
echo  Demo Credentials:
echo  -----------------
echo  Email:    admin@example.com
echo  Password: admin123
echo.
echo ================================================================================
echo.
pause
