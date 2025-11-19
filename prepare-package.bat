@echo off
chcp 65001 >nul
cls
echo ========================================================
echo     PREPARE PACKAGE FOR INSTALLER
echo     تحضير الملفات للتغليف
echo ========================================================
echo.

REM التأكد من اكتمال البناء
if not exist .next (
    echo [ERROR] Build not found!
    echo Please run: npm run build
    pause
    exit /b 1
)

echo [1/5] Creating package directory...
if exist package-for-installer rmdir /s /q package-for-installer
mkdir package-for-installer
echo ✓ Created
echo.

echo [2/5] Copying application files...
xcopy /E /I /Y .next package-for-installer\.next >nul
xcopy /E /I /Y public package-for-installer\public >nul
xcopy /E /I /Y prisma package-for-installer\prisma >nul
copy package.json package-for-installer\ >nul
copy package-lock.json package-for-installer\ >nul
copy next.config.mjs package-for-installer\ >nul
copy .env.example package-for-installer\.env >nul 2>&1
if not exist package-for-installer\.env (
    (
        echo DATABASE_URL="postgresql://gymadmin:gymadmin@localhost:5432/gym_database?schema=public"
        echo JWT_SECRET="gym-secret-key-change-me"
        echo PORT=4001
        echo HOSTNAME=0.0.0.0
        echo NODE_ENV=production
    ) > package-for-installer\.env
)
echo ✓ Files copied
echo.

echo [3/5] Copying scripts...
copy run.bat package-for-installer\ >nul 2>&1
copy stop-system.bat package-for-installer\ >nul 2>&1
copy quick-setup-db.bat package-for-installer\ >nul 2>&1
echo ✓ Scripts copied
echo.

echo [4/5] Creating installation script...
(
    echo @echo off
    echo chcp 65001 ^>nul
    echo cls
    echo echo ========================================================
    echo echo     GYM SYSTEM - POST INSTALLATION
    echo echo ========================================================
    echo echo.
    echo echo Installing Node.js dependencies...
    echo call npm install --production
    echo echo.
    echo echo Setting up Prisma...
    echo call npx prisma generate
    echo echo.
    echo echo Database setup is required.
    echo echo Please run quick-setup-db.bat to create the database.
    echo echo.
    echo echo Then use run.bat to start the system.
    echo echo.
    echo pause
) > package-for-installer\post-install.bat
echo ✓ Installation script created
echo.

echo [5/5] Creating README...
(
    echo # نظام إدارة الصالة الرياضية
    echo.
    echo ## المتطلبات:
    echo - PostgreSQL 16
    echo - Node.js 18+
    echo.
    echo ## خطوات التشغيل بعد التثبيت:
    echo.
    echo 1. شغّل quick-setup-db.bat لإنشاء قاعدة البيانات
    echo 2. شغّل post-install.bat لتثبيت المكتبات
    echo 3. شغّل run.bat لبدء النظام
    echo.
    echo ## الوصول:
    echo - Local: http://localhost:4001
    echo - Network: http://[YOUR-IP]:4001
    echo.
) > package-for-installer\README.md
echo ✓ README created
echo.

echo ========================================================
echo ✓ PACKAGE READY!
echo ========================================================
echo.
echo Location: package-for-installer\
echo.
echo Next step: Run create-installer.bat
echo.
pause