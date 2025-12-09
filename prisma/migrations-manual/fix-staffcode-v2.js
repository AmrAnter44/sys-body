const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixStaffCodeType() {
  try {
    console.log('🔧 جاري إصلاح أنواع staffCode باستخدام Prisma...')

    // الحصول على جميع الموظفين باستخدام Prisma
    const allStaff = await prisma.staff.findMany()

    console.log(`📋 عدد الموظفين: ${allStaff.length}`)

    let updatedCount = 0

    for (const staff of allStaff) {
      const currentCode = staff.staffCode

      // التحقق إذا كان الكود رقم فقط (بدون s)
      if (typeof currentCode === 'number' || (typeof currentCode === 'string' && /^\d+$/.test(currentCode))) {
        // تحويل إلى نص مع إضافة s في البداية
        const newCode = `s${String(currentCode).padStart(3, '0')}`

        console.log(`✏️  تحديث: ${currentCode} -> ${newCode} (ID: ${staff.id})`)

        try {
          await prisma.staff.update({
            where: { id: staff.id },
            data: { staffCode: newCode }
          })
          updatedCount++
        } catch (error) {
          console.error(`❌ فشل تحديث ${staff.id}:`, error.message)
        }
      } else {
        console.log(`✅ صحيح: ${currentCode}`)
      }
    }

    console.log(`\n✅ تم إصلاح ${updatedCount} من أصل ${allStaff.length} موظف بنجاح!`)

  } catch (error) {
    console.error('❌ خطأ:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixStaffCodeType()
