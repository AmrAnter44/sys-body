const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'gym.db');
const db = new Database(dbPath);

console.log('🔄 Starting migration: Update staffCode from Int to String');

try {
  // الخطوة 1: إنشاء عمود جديد مؤقت
  console.log('Step 1: Creating temporary column...');
  db.exec('ALTER TABLE Staff ADD COLUMN staffCode_new TEXT');

  // الخطوة 2: نسخ البيانات مع إضافة "s" في البداية
  console.log('Step 2: Copying data with "s" prefix...');
  db.exec("UPDATE Staff SET staffCode_new = 's' || CAST(staffCode AS TEXT)");

  // الخطوة 3: حذف العمود القديم
  console.log('Step 3: Dropping old column...');
  db.exec('ALTER TABLE Staff DROP COLUMN staffCode');

  // الخطوة 4: إعادة تسمية العمود الجديد
  console.log('Step 4: Renaming new column...');
  db.exec('ALTER TABLE Staff RENAME COLUMN staffCode_new TO staffCode');

  // الخطوة 5: إضافة unique constraint
  console.log('Step 5: Adding unique constraint...');
  db.exec('CREATE UNIQUE INDEX Staff_staffCode_key ON Staff(staffCode)');

  console.log('✅ Migration completed successfully!');

  // عرض البيانات المحدثة
  const staff = db.prepare('SELECT id, staffCode, name FROM Staff').all();
  console.log('\n📋 Updated staff codes:');
  staff.forEach(s => {
    console.log(`  ${s.name}: ${s.staffCode}`);
  });

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
