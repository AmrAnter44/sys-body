// سكريبت لربط PT sessions القديمة بحسابات الكوتشات
// يستخدم هذا السكريبت عندما تريد ربط PT sessions موجودة بحسابات كوتشات جديدة

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function linkPTSessionsToCoaches() {
  console.log('🔗 بدء ربط PT sessions بحسابات الكوتشات...\n');

  try {
    // جلب كل المستخدمين من نوع COACH
    const coaches = await prisma.user.findMany({
      where: { role: 'COACH' },
      select: { id: true, name: true, email: true }
    });

    console.log(`✅ تم العثور على ${coaches.length} كوتش\n`);

    let totalUpdated = 0;

    for (const coach of coaches) {
      console.log(`📌 معالجة الكوتش: ${coach.name} (${coach.email})`);

      // تحديث PT sessions التي تطابق اسم الكوتش ولم تُربط بعد
      const result = await prisma.pT.updateMany({
        where: {
          coachName: coach.name,
          coachUserId: null  // فقط التي لم تُربط بعد
        },
        data: {
          coachUserId: coach.id
        }
      });

      if (result.count > 0) {
        console.log(`   ✅ تم ربط ${result.count} PT session(s)`);
        totalUpdated += result.count;
      } else {
        console.log(`   ℹ️  لا توجد PT sessions تحتاج ربط`);
      }
    }

    console.log(`\n✅ اكتمل! تم ربط ${totalUpdated} PT session(s) إجمالاً`);

    // عرض إحصائيات
    const unlinked = await prisma.pT.count({
      where: { coachUserId: null }
    });

    if (unlinked > 0) {
      console.log(`\n⚠️  يوجد ${unlinked} PT session(s) غير مرتبطة بأي كوتش`);

      const unlinkedSessions = await prisma.pT.findMany({
        where: { coachUserId: null },
        select: { ptNumber: true, coachName: true, clientName: true }
      });

      console.log('\nPT sessions غير المرتبطة:');
      unlinkedSessions.forEach(s => {
        console.log(`   - PT #${s.ptNumber}: ${s.clientName} (كوتش: ${s.coachName})`);
      });
    } else {
      console.log('\n✅ جميع PT sessions مرتبطة بحسابات كوتشات!');
    }

  } catch (error) {
    console.error('❌ حدث خطأ:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// تشغيل السكريبت
linkPTSessionsToCoaches();
