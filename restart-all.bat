@echo off
echo ============================================
echo RESTARTING PRAM AUTO SPARES SYSTEM
echo ============================================
echo.

REM Kill existing processes
echo Stopping existing servers...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :5000') DO taskkill /PID %%P /F 2>nul
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3001') DO taskkill /PID %%P /F 2>nul
timeout /t 2 >nul

echo.
echo ============================================
echo Starting Backend Server...
echo ============================================
start "PRAM Backend" cmd /k "cd server && npm start"
timeout /t 5 >nul

echo.
echo ============================================
echo Starting Frontend Server...
echo ============================================
start "PRAM Frontend" cmd /k "cd client && npm run dev"
timeout /t 3 >nul

echo.
echo ============================================
echo SERVERS STARTED!
echo ============================================
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3001
echo.
echo LOGIN CREDENTIALS:
echo   owner@pram.co.ke / password123 (OWNER)
echo   overseer@pram.co.ke / password123 (ADMIN)
echo   mainbranch@pram.co.ke / password123 (MANAGER)
echo.
echo IMPORTANT: Clear your browser cache!
echo 1. Press F12 in browser
echo 2. Go to Console tab
echo 3. Run: localStorage.clear(); sessionStorage.clear(); location.reload();
echo.
echo ============================================
pause
