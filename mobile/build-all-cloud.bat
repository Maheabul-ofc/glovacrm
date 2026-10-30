@echo off
title GlovaCRM Android + iOS Parallel Build (EAS Cloud)
color 0e

echo ===================================================================
echo       GlovaCRM Multiplatform Builder (Android APK + iOS)
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
echo [*] Step 2: Building Android (.apk) and iOS simultaneously on EAS Cloud...
echo.
call npx eas-cli build --platform all --profile preview

echo.
echo ===================================================================
echo [*] Multiplatform Builds Completed!
echo     Download links for Android APK and iOS build are printed above.
echo ===================================================================
pause
