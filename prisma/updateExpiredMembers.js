import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateExpiredMembers() {
  try {
    console.log('🔄 جاري تحديث الأعضاء المنتهيين...\n');

    // الحصول على التاريخ الحالي
    const today = new Date();
    today.setHours(0, 0, 0, 0); // بداية اليوم

    console.log(`📅 التاريخ الحالي: ${today.toLocaleDateString('ar-EG')}\n`);

    // 1. البحث عن الأعضاء المنتهيين (expiryDate < today)
    const expiredMembers = await prisma.member.findMany({
      where: {
        expiryDate: {
          lt: today // less than today
        },
        isActive: true // نشطين حالياً
      },
      select: {
        id: true,
        name: true,
        phone: true,
        memberNumber: true,
        expiryDate: true,
        isActive: true
      }
    });

    console.log(`📊 عدد الأعضاء المنتهيين المكتشفين: ${expiredMembers.length}\n`);

    if (expiredMembers.length === 0) {
      console.log('✅ لا يوجد أعضاء منتهيين يحتاجون تحديث!');
      console.log('💡 كل الأعضاء إما نشطين أو تم تحديثهم مسبقاً.\n');
      return;
    }

    // عرض أول 10 أعضاء منتهيين
    console.log('📋 أول 10 أعضاء منتهيين:');
    expiredMembers.slice(0, 10).forEach((member, i) => {
      const daysExpired = Math.floor((today - new Date(member.expiryDate)) / (1000 * 60 * 60 * 24));
      console.log(`${i + 1}. ${member.name} (#${member.memberNumber || 'N/A'}) - انتهى منذ ${daysExpired} يوم`);
    });

    console.log('\n⏳ جاري تحديث الأعضاء المنتهيين إلى isActive = false...\n');

    // 2. تحديث حالة الأعضاء المنتهيين
    const updateResult = await prisma.member.updateMany({
      where: {
        expiryDate: {
          lt: today
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    console.log('=================================================');
    console.log(`✅ تم التحديث بنجاح!`);
    console.log('=================================================');
    console.log(`📊 عدد الأعضاء المحدثين: ${updateResult.count}`);
    console.log('=================================================\n');

    // 3. عرض إحصائيات بعد التحديث
    const stats = await prisma.member.groupBy({
      by: ['isActive'],
      _count: true
    });

    console.log('📈 الإحصائيات الحالية:');
    stats.forEach(stat => {
      console.log(`   ${stat.isActive ? '✅ نشطين' : '❌ منتهيين'}: ${stat._count} عضو`);
    });

    console.log('\n💡 الآن يمكنك فتح صفحة المتابعات وسترى الأعضاء المنتهيين!');

  } catch (error) {
    console.error('❌ خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateExpiredMembers();
