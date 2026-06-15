@echo off
setlocal

title AI ArtStyle Lab Launcher

set "MODE=%~1"
if "%MODE%"=="" set "MODE=dev"

echo ========================================
echo   AI ArtStyle Lab Launcher
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found. Please install Node.js first.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js/npm first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] node_modules not found. Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

if /I "%MODE%"=="preview" goto :preview
if /I "%MODE%"=="dev" goto :dev

echo [ERROR] Unknown mode: %MODE%
echo Usage:
echo   start.bat
echo   start.bat dev
echo   start.bat preview
pause
exit /b 1

:dev
echo [INFO] Starting Nuxt dev server...
start "AI ArtStyle Lab Dev" cmd /k "cd /d %~dp0 && npm run dev"
echo [INFO] Opening browser in 5 seconds...
timeout /t 5 >nul
start http://localhost:3000
echo [OK] Dev server launched.
exit /b 0

:preview
echo [INFO] Building production bundle...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)
echo [INFO] Starting preview server...
start "AI ArtStyle Lab Preview" cmd /k "cd /d %~dp0 && node .output\server\index.mjs"
echo [INFO] Opening browser in 5 seconds...
timeout /t 5 >nul
start http://localhost:3000
echo [OK] Preview server launched.
exit /b 0
