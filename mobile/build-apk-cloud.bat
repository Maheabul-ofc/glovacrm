@echo off
title GlovaCRM Android APK Builder (EAS Cloud)
color 0a

echo ===================================================================
echo           GlovaCRM Android Dialer - 1-Click APK Builder
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
echo [*] Step 2: Building Android Standalone APK...
echo     (If not logged in, it will ask you to log in to free expo.dev)
echo.
call npx eas-cli build --platform android --profile preview

echo.
echo ===================================================================
echo [*] Build Complete!
echo     Download the APK using the link or QR code printed above.
echo ===================================================================
pause
