@echo off
title AI ArtStyle Lab - Startup

echo ========================================
echo   AI ArtStyle Lab - Starting Services
echo ========================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Checking dependencies...
if not exist "node_modules" (
    echo [INFO] First run, installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)
echo [OK] Dependencies checked
echo.

:: Start backend
echo [2/4] Starting backend server (Express)...
start "AI Backend" cmd.exe /k "node server.js"
timeout /t 2 >nul
echo [OK] Backend started (port 3000)
echo.

:: Wait for backend
echo [3/4] Waiting for backend...
timeout /t 3 >nul

:: Start frontend
echo [4/4] Starting frontend dev server (Vite)...
start "AI Frontend" cmd.exe /k "npm run dev"
echo [OK] Frontend started
echo.

:: Open browser
echo Opening browser...
timeout /t 5 >nul
start http://localhost:5173

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3000
echo.
echo   Test Accounts:
echo     Student: 20250101 / 123456
echo     Teacher: 20250001 / 123456
echo.
echo   To stop: Close the two command windows
echo ========================================
echo.

pause
