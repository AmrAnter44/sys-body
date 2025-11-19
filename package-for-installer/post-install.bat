@echo off
chcp 65001 >nul
cls
echo ========================================================
echo     POST INSTALLATION SETUP
echo ========================================================
echo.
echo Installing dependencies...
call npm install --production --no-optional
if errorlevel 1 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)
echo.
echo Setting up Prisma...
call npx prisma generate
if errorlevel 1 (
    echo [ERROR] Prisma generate failed!
    pause
    exit /b 1
)
echo.
echo ========================================================
echo Setup Complete!
echo ========================================================
echo.
echo Next: Run quick-setup-db.bat to setup database
echo Then: Run run.bat to start the system
echo.
pause
