@echo off
REM ============================================
REM M-PESA C2B REGISTRATION - WINDOWS BATCH
REM ============================================

echo.
echo ========================================
echo   M-PESA C2B REGISTRATION
echo ========================================
echo.

cd /d "%~dp0.."
node scripts/register-c2b.js

echo.
pause
