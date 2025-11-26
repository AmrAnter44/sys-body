import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkFollowups() {
  try {
    // عد المتابعات
    const followupsCount = await prisma.followUp.count();
    console.log(`📊 عدد المتابعات في Database: ${followupsCount}`);

    // عد الزوار
    const visitorsCount = await prisma.visitor.count();
    console.log(`👥 عدد الزوار في Database: ${visitorsCount}`);

    // جلب أول 5 متابعات
    if (followupsCount > 0) {
      const followups = await prisma.followUp.findMany({
        take: 5,
        include: {
          visitor: true
        }
      });

      console.log('\n✅ أول 5 متابعات:');
      followups.forEach((fu, i) => {
        console.log(`${i + 1}. ${fu.visitor.name} - ${fu.notes.substring(0, 50)}...`);
      });
    } else {
      console.log('\n⚠️  لا توجد متابعات في Database!');
      console.log('💡 لازم تضيف متابعات أولاً من الواجهة أو تستورد بيانات.');
    }

    // جلب أول 5 زوار
    if (visitorsCount > 0) {
      const visitors = await prisma.visitor.findMany({
        take: 5
      });

      console.log('\n✅ أول 5 زوار:');
      visitors.forEach((v, i) => {
        console.log(`${i + 1}. ${v.name} - ${v.phone}`);
      });
    } else {
      console.log('\n⚠️  لا يوجد زوار في Database!');
      console.log('💡 لازم تضيف زوار أولاً (من الواجهة أو تشغل importVisitors.js)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFollowups();
