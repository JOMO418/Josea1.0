@echo off
color 0E
title Preparing Package for Client Delivery

cls
echo.
echo ================================================================================
echo                    PREPARE PACKAGE FOR CLIENT DELIVERY
echo ================================================================================
echo.
echo  This will:
echo  - Remove node_modules folders (saves 500MB+ space)
echo  - Clean temporary files
echo  - Prepare for USB/Cloud delivery
echo.
echo  The client will reinstall dependencies using SETUP-FIRST-TIME.bat
echo.
echo ================================================================================
echo.
pause

cd /d "%~dp0"

echo.
echo  [1/5] Stopping all Node.js processes first...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo       All Node.js processes: STOPPED

echo  [2/5] Removing server node_modules...
if exist "server\node_modules" (
    rmdir /s /q "server\node_modules"
    echo       Server node_modules: REMOVED
) else (
    echo       Server node_modules: Already clean
)

echo  [3/5] Removing client node_modules...
if exist "client\node_modules" (
    rmdir /s /q "client\node_modules"
    echo       Client node_modules: REMOVED
) else (
    echo       Client node_modules: Already clean
)

echo  [4/5] Cleaning build artifacts...
if exist "client\dist" (
    rmdir /s /q "client\dist"
    echo       Client build folder: REMOVED
)
if exist "client\.vite" (
    rmdir /s /q "client\.vite"
    echo       Vite cache: REMOVED
)

echo  [5/5] Verifying essential files...
if exist "START-JOSEA-PRESENTATION.bat" (
    echo       START-JOSEA-PRESENTATION.bat: FOUND
) else (
    echo       [WARNING] START-JOSEA-PRESENTATION.bat: MISSING!
)
if exist "SETUP-FIRST-TIME.bat" (
    echo       SETUP-FIRST-TIME.bat: FOUND
) else (
    echo       [WARNING] SETUP-FIRST-TIME.bat: MISSING!
)
if exist "server\.env" (
    echo       server\.env: FOUND
) else (
    echo       [WARNING] server\.env: MISSING! Client won't be able to connect to database.
)

echo.
echo ================================================================================
echo                         PACKAGE PREPARATION COMPLETE!
echo ================================================================================
echo.
echo  Package Size: Much smaller (node_modules removed)
echo  Ready to copy to USB drive or upload to cloud
echo.
echo  What's Included:
echo  ----------------
echo  - All source code
echo  - Launcher scripts
echo  - Client handover guide
echo  - Setup instructions
echo.
echo  What Client Will Do:
echo  --------------------
echo  1. Copy folder to their Desktop
echo  2. Run SETUP-FIRST-TIME.bat (installs dependencies)
echo  3. Run START-JOSEA-PRESENTATION.bat (launches system)
echo.
echo  Estimated Package Size: ~50-100 MB (instead of 500+ MB with node_modules)
echo.
echo ================================================================================
echo.
echo  Next Step: Copy the "pram-auto-spares" folder to USB drive or cloud storage
echo.
pause
