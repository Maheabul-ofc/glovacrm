@echo off
title GlovaCRM Android APK Builder (Local Gradle)
color 0b

echo ===================================================================
echo        GlovaCRM Android Dialer - Local Gradle APK Builder
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
echo [*] Step 2: Generating native Android gradle project...
call npx expo prebuild --platform android --clean
if %ERRORLEVEL% NEQ 0 (
    echo [X] Prebuild failed.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [*] Step 3: Compiling Android APK with Gradle...
cd android
call gradlew.bat assembleRelease

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===================================================================
    echo [*] SUCCESS! Your APK is ready at:
    echo     D:\GlovaDev\CRM\mobile\android\app\build\outputs\apk\release\app-release.apk
    echo ===================================================================
) else (
    echo.
    echo [!] Gradle release build failed. Trying assembleDebug...
    call gradlew.bat assembleDebug
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ===================================================================
        echo [*] SUCCESS! Debug APK is ready at:
        echo     D:\GlovaDev\CRM\mobile\android\app\build\outputs\apk\debug\app-debug.apk
        echo ===================================================================
    )
)

pause
