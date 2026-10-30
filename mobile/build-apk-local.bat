@echo off
title GlovaCRM Android APK Builder (Local Machine)
color 0b

echo ===================================================================
echo        GlovaCRM Native Android APK Builder (Local Machine)
echo ===================================================================
echo.
cd /d %~dp0

set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
set "GRADLE_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo [*] Using JDK 17: %JAVA_HOME%
echo [*] Compiling native Android APK with local Gradle...
echo.

cd android
call .\gradlew.bat assembleDebug

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [*] Copying APK to project root...
    copy /Y "app\build\outputs\apk\debug\app-debug.apk" "..\..\GlovaCRM.apk"
    echo.
    echo ===================================================================
    echo [*] SUCCESS! Your Android APK is ready at:
    echo     D:\GlovaDev\CRM\GlovaCRM.apk
    echo ===================================================================
) else (
    echo.
    echo [X] Build encountered an error. Check Gradle output above.
)

pause
