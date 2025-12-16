// Reset and migrate attendance data
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Resetting and migrating attendance data...')

  // Drop the new table if it exists
  try {
    await prisma.$executeRaw`DROP TABLE IF EXISTS "Attendance_new"`
    console.log('✅ Dropped Attendance_new if existed')
  } catch (error) {
    console.log('ℹ️ No temp table to drop')
  }

  // Get all attendance records
  const attendances = await prisma.$queryRaw`
    SELECT id, staffId, checkIn, checkOut, duration, notes, createdAt
    FROM Attendance
  `

  console.log(`Found ${attendances.length} attendance records`)

  if (attendances.length === 0) {
    console.log('✅ No data to migrate')
    return
  }

  // Add the date column if it doesn't exist
  try {
    await prisma.$executeRaw`ALTER TABLE Attendance ADD COLUMN date DATETIME`
    console.log('✅ Added date column')
  } catch (error) {
    console.log('ℹ️ Date column already exists')
  }

  // Update each record with the date from checkIn
  for (const attendance of attendances) {
    const checkInDate = new Date(attendance.checkIn)
    // Set time to 00:00:00 to keep only the date part
    checkInDate.setHours(0, 0, 0, 0)

    await prisma.$executeRaw`
      UPDATE Attendance
      SET date = ${checkInDate.toISOString()}
      WHERE id = ${attendance.id}
    `
  }

  console.log('✅ Updated all records with date values')

  // Check for duplicates
  const duplicates = await prisma.$queryRaw`
    SELECT staffId, date, COUNT(*) as count
    FROM Attendance
    GROUP BY staffId, date
    HAVING COUNT(*) > 1
  `

  console.log(`Found ${duplicates.length} duplicate date entries (will keep latest)`)

  // Recreate table structure
  console.log('🔄 Recreating table structure...')

  await prisma.$executeRaw`
    CREATE TABLE "Attendance_new" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "staffId" TEXT NOT NULL,
      "date" DATETIME NOT NULL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Attendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `

  // Insert only unique staffId + date combinations (keep the latest one)
  await prisma.$executeRaw`
    INSERT INTO "Attendance_new" ("id", "staffId", "date", "notes", "createdAt")
    SELECT
      a1.id,
      a1.staffId,
      a1.date,
      a1.notes,
      a1.createdAt
    FROM "Attendance" a1
    WHERE a1.id = (
      SELECT a2.id
      FROM "Attendance" a2
      WHERE a2.staffId = a1.staffId AND a2.date = a1.date
      ORDER BY a2.createdAt DESC
      LIMIT 1
    )
  `

  const migratedCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Attendance_new"`
  console.log(`✅ Migrated ${migratedCount[0].count} unique records`)

  await prisma.$executeRaw`DROP TABLE "Attendance"`
  await prisma.$executeRaw`ALTER TABLE "Attendance_new" RENAME TO "Attendance"`

  // Create indexes
  await prisma.$executeRaw`CREATE INDEX "Attendance_staffId_idx" ON "Attendance"("staffId")`
  await prisma.$executeRaw`CREATE INDEX "Attendance_date_idx" ON "Attendance"("date")`
  await prisma.$executeRaw`CREATE UNIQUE INDEX "Attendance_staffId_date_key" ON "Attendance"("staffId", "date")`

  console.log('✅ Migration completed successfully!')
  console.log(`Original: ${attendances.length} records → Final: ${migratedCount[0].count} unique records`)
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
