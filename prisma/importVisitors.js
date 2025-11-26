import { PrismaClient } from "@prisma/client";
import fs from "fs";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

// -------- Helper: clean phone number -------------
function cleanPhone(phone) {
  if (!phone || phone === "-") return null;
  return phone.toString().replace(/\D/g, "");
}

async function importVisitors() {
  // 🗑️ مسح كل الزوار أولاً
  console.log("🗑️  Deleting all visitors...");
  try {
    // مسح المتابعات المرتبطة أولاً
    const followUps = await prisma.followUp.deleteMany({});
    console.log(`   ✓ Deleted ${followUps.count} follow-ups`);

    // مسح الزوار
    const visitors = await prisma.visitor.deleteMany({});
    console.log(`   ✓ Deleted ${visitors.count} visitors\n`);

    console.log(`✅ Database cleared successfully!\n`);
  } catch (err) {
    console.error("❌ Error deleting data:", err.message);
    throw err;
  }

  console.log("📖 Reading Excel file...");

  const workbook = new ExcelJS.Workbook();

  // ⚠️ غير المسار ده لمسار ملف Excel بتاعك
  await workbook.xlsx.readFile(
    "C:\\Users\\amran\\Desktop\\gym\\gym-management\\prisma\\visitors.xlsx"
  );

  const worksheet = workbook.worksheets[0];
  const sheetName = worksheet.name;

  console.log(`📊 Reading sheet: ${sheetName}`);

  // Convert worksheet to JSON format
  const rawData = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // Skip header row
      return;
    }

    // Read columns A (Name) and B (Number) directly
    const nameCell = row.getCell(1); // Column A
    const numberCell = row.getCell(2); // Column B

    const rowData = {
      Name: nameCell.value,
      Number: numberCell.value
    };

    // Only add if not empty
    if (nameCell.value || numberCell.value) {
      rawData.push(rowData);
    }
  });

  console.log(`📊 Found ${rawData.length} rows in Excel file`);

  // 🔍 Debug: Show actual column names
  if (rawData.length > 0) {
    console.log("\n🔍 DEBUG: Column names in Excel file:");
    console.log(Object.keys(rawData[0]));
    console.log("\n🔍 DEBUG: First 3 rows data:");
    console.log(rawData.slice(0, 3));
    console.log("\n⚠️  IMPORTANT: Make sure your Excel has columns named 'name' and 'phone'");
    console.log("Current columns found:", Object.keys(rawData[0]).join(", "));
  }

  const visitorsMap = new Map(); // استخدام Map لتخزين آخر سجل لكل رقم
  const skippedRecords = [];

  for (const row of rawData) {
    // ✅ قراءة من عمود "Number" أو "phone"
    const cleanedPhone = cleanPhone(row["Number"] || row["phone"]);
    // ✅ قراءة من عمود "Name" أو "name"
    const name = (row["Name"] || row["name"])?.toString().trim();

    // 🔍 Debug: طباعة البيانات لأول 3 صفوف للتأكد
    if (rawData.indexOf(row) < 3) {
      console.log(`\n🔍 Row ${rawData.indexOf(row) + 1}:`, {
        rawRow: row,
        extractedName: name,
        extractedPhone: cleanedPhone
      });
    }

    // Skip invalid rows
    if (!name) {
      skippedRecords.push({ reason: "Empty name", row });
      continue;
    }
    if (!cleanedPhone) {
      skippedRecords.push({ reason: "Invalid phone", row });
      continue;
    }

    const data = {
      name,
      phone: cleanedPhone,
      source: row["source"] || "import", // مصدر الزائر
      notes: row["notes"]?.toString() || null,
      status: row["status"] || "pending" // الحالة الافتراضية
    };

    // حفظ السجل في Map - لو الرقم مكرر هيستبدل القديم بالجديد تلقائياً
    visitorsMap.set(cleanedPhone, data);
  }

  // تحويل Map إلى array
  const records = Array.from(visitorsMap.values());

  console.log(`\n📦 After cleaning: ${records.length} visitors ready to process`);
  console.log(`⚠️  Skipped: ${skippedRecords.length} records`);

  if (skippedRecords.length > 0) {
    console.log("\n⚠️  First 10 skipped records:");
    skippedRecords.slice(0, 10).forEach((s, i) => {
      console.log(`${i + 1}. ${s.reason}:`, JSON.stringify(s.row, null, 2));
    });
  }

  console.log("\n⏳ Starting fresh import in 5 seconds...");
  console.log("⚠️  ALL EXISTING VISITORS WILL BE DELETED!");
  console.log("Press Ctrl+C to cancel if needed.\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  let created = 0;
  let failed = 0;
  const errors = [];

  console.log("🚀 Starting fresh import (all records will be created)...\n");

  for (const record of records) {
    try {
      // إضافة زائر جديد
      await prisma.visitor.create({ data: record });
      created++;
      if (created % 50 === 0) {
        console.log(`✅ Created ${created}/${records.length} visitors...`);
      }
    } catch (err) {
      failed++;
      errors.push({ record, error: err.message });
      if (failed <= 10) {
        console.log(`\n❌ Error creating:`, record.name);
        console.log(err.message);
      }
    }
  }

  console.log("\n=================================================");
  console.log(`✅ FRESH IMPORT COMPLETE`);
  console.log(`=================================================`);
  console.log(`➕ New visitors created: ${created}`);
  console.log(`⚠️  Failed: ${failed}`);
  console.log(`📊 Skipped during parsing: ${skippedRecords.length}`);
  console.log(`📈 Success rate: ${((created / records.length) * 100).toFixed(1)}%`);
  console.log(`=================================================`);

  // Save error log
  if (errors.length > 0 || skippedRecords.length > 0) {
    const errorLog = {
      summary: {
        totalRows: rawData.length,
        newVisitors: created,
        failed,
        skipped: skippedRecords.length,
        timestamp: new Date().toISOString()
      },
      errors,
      skipped: skippedRecords
    };

    fs.writeFileSync(
      "import-visitors-errors.json",
      JSON.stringify(errorLog, null, 2)
    );
    console.log("\n📄 Full log saved to import-visitors-errors.json");
  }
}

importVisitors()
  .catch((err) => console.error("\n💥 Fatal error:", err))
  .finally(() => prisma.$disconnect());
