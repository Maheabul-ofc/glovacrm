@echo off
title GlovaCRM - Push to GitHub
color 0b

echo ===================================================================
echo                  GLOVACRM GITHUB PUSH HELPER
echo ===================================================================
echo.
echo Make sure you have created an empty repository on GitHub first!
echo (e.g. https://github.com/new -> name it 'glovacrm')
echo.
set /p REPO_URL="Enter your GitHub Repository URL (e.g. https://github.com/yourusername/glovacrm.git): "

if "%REPO_URL%"=="" (
    echo [X] Error: Repository URL cannot be empty.
    pause
    exit /b 1
)

cd /d %~dp0

echo.
echo [*] Staging and committing all project files...
git add .
git commit -m "feat: complete all GlovaCRM core features and deployment configs" >nul 2>&1

echo [*] Setting main branch...
git branch -M main

echo [*] Removing any old remote origin...
git remote remove origin >nul 2>&1

echo [*] Adding new remote origin: %REPO_URL%
git remote add origin %REPO_URL%

echo [*] Pushing code to GitHub...
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================================
    echo [+] Successfully pushed GlovaCRM to GitHub!
    echo.
    echo Next Step:
    echo 1. Open https://dashboard.render.com
    echo 2. Click "New +" -> "Blueprint"
    echo 3. Select your "glovacrm" repository
    echo 4. Click "Apply" to launch Database, Backend, and Frontend!
    echo ===================================================================
) else (
    echo.
    echo [X] Push failed. Make sure you are authenticated with GitHub.
)

pause
