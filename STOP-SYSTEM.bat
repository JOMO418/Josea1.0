@echo off
color 0C
title JOSEA AUTO SPARES - Stopping System

cls
echo.
echo ================================================================================
echo                    JOSEA AUTO SPARES - STOPPING SYSTEM
echo ================================================================================
echo.
echo  Shutting down all services...
echo.

REM Kill Node.js processes (Frontend and Backend)
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo  [SUCCESS] Frontend and Backend servers stopped
) else (
    echo  [INFO] No running servers found
)

echo.
echo ================================================================================
echo                         SYSTEM STOPPED SUCCESSFULLY
echo ================================================================================
echo.
echo  All services have been shut down.
echo  You can close this window now.
echo.
pause
