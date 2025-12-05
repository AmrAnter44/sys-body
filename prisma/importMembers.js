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
  // 🗑️ مسح جميع الإيصالات أولاً (بالكامل)
  console.log("🗑️  Deleting all receipts and related data...");
  try {
    // مسح جميع الإيصالات أولاً (وليس فقط إيصالات الأعضاء)
    const allReceipts = await prisma.receipt.deleteMany({});
    console.log(`   ✓ Deleted ${allReceipts.count} ALL receipts`);

    // إعادة تعيين عداد الإيصالات
    await prisma.receiptCounter.deleteMany({});
    console.log(`   ✓ Reset receipt counter`);

    // مسح الدعوات المرتبطة بالأعضاء
    const invitations = await prisma.invitation.deleteMany({});
    console.log(`   ✓ Deleted ${invitations.count} invitations`);

    // دلوقتي نقدر نمسح الأعضاء
    const members = await prisma.member.deleteMany({});
    console.log(`   ✓ Deleted ${members.count} members\n`);

    console.log(`✅ Database cleared successfully (including ALL receipts)!\n`);
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

      // ✅ إضافة رقم الإيصال من العمود B (Column 2)
      const receiptNumberFromExcel = row.getCell(2).value; // العمود B
      if (receiptNumberFromExcel) {
        rowData['receiptNumber'] = receiptNumberFromExcel;
      }

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
    console.log("\n🔍 DEBUG: Receipt number from Column B:", rawData[0]['receiptNumber']);
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

    // ✅ قراءة رقم الإيصال من Excel
    const receiptNumberFromExcel = row["receiptNumber"]
      ? parseInt(row["receiptNumber"].toString())
      : null;

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
      isActive, // ✅ إضافة isActive
      receiptNumber: receiptNumberFromExcel // ✅ إضافة رقم الإيصال من Excel
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
  console.log("⚠️  ALL EXISTING MEMBERS AND RECEIPTS WILL BE DELETED!");
  console.log("Press Ctrl+C to cancel if needed.\n");

  await new Promise(resolve => setTimeout(resolve, 5000));

  let created = 0;
  let failed = 0;
  const errors = [];

  console.log("🚀 Starting fresh import...\n");
  console.log(`📝 Using receipt numbers from Excel (Column B)\n`);

  let receiptsCreated = 0;
  let maxReceiptNumber = 1000; // لتتبع أعلى رقم إيصال

  for (const record of records) {
    try {
      // إزالة receiptNumber من بيانات العضو
      const { receiptNumber, ...memberData } = record;

      // إضافة عضو جديد مباشرة (لأننا مسحنا كل البيانات القديمة)
      const member = await prisma.member.create({ data: memberData });
      created++;

      // ✅ استخدام رقم الإيصال من Excel أو إنشاء رقم تلقائي
      const receiptNumberToUse = receiptNumber || (maxReceiptNumber + 1);

      // تحديث أعلى رقم إيصال
      if (receiptNumberToUse > maxReceiptNumber) {
        maxReceiptNumber = receiptNumberToUse;
      }

      const receiptDetails = {
        memberNumber: member.memberNumber,
        memberName: member.name,
        subscriptionPrice: member.subscriptionPrice,
        paidAmount: member.subscriptionPrice - member.remainingAmount,
        remainingAmount: member.remainingAmount,
        startDate: member.startDate?.toISOString().split('T')[0],
        expiryDate: member.expiryDate?.toISOString().split('T')[0],
        type: 'اشتراك جديد'
      };

      await prisma.receipt.create({
        data: {
          receiptNumber: receiptNumberToUse,
          type: 'عضوية',
          amount: member.subscriptionPrice - member.remainingAmount,
          itemDetails: JSON.stringify(receiptDetails),
          paymentMethod: 'cash',
          memberId: member.id,
          createdAt: member.createdAt
        }
      });
      receiptsCreated++;

      if (created % 50 === 0) {
        console.log(`✅ Created ${created}/${records.length} members and ${receiptsCreated} receipts (using Excel receipt numbers)...`);
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

  // إنشاء عداد الإيصالات بأعلى رقم + 1
  await prisma.receiptCounter.create({
    data: {
      id: 1,
      current: maxReceiptNumber + 1
    }
  });
  console.log(`\n📝 Created receipt counter starting from: ${maxReceiptNumber + 1}`);

  console.log("\n=================================================");
  console.log(`✅ FRESH IMPORT COMPLETE`);
  console.log(`=================================================`);
  console.log(`➕ New members created: ${created}`);
  console.log(`📝 Receipts created: ${receiptsCreated} (using Excel receipt numbers from Column B)`);
  console.log(`🔢 Highest receipt number: ${maxReceiptNumber}`);
  console.log(`📊 Next receipt number will be: ${maxReceiptNumber + 1}`);
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
        receiptsCreated,
        maxReceiptNumber,
        nextReceiptNumber: maxReceiptNumber + 1,
        failed,
        skipped: skippedRecords.length,
        timestamp: new Date().toISOString(),
        note: "Receipt numbers imported from Excel Column B"
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