const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting migration: Update staffCode from Int to String');

  try {
    // جلب كل الموظفين الحاليين
    const staff = await prisma.$queryRaw`SELECT id, staffCode, name FROM Staff`;

    console.log(`📋 Found ${staff.length} staff members to update`);

    // تنفيذ الـ migration باستخدام raw SQL
    console.log('Step 0.1: Cleaning up previous migration attempts...');
    try {
      await prisma.$executeRaw`ALTER TABLE Staff DROP COLUMN staffCode_new`;
      console.log('  Dropped previous staffCode_new column');
    } catch (e) {
      console.log('  No previous staffCode_new column found');
    }

    console.log('Step 0.2: Dropping old indexes...');
    await prisma.$executeRaw`DROP INDEX IF EXISTS Staff_staffCode_key`;
    await prisma.$executeRaw`DROP INDEX IF EXISTS Staff_staffCode_idx`;

    console.log('Step 1: Creating temporary column...');
    await prisma.$executeRaw`ALTER TABLE Staff ADD COLUMN staffCode_new TEXT`;

    console.log('Step 2: Copying data with "s" prefix...');
    await prisma.$executeRaw`UPDATE Staff SET staffCode_new = 's' || CAST(staffCode AS TEXT)`;

    console.log('Step 3: Dropping old column...');
    await prisma.$executeRaw`ALTER TABLE Staff DROP COLUMN staffCode`;

    console.log('Step 4: Renaming new column...');
    await prisma.$executeRaw`ALTER TABLE Staff RENAME COLUMN staffCode_new TO staffCode`;

    console.log('Step 5: Adding unique constraint...');
    await prisma.$executeRaw`CREATE UNIQUE INDEX Staff_staffCode_key ON Staff(staffCode)`;

    console.log('✅ Migration completed successfully!');

    // عرض البيانات المحدثة
    const updatedStaff = await prisma.$queryRaw`SELECT id, staffCode, name FROM Staff`;
    console.log('\n📋 Updated staff codes:');
    updatedStaff.forEach(s => {
      console.log(`  ${s.name}: ${s.staffCode}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
