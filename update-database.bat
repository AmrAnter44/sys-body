@echo off
chcp 65001 >nul
echo ========================================
echo    تحديث قاعدة البيانات - X Gym System
echo ========================================
echo.

:: التحقق من صلاحيات الأدمن
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️  يجب تشغيل البرنامج كمسؤول!
    echo    انقر بزر الماوس الأيمن على الملف واختر "Run as administrator"
    pause
    exit /b 1
)

:: مسار قاعدة البيانات (Production - في Program Files)
set "DB_PATH_PROD=C:\Program Files\X Gym Management System\resources\app\prisma\gym.db"

:: مسار قاعدة البيانات (Development - في المشروع)
set "DB_PATH_DEV=%~dp0prisma\gym.db"

:: اختيار المسار الصحيح
if exist "%DB_PATH_PROD%" (
    set "DB_PATH=%DB_PATH_PROD%"
    echo ✓ تم العثور على قاعدة البيانات في: Production
) else if exist "%DB_PATH_DEV%" (
    set "DB_PATH=%DB_PATH_DEV%"
    echo ✓ تم العثور على قاعدة البيانات في: Development
) else (
    echo ❌ لم يتم العثور على قاعدة البيانات!
    echo.
    echo المسارات المتاحة:
    echo 1. %DB_PATH_PROD%
    echo 2. %DB_PATH_DEV%
    pause
    exit /b 1
)

echo.
echo 📂 مسار قاعدة البيانات:
echo    %DB_PATH%
echo.

:: نسخة احتياطية
echo 📦 إنشاء نسخة احتياطية...
copy "%DB_PATH%" "%DB_PATH%.backup.%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%" >nul
if %errorLevel% equ 0 (
    echo ✅ تم إنشاء النسخة الاحتياطية بنجاح
) else (
    echo ❌ فشل إنشاء النسخة الاحتياطية!
    pause
    exit /b 1
)

echo.
echo 🔧 تطبيق التحديثات...
echo.

:: تطبيق Migration باستخدام Node.js و better-sqlite3
node -e "const Database = require('better-sqlite3'); const db = new Database('%DB_PATH%'); try { const columns = db.prepare('PRAGMA table_info(PT)').all(); const hasColumn = columns.some(col => col.name === 'remainingAmount'); if (!hasColumn) { console.log('   ➤ إضافة عمود remainingAmount إلى جدول PT...'); db.prepare('ALTER TABLE PT ADD COLUMN remainingAmount REAL NOT NULL DEFAULT 0').run(); console.log('   ✅ تم إضافة العمود بنجاح'); } else { console.log('   ℹ️  العمود remainingAmount موجود بالفعل'); } db.close(); console.log(''); console.log('✅ اكتمل التحديث بنجاح!'); } catch (error) { console.error('❌ خطأ:', error.message); db.close(); process.exit(1); }"

if %errorLevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ تم تحديث قاعدة البيانات بنجاح!
    echo ========================================
    echo.
    echo يمكنك الآن تشغيل التطبيق بشكل طبيعي
) else (
    echo.
    echo ========================================
    echo ❌ فشل التحديث!
    echo ========================================
    echo.
    echo يمكنك استعادة النسخة الاحتياطية من:
    echo %DB_PATH%.backup.*
)

echo.
pause
