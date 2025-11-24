import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateOldData() {
  console.log('🔄 بدء تحويل البيانات القديمة...\n')

  try {
    // 1️⃣ تحويل بيانات DayUse القديمة
    console.log('📊 جاري تحويل بيانات DayUse...')
    const dayUseEntries = await prisma.dayUse.findMany({
      include: {
        staff: true,
      },
    })

    let dayUseConverted = 0
    let dayUseSkipped = 0

    for (const entry of dayUseEntries) {
      // التحقق من عدم وجود زائر بنفس رقم الهاتف
      const existingVisitor = await prisma.visitor.findUnique({
        where: { phone: entry.phone },
      })

      if (!existingVisitor) {
        // إنشاء زائر جديد
        await prisma.visitor.create({
          data: {
            name: entry.name,
            phone: entry.phone,
            source: 'invitation',
            interestedIn: entry.serviceType === 'DayUse' ? 'يوم استخدام' : 'InBody',
            notes: `دعوة ${entry.serviceType === 'DayUse' ? 'يوم استخدام' : 'InBody'} - موظف: ${entry.staff.name}`,
            status: 'pending',
            createdAt: entry.createdAt, // الاحتفاظ بتاريخ الإنشاء الأصلي
          },
        })

        // إنشاء أول متابعة
        const newVisitor = await prisma.visitor.findUnique({
          where: { phone: entry.phone },
        })

        if (newVisitor) {
          await prisma.followUp.create({
            data: {
              visitorId: newVisitor.id,
              notes: `دعوة ${entry.serviceType === 'DayUse' ? 'يوم استخدام' : 'InBody'} - في انتظار المتابعة من فريق المبيعات`,
              nextFollowUpDate: new Date(entry.createdAt.getTime() + 24 * 60 * 60 * 1000),
              createdAt: entry.createdAt,
            },
          })
        }

        dayUseConverted++
        console.log(`✅ تم تحويل: ${entry.name} - ${entry.phone}`)
      } else {
        dayUseSkipped++
        console.log(`⏭️  تخطي (موجود مسبقاً): ${entry.name} - ${entry.phone}`)
      }
    }

    console.log(`\n📊 نتائج تحويل DayUse:`)
    console.log(`   ✅ تم التحويل: ${dayUseConverted}`)
    console.log(`   ⏭️  تم التخطي: ${dayUseSkipped}`)
    console.log(`   📝 الإجمالي: ${dayUseEntries.length}\n`)

    // 2️⃣ تحويل بيانات Invitations القديمة
    console.log('🎟️ جاري تحويل بيانات الدعوات من الأعضاء...')
    const invitations = await prisma.invitation.findMany({
      include: {
        member: true,
      },
    })

    let invitationsConverted = 0
    let invitationsSkipped = 0

    for (const invitation of invitations) {
      // التحقق من عدم وجود زائر بنفس رقم الهاتف
      const existingVisitor = await prisma.visitor.findUnique({
        where: { phone: invitation.guestPhone },
      })

      if (!existingVisitor) {
        // إنشاء زائر جديد
        await prisma.visitor.create({
          data: {
            name: invitation.guestName,
            phone: invitation.guestPhone,
            source: 'member-invitation',
            interestedIn: 'دعوة من عضو',
            notes: `دعوة من العضو: ${invitation.member.name} (#${invitation.member.memberNumber})${invitation.notes ? ' - ' + invitation.notes : ''}`,
            status: 'pending',
            createdAt: invitation.createdAt, // الاحتفاظ بتاريخ الإنشاء الأصلي
          },
        })

        // إنشاء أول متابعة
        const newVisitor = await prisma.visitor.findUnique({
          where: { phone: invitation.guestPhone },
        })

        if (newVisitor) {
          await prisma.followUp.create({
            data: {
              visitorId: newVisitor.id,
              notes: `دعوة من العضو ${invitation.member.name} - في انتظار المتابعة من فريق المبيعات`,
              nextFollowUpDate: new Date(invitation.createdAt.getTime() + 24 * 60 * 60 * 1000),
              createdAt: invitation.createdAt,
            },
          })
        }

        invitationsConverted++
        console.log(`✅ تم تحويل: ${invitation.guestName} - ${invitation.guestPhone}`)
      } else {
        invitationsSkipped++
        console.log(`⏭️  تخطي (موجود مسبقاً): ${invitation.guestName} - ${invitation.guestPhone}`)
      }
    }

    console.log(`\n🎟️ نتائج تحويل الدعوات:`)
    console.log(`   ✅ تم التحويل: ${invitationsConverted}`)
    console.log(`   ⏭️  تم التخطي: ${invitationsSkipped}`)
    console.log(`   📝 الإجمالي: ${invitations.length}\n`)

    // النتائج النهائية
    console.log(`\n${'='.repeat(50)}`)
    console.log('✅ اكتمل تحويل البيانات بنجاح!')
    console.log(`📊 إجمالي السجلات المحولة: ${dayUseConverted + invitationsConverted}`)
    console.log(`⏭️  إجمالي السجلات المتخطاة: ${dayUseSkipped + invitationsSkipped}`)
    console.log(`${'='.repeat(50)}\n`)

  } catch (error) {
    console.error('❌ خطأ أثناء التحويل:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateOldData()
