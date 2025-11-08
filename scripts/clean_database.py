import sqlite3
import re
from datetime import datetime

DB_PATH = "dev.db"

print("🧹 بدء تنظيف قاعدة البيانات...")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# --- 1. تنظيف أرقام التليفونات ---
print("📞 تنظيف أرقام التليفونات...")
cursor.execute("SELECT id, phone FROM Member")
members = cursor.fetchall()

cleaned_phones = 0
for member_id, phone in members:
    if phone:
        # إزالة كل شيء ما عدا الأرقام
        clean_phone = re.sub(r'[^0-9]', '', str(phone))
        
        # إذا كان الرقم فارغاً أو قصير جداً، استخدم رقم افتراضي
        if not clean_phone or len(clean_phone) < 10:
            clean_phone = f"0100000000"
        
        if clean_phone != phone:
            cursor.execute("UPDATE Member SET phone = ? WHERE id = ?", (clean_phone, member_id))
            cleaned_phones += 1

print(f"✅ تم تنظيف {cleaned_phones} رقم تليفون")

# --- 2. إصلاح التواريخ الفاسدة ---
print("📅 إصلاح التواريخ...")
today = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# إصلاح startDate
cursor.execute("UPDATE Member SET startDate = ? WHERE startDate IS NULL OR startDate = ''", (today,))
start_fixed = cursor.rowcount

# إصلاح expiryDate
cursor.execute("UPDATE Member SET expiryDate = ? WHERE expiryDate IS NULL OR expiryDate = ''", (today,))
expiry_fixed = cursor.rowcount

# إصلاح createdAt
cursor.execute("UPDATE Member SET createdAt = ? WHERE createdAt IS NULL OR createdAt = ''", (today,))
created_fixed = cursor.rowcount

print(f"✅ تم إصلاح {start_fixed} startDate، {expiry_fixed} expiryDate، {created_fixed} createdAt")

# --- 3. إصلاح القيم الرقمية ---
print("🔢 إصلاح القيم الرقمية...")

cursor.execute("UPDATE Member SET inBodyScans = 0 WHERE inBodyScans IS NULL")
cursor.execute("UPDATE Member SET invitations = 0 WHERE invitations IS NULL")
cursor.execute("UPDATE Member SET freePTSessions = 0 WHERE freePTSessions IS NULL")
cursor.execute("UPDATE Member SET subscriptionPrice = 0.0 WHERE subscriptionPrice IS NULL")
cursor.execute("UPDATE Member SET remainingAmount = 0.0 WHERE remainingAmount IS NULL")
cursor.execute("UPDATE Member SET isActive = 0 WHERE isActive IS NULL")

print("✅ تم إصلاح القيم الرقمية")

# --- 4. تنظيف الأسماء ---
print("👤 تنظيف الأسماء...")
cursor.execute("SELECT id, name FROM Member WHERE name IS NULL OR name = ''")
empty_names = cursor.fetchall()

for idx, (member_id, _) in enumerate(empty_names):
    cursor.execute("UPDATE Member SET name = ? WHERE id = ?", (f"عضو_{idx+1}", member_id))

print(f"✅ تم إصلاح {len(empty_names)} اسم فارغ")

# --- 5. حذف السجلات التالفة تماماً ---
print("🗑️ حذف السجلات التالفة...")
cursor.execute("""
    DELETE FROM Member 
    WHERE id IS NULL 
    OR id = '' 
    OR LENGTH(id) > 30
""")
deleted = cursor.rowcount
print(f"✅ تم حذف {deleted} سجل تالف")

# --- حفظ التغييرات ---
conn.commit()

# --- عرض إحصائيات ---
cursor.execute("SELECT COUNT(*) FROM Member")
total_members = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM Member WHERE isActive = 1")
active_members = cursor.fetchone()[0]

print("\n" + "="*50)
print("📊 إحصائيات بعد التنظيف:")
print(f"   إجمالي الأعضاء: {total_members}")
print(f"   الأعضاء النشطين: {active_members}")
print(f"   الأعضاء المنتهية عضويتهم: {total_members - active_members}")
print("="*50)

conn.close()
print("\n✅ تم تنظيف قاعدة البيانات بنجاح!")
print("🔄 الآن يمكنك تشغيل: npx prisma generate")