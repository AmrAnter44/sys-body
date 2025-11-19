@echo off
chcp 65001 >nul
cls
echo ========================================================
echo     ALL-IN-ONE INSTALLER CREATOR
echo     إنشاء ملف تثبيت شامل
echo ========================================================
echo.
echo This will create a complete installer for your Gym System
echo.
pause

REM ===== التحقق من البناء =====
echo.
echo [Step 1/3] Checking build...
if not exist .next (
    echo [WARNING] Build not found!
    echo.
    echo Building application...
    call npm run build
    
    if errorlevel 1 (
        echo [ERROR] Build failed!
        pause
        exit /b 1
    )
    
    if not exist .next (
        echo [ERROR] Build still not found!
        pause
        exit /b 1
    )
)
echo ✓ Build verified
echo.

REM ===== تحضير الملفات =====
echo [Step 2/3] Preparing package...
echo.

REM شغّل prepare-package مباشرة
if exist package-for-installer (
    echo Removing old package...
    rmdir /s /q package-for-installer 2>nul
    timeout /t 2 >nul
)

mkdir package-for-installer

echo Copying files...
xcopy /E /I /Y /Q .next package-for-installer\.next >nul
if exist public xcopy /E /I /Y /Q public package-for-installer\public >nul
xcopy /E /I /Y /Q prisma package-for-installer\prisma >nul
copy /Y package.json package-for-installer\ >nul
copy /Y package-lock.json package-for-installer\ 2>nul
copy /Y next.config.mjs package-for-installer\ 2>nul
copy /Y next.config.js package-for-installer\ 2>nul

REM نسخ السكريبتات
if exist run.bat copy /Y run.bat package-for-installer\ >nul
if exist stop-system.bat copy /Y stop-system.bat package-for-installer\ >nul
if exist quick-setup-db.bat copy /Y quick-setup-db.bat package-for-installer\ >nul

REM إنشاء .env
if exist .env (
    copy /Y .env package-for-installer\.env >nul
) else (
    (
        echo DATABASE_URL="postgresql://gymadmin:gymadmin@localhost:5432/gym_database?schema=public"
        echo JWT_SECRET="gym-secret-key-change-me"
        echo PORT=4001
        echo HOSTNAME=0.0.0.0
        echo NODE_ENV=production
    ) > package-for-installer\.env
)

REM إنشاء post-install.bat
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cls
    echo echo ========================================================
    echo echo     POST INSTALLATION SETUP
    echo echo ========================================================
    echo echo.
    echo echo Installing dependencies...
    echo call npm install --production --no-optional
    echo if errorlevel 1 ^(
    echo     echo [ERROR] npm install failed!
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo.
    echo echo Setting up Prisma...
    echo call npx prisma generate
    echo if errorlevel 1 ^(
    echo     echo [ERROR] Prisma generate failed!
    echo     pause
    echo     exit /b 1
    echo ^)
    echo echo.
    echo echo ========================================================
    echo echo Setup Complete!
    echo echo ========================================================
    echo echo.
    echo echo Next: Run quick-setup-db.bat to setup database
    echo echo Then: Run run.bat to start the system
    echo echo.
    echo pause
) > package-for-installer\post-install.bat

REM إنشاء README
(
    echo # X Gym Management System
    echo.
    echo ## Requirements:
    echo - Node.js 18+
    echo - PostgreSQL 16
    echo.
    echo ## Installation Steps:
    echo.
    echo 1. Run post-install.bat
    echo 2. Run quick-setup-db.bat
    echo 3. Run run.bat
    echo.
    echo ## Access:
    echo - Local: http://localhost:4001
    echo - Network: http://[YOUR-IP]:4001
) > package-for-installer\README.md

echo ✓ Package prepared successfully
echo.

REM ===== التحقق من المحتوى =====
if not exist package-for-installer\.next (
    echo [ERROR] .next folder missing in package!
    pause
    exit /b 1
)

if not exist package-for-installer\package.json (
    echo [ERROR] package.json missing in package!
    pause
    exit /b 1
)

echo Package contents verified ✓
echo.

REM ===== إنشاء الـ Installer =====
echo [Step 3/3] Creating installer...
echo.

REM التحقق من Inno Setup
set "INNO_PATH="
if exist "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" (
    set "INNO_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
) else if exist "C:\Program Files\Inno Setup 6\ISCC.exe" (
    set "INNO_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
)

if not defined INNO_PATH (
    echo [ERROR] Inno Setup 6 not found!
    echo.
    echo Please install from: https://jrsoftware.org/isdl.php
    echo.
    set /p open_url="Open download page? (Y/N): "
    if /i "!open_url!"=="Y" start https://jrsoftware.org/isdl.php
    pause
    exit /b 1
)

echo Inno Setup found ✓
echo.

REM إنشاء مجلد الإخراج
if not exist installer-output mkdir installer-output

REM بناء الـ Installer
echo Building installer (this may take 2-5 minutes)...
echo.

"%INNO_PATH%" gym-installer-no-icon.iss

if errorlevel 1 (
    echo.
    echo [ERROR] Installer creation failed!
    echo.
    echo Possible issues:
    echo 1. gym-installer-no-icon.iss file missing
    echo 2. Package directory incomplete
    echo 3. Inno Setup compilation error
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo ✓✓✓ SUCCESS! ✓✓✓
echo ========================================================
echo.

REM عرض معلومات الملف
for %%F in (installer-output\*.exe) do (
    echo Installer created: %%~nxF
    echo Location: %%~fF
    set /a SIZE_MB=%%~zF/1048576
    echo Size: !SIZE_MB! MB
)

echo.
echo ========================================================
echo INSTALLATION INSTRUCTIONS:
echo ========================================================
echo.
echo On the target PC:
echo 1. Install Node.js 18+ if not installed
echo 2. Install PostgreSQL 16 if not installed
echo 3. Run the installer
echo 4. Follow the post-installation steps
echo.
echo The installer will guide users through:
echo - Copying application files
echo - Running post-install.bat
echo - Setting up the database
echo - Starting the system
echo.
echo ========================================================

explorer installer-output
pause