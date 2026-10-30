@echo off
title GlovaCRM iOS Build (EAS Cloud)
color 0b

echo ===================================================================
echo             GlovaCRM iOS App - 1-Click Cloud Builder
echo ===================================================================
echo.
cd /d %~dp0

echo [*] Step 1: Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [X] Dependency installation failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [*] Step 2: Building iOS App on Expo EAS Cloud...
echo     (Builds an iOS build in the cloud - no Mac computer required!)
echo.
call npx eas-cli build --platform ios --profile preview

echo.
echo ===================================================================
echo [*] iOS Build Complete!
echo     Download the build using the link printed above.
echo ===================================================================
pause
