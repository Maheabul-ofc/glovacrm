@echo off
title GlovaCRM - Full Stack Launcher
color 0a

echo ===================================================================
echo                     GLOVACRM ENTERPRISE
echo         Automated Call Duration, Telephony & Sales CRM
echo ===================================================================
echo.

cd /d %~dp0

echo [*] Step 1: Checking Docker database containers (PostgreSQL & Redis)...
docker-compose up -d >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo     [+] PostgreSQL (5432) and Redis (6379) are active in Docker!
) else (
    echo     [!] Note: Docker Desktop is not running or started yet.
    echo         If you use native local PostgreSQL/Redis, they will be used.
)

echo.
echo [*] Step 2: Syncing database schema & seeds...
cd backend
call npx prisma db push --skip-generate
call npx prisma db seed
cd ..

echo.
echo [*] Step 3: Launching GlovaCRM Backend API on http://localhost:5000...
start "GlovaCRM Backend API (Port 5000)" cmd /k "cd /d %~dp0\backend && npm run dev"

echo.
echo [*] Step 4: Launching GlovaCRM Web App on http://localhost:3000...
start "GlovaCRM Web Frontend (Port 3000)" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo [*] Waiting for web servers to initialize...
timeout /t 5 /nobreak >nul

echo.
echo [*] Opening GlovaCRM in your default browser...
start http://localhost:3000

echo.
echo ===================================================================
echo                   GLOVACRM IS READY & RUNNING!
echo ===================================================================
echo.
echo   - Web App URL:      http://localhost:3000
echo   - Backend API URL:  http://localhost:5000
echo.
echo   Default Admin Credentials:
echo   - Email:     admin@glovacrm.com
echo   - Password:  password123
echo.
echo   (Or click "Register" on the login screen to create a new workspace)
echo ===================================================================
pause
