import sqlite3
import re

DB_PATH = "dev.db"

print("🔍 فحص قاعدة البيانات للبحث عن البيانات التالفة...")
print("="*60)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# --- الحصول على جميع الأعمدة ---
cursor.execute("PRAGMA table_info(Member)")
columns = cursor.fetchall()
column_names = [col[1] for col in columns]

print(f"📋 الأعمدة الموجودة: {column_names}\n")

# --- فحص كل عمود ---
problems_found = False

for col_name in column_names:
    print(f"🔍 فحص عمود: {col_name}")
    
    # فحص القيم NULL
    cursor.execute(f"SELECT COUNT(*) FROM Member WHERE {col_name} IS NULL")
    null_count = cursor.fetchone()[0]
    if null_count > 0:
        print(f"   ⚠️  {null_count} قيم NULL")
    
    # فحص القيم الفارغة للنصوص
    if col_name in ['id', 'name', 'phone', 'notes', 'profileImage']:
        cursor.execute(f"SELECT COUNT(*) FROM Member WHERE {col_name} = ''")
        empty_count = cursor.fetchone()[0]
        if empty_count > 0:
            print(f"   ⚠️  {empty_count} قيم فارغة")
    
    # فحص خاص للـ ID
    if col_name == 'id':
        cursor.execute(f"SELECT id, memberNumber, name FROM Member")
        all_ids = cursor.fetchall()
        
        for member_id, mem_num, name in all_ids[:10]:  # أول 10 للعرض
            if not member_id or len(str(member_id)) < 10 or len(str(member_id)) > 30:
                print(f"   ❌ ID غير صالح: '{member_id}' (العضو: {name})")
                problems_found = True
            
            # فحص الأحرف الغريبة
            if not re.match(r'^[a-zA-Z0-9_-]+$', str(member_id)):
                print(f"   ❌ ID يحتوي أحرف غريبة: '{member_id}' (العضو: {name})")
                problems_found = True
    
    # فحص التواريخ
    if col_name in ['startDate', 'expiryDate', 'createdAt']:
        cursor.execute(f"""
            SELECT id, memberNumber, name, {col_name} 
            FROM Member 
            WHERE {col_name} IS NOT NULL 
            LIMIT 5
        """)
        dates = cursor.fetchall()
        
        for member_id, mem_num, name, date_val in dates:
            # فحص صيغة التاريخ
            if date_val and not re.match(r'\d{4}-\d{2}-\d{2}', str(date_val)):
                print(f"   ❌ تاريخ بصيغة خاطئة: '{date_val}' (العضو: {name})")
                problems_found = True
    
    # فحص الأرقام
    if col_name == 'phone':
        cursor.execute(f"""
            SELECT id, memberNumber, name, phone 
            FROM Member 
            WHERE phone IS NOT NULL 
            LIMIT 10
        """)
        phones = cursor.fetchall()
        
        for member_id, mem_num, name, phone in phones:
            if phone and not re.match(r'^[0-9]+$', str(phone)):
                print(f"   ❌ رقم تليفون يحتوي أحرف غير رقمية: '{phone}' (العضو: {name})")
                problems_found = True
    
    print()

# --- عرض أول 5 سجلات كاملة ---
print("="*60)
print("📊 عرض أول 5 سجلات:")
print("="*60)

cursor.execute("SELECT * FROM Member LIMIT 5")
rows = cursor.fetchall()

for idx, row in enumerate(rows, 1):
    print(f"\n🔹 السجل #{idx}:")
    for col_idx, col_name in enumerate(column_names):
        value = row[col_idx]
        # عرض القيم الخطرة
        if value is None:
            display = "NULL"
        elif isinstance(value, str) and not value:
            display = "(فارغ)"
        else:
            display = str(value)[:50]  # أول 50 حرف فقط
        
        print(f"   {col_name:20s}: {display}")

# --- إحصائيات عامة ---
print("\n" + "="*60)
print("📈 إحصائيات عامة:")
print("="*60)

cursor.execute("SELECT COUNT(*) FROM Member")
total = cursor.fetchone()[0]
print(f"إجمالي السجلات: {total}")

cursor.execute("SELECT COUNT(*) FROM Member WHERE id IS NULL OR id = ''")
bad_ids = cursor.fetchone()[0]
print(f"سجلات بـ ID فاسد: {bad_ids}")

cursor.execute("SELECT COUNT(*) FROM Member WHERE name IS NULL OR name = ''")
bad_names = cursor.fetchone()[0]
print(f"سجلات بدون اسم: {bad_names}")

cursor.execute("SELECT COUNT(*) FROM Member WHERE phone IS NULL OR phone = ''")
bad_phones = cursor.fetchone()[0]
print(f"سجلات بدون تليفون: {bad_phones}")

conn.close()

print("\n" + "="*60)
if problems_found:
    print("❌ تم اكتشاف مشاكل في البيانات!")
    print("💡 استخدم سكريبت clean_database.py لإصلاحها")
else:
    print("✅ لم يتم اكتشاف مشاكل واضحة")
    print("💡 المشكلة قد تكون في ترميز النصوص (UTF-8)")
print("="*60)