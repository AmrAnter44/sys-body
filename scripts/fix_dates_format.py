import sqlite3
from datetime import datetime

DB_PATH = "dev.db"

print("📅 إصلاح صيغة التواريخ لتتوافق مع Prisma...")

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# --- إصلاح التواريخ في جدول Member ---
print("🔧 تحديث صيغة التواريخ...")

cursor.execute("""
    SELECT id, startDate, expiryDate, createdAt 
    FROM Member
""")

members = cursor.fetchall()
updated = 0

for member_id, start_date, expiry_date, created_at in members:
    changes_made = False
    
    # إصلاح startDate
    if start_date and len(str(start_date)) == 10:  # YYYY-MM-DD فقط
        new_start = f"{start_date} 00:00:00"
        cursor.execute("UPDATE Member SET startDate = ? WHERE id = ?", (new_start, member_id))
        changes_made = True
    
    # إصلاح expiryDate
    if expiry_date and len(str(expiry_date)) == 10:
        new_expiry = f"{expiry_date} 23:59:59"
        cursor.execute("UPDATE Member SET expiryDate = ? WHERE id = ?", (new_expiry, member_id))
        changes_made = True
    
    # إصلاح createdAt
    if created_at and len(str(created_at)) == 10:
        new_created = f"{created_at} 00:00:00"
        cursor.execute("UPDATE Member SET createdAt = ? WHERE id = ?", (new_created, member_id))
        changes_made = True
    
    if changes_made:
        updated += 1

conn.commit()

print(f"✅ تم تحديث {updated} سجل")

# --- التحقق من النتيجة ---
print("\n📊 عرض عينة من البيانات المحدثة:")
cursor.execute("SELECT name, startDate, expiryDate, createdAt FROM Member LIMIT 3")
samples = cursor.fetchall()

for name, start, expiry, created in samples:
    print(f"\n   الاسم: {name}")
    print(f"   تاريخ البدء: {start}")
    print(f"   تاريخ الانتهاء: {expiry}")
    print(f"   تاريخ الإنشاء: {created}")

conn.close()

print("\n✅ تم إصلاح صيغة التواريخ بنجاح!")
print("🔄 الآن جرب: npx prisma generate")
print("💡 ثم أعد تشغيل التطبيق")