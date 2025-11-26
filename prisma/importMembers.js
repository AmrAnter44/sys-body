import { PrismaClient } from "@prisma/client";
import fs from "fs";
import ExcelJS from "exceljs";

const prisma = new PrismaClient();

// -------- Helper: clean phone number -------------
function cleanPhone(phone) {
  if (!phone || phone === "-") return null;
  return phone.toString().replace(/\D/g, "");
}

// -------- Helper: convert Excel date to JS Date --------
function parseExcelDate(value) {
  if (!value || value === "-") return null;

  // If it's already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // If it's an Excel serial number
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }

  // If it's a string, try parsing
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "-") return null;

    // Handle DD/MM/YYYY format
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);

      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? null : date;
      }
    }

    // Try standard date parsing
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

// -------- Helper: parse member number safely --------
function parseMemberNumber(value) {
  if (!value || value === "" || value === "-") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

async function importExcel() {
  // 🗑️ مسح كل البيانات المرتبطة بالأعضاء أولاً
  console.log("🗑️  Deleting all related data and members...");
  try {
    // مسح البيانات المرتبطة أولاً (بالترتيب الصحيح)
    const invitations = await prisma.invitation.deleteMany({});
    console.log(`   ✓ Deleted ${invitations.count} invitations`);
    
    const receipts = await prisma.receipt.deleteMany({
      where: { memberId: { not: null } }
    });
    console.log(`   ✓ Deleted ${receipts.count} member receipts`);
    
    // دلوقتي نقدر نمسح الأعضاء
    const members = await prisma.member.deleteMany({});
    console.log(`   ✓ Deleted ${members.count} members\n`);
    
    console.log(`✅ Database cleared successfully!\n`);
  } catch (err) {
    console.error("❌ Error deleting data:", err.message);
    throw err;
  }

  console.log("📖 Reading Excel file...");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(
    "C:\\Users\\amran\\Desktop\\gym\\gym-management\\prisma\\2.xlsx"
  );

  const worksheet = workbook.worksheets[0];
  const sheetName = worksheet.name;

  console.log(`📊 Reading sheet: ${sheetName}`);

  // Convert worksheet to JSON format similar to xlsx.utils.sheet_to_json
  const rawData = [];
  const headers = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row contains headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value;
      });
    } else {
      // Data rows
      const rowData = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        rawData.push(rowData);
      }
    }
  });

  console.log(`📊 Found ${rawData.length} rows in Excel file`);

  // 🔍 Debug: Show actual column names
  if (rawData.length > 0) {
    console.log("\n🔍 DEBUG: Column names in Excel file:");
    console.log(Object.keys(rawData[0]));
    console.log("\n🔍 DEBUG: First row data:");
    console.log(rawData[0]);
  }

  const recordsMap = new Map(); // استخدام Map بدل array لتخزين آخر سجل لكل رقم
  const skippedRecords = [];

  for (const row of rawData) {
    const cleanedPhone = cleanPhone(row["phone"]);
    const name = row["name"]?.toString().trim();

    // Skip invalid rows
    if (!name) {
      skippedRecords.push({ reason: "Empty name", row });
      continue;
    }
    if (!cleanedPhone) {
      skippedRecords.push({ reason: "Invalid phone", row });
      continue;
    }
    // لا نعمل skip للمكررات - بدلاً من ذلك سيتم استبدال السجل القديم بالجديد في Map

    // Parse dates
    const createdAt = parseExcelDate(row["createdAt"]);
    const startDate = parseExcelDate(row["Start Date"]);
    const expiryDate = parseExcelDate(row["End Date"]);

    // Skip records with invalid required dates
    if (!createdAt || !startDate || !expiryDate) {
      skippedRecords.push({
        reason: "Invalid dates",
        row: {
          name,
          phone: cleanedPhone,
          rawCreatedAt: row["createdAt"],
          rawStartDate: row["Start Date"],
          rawExpiryDate: row["End Date"],
          createdAt,
          startDate,
          expiryDate
        }
      });
      continue;
    }

    // ✅ تحديد isActive بناءً على تاريخ الانتهاء
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isActive = expiryDate >= today; // نشط إذا لم ينته بعد

    const data = {
      createdAt,
      startDate,
      expiryDate,
      memberNumber: parseMemberNumber(row["memberNumber"]),
      name,
      phone: cleanedPhone,
      subscriptionPrice: parseFloat(row["subscriptionPrice"]) || 0,
      remainingAmount: parseFloat(row["remainingAmount"]) || 0,
      notes: row["Reception Name"] ? `Reception: ${row["Reception Name"]}` : null,
      isActive // ✅ إضافة isActive
    };

    // حفظ السجل في Map - لو الرقم مكرر هيستبدل القديم بالجديد تلقائياً
    recordsMap.set(cleanedPhone, data);
  }

  // تحويل Map إلى array
  const records = Array.from(recordsMap.values());

  console.log(`\n📦 After cleaning: ${records.length} members ready to process`);
  console.log(`⚠️  Skipped: ${skippedRecords.length} records`);

  if (skippedRecords.length > 0) {
    console.log("\n⚠️  First 10 skipped records:");
    skippedRecords.slice(0, 10).forEach((s, i) => {
      console.log(`${i + 1}. ${s.reason}:`, JSON.stringify(s.row, null, 2));
    });
  }

  console.log("\n⏳ Starting fresh import in 5 seconds...");
  console.log("⚠️  ALL EXISTING MEMBERS WILL BE DELETED!");
  console.log("Press Ctrl+C to cancel if needed.\n");
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  let created = 0;
  let failed = 0;
  const errors = [];

  console.log("🚀 Starting fresh import (all records will be created)...\n");

  for (const record of records) {
    try {
      // إضافة عضو جديد مباشرة (لأننا مسحنا كل البيانات القديمة)
      await prisma.member.create({ data: record });
      created++;
      if (created % 50 === 0) {
        console.log(`✅ Created ${created}/${records.length} members...`);
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
  console.log(`➕ New members created: ${created}`);
  console.log(`⚠️  Failed: ${failed}`);
  console.log(`📊 Skipped during parsing: ${skippedRecords.length}`);
  console.log(`📈 Success rate: ${((created / records.length) * 100).toFixed(1)}%`);
  console.log(`=================================================`);

  // Save error log
  if (errors.length > 0 || skippedRecords.length > 0) {
    const errorLog = {
      summary: {
        totalRows: rawData.length,
        newMembers: created,
        failed,
        skipped: skippedRecords.length,
        timestamp: new Date().toISOString()
      },
      errors,
      skipped: skippedRecords
    };

    fs.writeFileSync(
      "import-errors.json",
      JSON.stringify(errorLog, null, 2)
    );
    console.log("\n📄 Full log saved to import-errors.json");
  }
}

importExcel()
  .catch((err) => console.error("\n💥 Fatal error:", err))
  .finally(() => prisma.$disconnect());