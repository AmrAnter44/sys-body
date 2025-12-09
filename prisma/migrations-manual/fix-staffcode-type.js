const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixStaffCodeType() {
  try {
    console.log('🔧 جاري إصلاح أنواع staffCode...')

    // الحصول على جميع الموظفين
    const allStaff = await prisma.$queryRaw`SELECT id, staffCode FROM Staff`

    console.log(`📋 عدد الموظفين: ${allStaff.length}`)

    for (const staff of allStaff) {
      const currentCode = staff.staffCode

      // التحقق إذا كان الكود رقم فقط (بدون s)
      if (typeof currentCode === 'number' || /^\d+$/.test(currentCode)) {
        // تحويل إلى نص مع إضافة s في البداية
        const newCode = `s${String(currentCode).padStart(3, '0')}`

        console.log(`✏️  تحديث: ${currentCode} -> ${newCode}`)

        await prisma.$executeRaw`
          UPDATE Staff
          SET staffCode = ${newCode}
          WHERE id = ${staff.id}
        `
      } else {
        console.log(`✅ صحيح: ${currentCode}`)
      }
    }

    console.log('✅ تم إصلاح جميع staffCode بنجاح!')

  } catch (error) {
    console.error('❌ خطأ:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixStaffCodeType()
