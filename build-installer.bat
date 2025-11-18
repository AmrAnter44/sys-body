@REM @echo off
@REM cls
@REM echo ================================================
@REM echo     GYM MANAGEMENT SYSTEM - BUILD SCRIPT
@REM echo ================================================
@REM echo.

@REM REM التأكد من وجود Node.js
@REM where node >nul 2>&1
@REM if %errorlevel% neq 0 (
@REM     echo [ERROR] Node.js is not installed!
@REM     echo Please install Node.js from https://nodejs.org/
@REM     pause
@REM     exit /b 1
@REM )

@REM REM تنظيف المجلدات القديمة
@REM echo [1/11] Cleaning old builds...
@REM if exist dist rmdir /s /q dist
@REM if exist .next rmdir /s /q .next
@REM if exist out rmdir /s /q out
@REM echo Done!
@REM echo.

@REM REM تثبيت المكتبات المفقودة
@REM echo [2/11] Installing dependencies...
@REM call npm install --force
@REM call npm install client-only styled-jsx @next/env @swc/helpers --force
@REM if %errorlevel% neq 0 (
@REM     echo [ERROR] Failed to install dependencies!
@REM     pause
@REM     exit /b 1
@REM )
@REM echo Done!
@REM echo.

@REM REM إعداد Prisma
@REM echo [3/11] Generating Prisma client...
@REM call npx prisma generate
@REM if %errorlevel% neq 0 (
@REM     echo [WARNING] Prisma generate failed, continuing...
@REM )
@REM call npx prisma db push --accept-data-loss
@REM if %errorlevel% neq 0 (
@REM     echo [WARNING] Database push failed, continuing...
@REM )
@REM echo Done!
@REM echo.

@REM REM بناء Next.js
@REM echo [4/11] Building Next.js standalone...
@REM call npm run build:standalone
@REM if %errorlevel% neq 0 (
@REM     echo [ERROR] Next.js build failed!
@REM     pause
@REM     exit /b 1
@REM )
@REM echo Done!
@REM echo.

@REM REM التحقق من وجود standalone
@REM echo [5/11] Verifying standalone folder...
@REM if not exist .next\standalone (
@REM     echo [ERROR] Standalone build not created!
@REM     echo Please ensure next.config.js includes output: 'standalone'
@REM     pause
@REM     exit /b 1
@REM )
@REM echo Verified!
@REM echo.

@REM REM تحضير ملفات إضافية
@REM echo [6/11] Preparing standalone files...
@REM if exist scripts\prepare-standalone.js (
@REM     node scripts\prepare-standalone.js
@REM ) else (
@REM     echo [INFO] prepare-standalone.js not found, skipping...
@REM )
@REM echo Done!
@REM echo.

@REM REM تجهيز موارد البناء
@REM echo [7/11] Checking build resources...
@REM if not exist build mkdir build
@REM if not exist build\icon.ico (
@REM     echo [WARNING] icon.ico not found, creating placeholder...
@REM     echo. > build\icon.ico
@REM )
@REM echo Done!
@REM echo.

@REM REM نسخ ملفات Electron
@REM echo [8/11] Copying Electron files...
@REM if not exist electron mkdir electron
@REM copy /Y main.js electron\main.js >nul 2>&1
@REM echo Done!
@REM echo.

@REM REM تنظيف الكاش
@REM echo [9/11] Cleaning npm cache...
@REM call npm cache clean --force >nul 2>&1
@REM echo Done!
@REM echo.

@REM REM قتل أي عملية على المنفذ 4001
@REM echo [10/11] Killing port 4001 if active...
@REM for /f "tokens=5" %%a in ('netstat -aon ^| find ":4001"') do (
@REM     taskkill /F /PID %%a >nul 2>&1
@REM )
@REM echo Done!
@REM echo.

@REM REM بناء تطبيق ويندوز
@REM echo [11/11] Building Windows Installer...
@REM call npx electron-builder --win --x64
@REM if %errorlevel% neq 0 (
@REM     echo [ERROR] Electron Builder failed!
@REM     echo Check package.json build.files and .next/standalone existence.
@REM     pause
@REM     exit /b 1
@REM )
@REM echo Done!
@REM echo.

@REM echo ================================================
@REM echo SUCCESS! Installer built successfully.
@REM echo Location: dist\GymSystem-Setup-1.0.0.exe
@REM echo ================================================
@REM explorer dist
@REM pause
@echo off
cls
echo ================================================
echo     GYM MANAGEMENT SYSTEM - BUILD SCRIPT
echo ================================================
echo.

REM تنظيف
echo [1/8] Cleaning old builds...
if exist dist rmdir /s /q dist
if exist .next rmdir /s /q .next
echo Done!
echo.

REM بناء Next.js standalone
echo [2/8] Building Next.js standalone...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Next.js build failed!
    pause
    exit /b 1
)
echo Done!
echo.

REM التأكد من standalone
echo [3/8] Checking standalone build...
if not exist ".next\standalone\server.js" (
    echo [ERROR] Standalone output not found!
    pause
    exit /b 1
)
echo OK!
echo.

REM تجهيز مجلد electron-release
echo [4/8] Preparing electron release folder...
if exist release rmdir /s /q release
mkdir release
mkdir release\app
echo Done!
echo.

REM نقل standalone لمجلد electron
echo [5/8] Copying standalone...
xcopy ".next\standalone\*" "release\app\" /E /Y >nul
xcopy ".next\static" "release\app\.next\static\" /E /Y >nul
xcopy "public" "release\app\public\" /E /Y >nul
echo Done!
echo.

REM نسخ electron/main.js
echo [6/8] Copying Electron files...
xcopy "electron" "release\electron\" /E /Y >nul
echo Done!
echo.

REM قتل البورت
echo [7/8] Killing port 4001...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":4001"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Done!
echo.

REM بناء EXE
echo [8/8] Building EXE...
call npx electron-builder --config=package.json --win --x64
if %errorlevel% neq 0 (
    echo [ERROR] Electron Builder failed!
    pause
    exit /b 1
)
echo Done!
echo.

echo ================================================
echo SUCCESS! Installer is ready.
echo ================================================
pause
