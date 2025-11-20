// scripts/create-admin.js
// Run this script with: node scripts/create-admin.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // بيانات الأدمن الجديد
    const adminData = {
      email: 'admin@gym.com',
      name: 'Super Admin',
      password: 'Admin@123456',
      role: 'ADMIN'
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(adminData.password, 10)

    // إنشاء المستخدم
    const user = await prisma.user.create({
      data: {
        email: adminData.email,
        name: adminData.name,
        password: hashedPassword,
        role: adminData.role,
        isActive: true
      }
    })

    // إنشاء الصلاحيات الكاملة
    await prisma.permission.create({
      data: {
        userId: user.id,
        // صلاحيات الأعضاء
        canViewMembers: true,
        canCreateMembers: true,
        canEditMembers: true,
        canDeleteMembers: true,
        // صلاحيات PT
        canViewPT: true,
        canCreatePT: true,
        canEditPT: true,
        canDeletePT: true,
        // صلاحيات الموظفين
        canViewStaff: true,
        canCreateStaff: true,
        canEditStaff: true,
        canDeleteStaff: true,
        // صلاحيات الإيصالات
        canViewReceipts: true,
        canEditReceipts: true,
        canDeleteReceipts: true,
        // صلاحيات التقارير والإعدادات
        canViewReports: true,
        canViewFinancials: true,
        canAccessSettings: true
      }
    })

    console.log('✅ تم إنشاء حساب الأدمن بنجاح!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📧 البريد الإلكتروني:', adminData.email)
    console.log('🔑 كلمة المرور:', adminData.password)
    console.log('👤 الاسم:', adminData.name)
    console.log('👑 الدور: ADMIN')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  احفظ هذه البيانات في مكان آمن!')

  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ خطأ: البريد الإلكتروني موجود مسبقاً')
    } else {
      console.error('❌ خطأ:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()