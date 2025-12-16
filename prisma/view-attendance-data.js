// View attendance data
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('📋 Viewing Attendance data...\n')

  const all = await prisma.$queryRaw`
    SELECT id, staffId, date, createdAt
    FROM Attendance
    ORDER BY date, staffId, createdAt
  `

  console.log(`Total records: ${all.length}\n`)

  all.forEach((record, index) => {
    const dateObj = new Date(record.date)
    console.log(`${index + 1}. id: ${record.id.substring(0, 8)}... staffId: ${record.staffId.substring(0, 8)}... date: ${dateObj.toISOString()} createdAt: ${new Date(record.createdAt).toISOString()}`)
  })

  // Group by staffId and date
  console.log('\n\nGrouped by staffId + date:')
  const grouped = {}
  all.forEach(record => {
    const key = `${record.staffId}_${record.date}`
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(record)
  })

  Object.keys(grouped).forEach(key => {
    if (grouped[key].length > 1) {
      console.log(`\n⚠️ DUPLICATE: ${grouped[key].length} records for ${key}`)
      grouped[key].forEach((r, i) => {
        console.log(`   ${i + 1}. id: ${r.id} createdAt: ${new Date(r.createdAt).toISOString()}`)
      })
    }
  })
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
