import sqlite3
import pandas as pd
from datetime import datetime, timedelta
import uuid
import re

DB_PATH = "dev.db"
EXCEL_PATH = "مشتركين الجيم[1].xlsx"

print("🔹 بدء التنفيذ...")

# --- فتح قاعدة البيانات ---
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# --- التأكد من وجود جدول Member ---
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Member';")
if not cursor.fetchone():
    raise Exception("❌ الجدول 'Member' غير موجود في قاعدة البيانات.")

print("✅ جدول Member موجود.")

# --- مسح البيانات القديمة ---
print("🧹 مسح البيانات القديمة...")
cursor.execute("DELETE FROM Member;")
cursor.execute("DELETE FROM Receipt WHERE memberId IS NOT NULL;")
cursor.execute("DELETE FROM Invitation;")
conn.commit()

# --- قراءة ملف الإكسل ---
print("📖 قراءة ملف الإكسل...")
df = pd.read_excel(EXCEL_PATH)

print(f"📊 الأعمدة الموجودة: {list(df.columns)}")
print(f"📊 أول 3 صفوف:")
print(df.head(3))

# --- تحديد الأعمدة حسب البيانات الفعلية ---
# A = الأيام المتبقية
# B = رقم التليفون  
# C = كود اللاعب
# D = اسم اللاعب

columns_map = {
    'Unnamed: 0': 'days',          # العمود A - الأيام المتبقية
    'Unnamed: 1': 'phone',         # العمود B - رقم التليفون
    'Unnamed: 2': 'memberNumber',  # العمود C - كود اللاعب
    'Unnamed: 3': 'name'           # العمود D - اسم اللاعب
}

df = df.rename(columns=columns_map)

# --- تخطي الصف الأول (العناوين بالعربي) ---
df = df.iloc[1:].reset_index(drop=True)

# --- الحصول على آخر رقم عضو من MemberCounter ---
cursor.execute("SELECT current FROM MemberCounter WHERE id = 1;")
result = cursor.fetchone()
if result:
    next_member_number = result[0] + 1
else:
    next_member_number = 1001
    cursor.execute("INSERT INTO MemberCounter (id, current) VALUES (1, 1000);")
    conn.commit()

today = datetime.now()
records = []

# --- تجهيز السجلات ---
for _, row in df.iterrows():
    # تخطي الصفوف الفارغة
    if pd.isna(row.get('name')) or str(row.get('name')).strip() == '':
        continue
    
    # توليد ID فريد
    member_id = str(uuid.uuid4()).replace('-', '')[:25]
    
    name = str(row.get('name', '')).strip()
    phone = str(row.get('phone', '')).strip()
    
    # تنظيف رقم التليفون (إزالة المسافات والأصفار الزائدة)
    phone = phone.replace(' ', '').replace('-', '')
    
    # تحديد رقم العضو من Excel
    try:
        memberNumber = int(row.get('memberNumber', 0))
        if memberNumber <= 0:
            memberNumber = next_member_number
            next_member_number += 1
    except:
        memberNumber = next_member_number
        next_member_number += 1

    # حساب الأيام المتبقية
    try:
        days = int(row.get('days', 0))
    except:
        days = 0
    
    # إذا كانت الأيام سالبة أو صفر، اعتبر العضوية منتهية
    if days < 0:
        days = 0

    startDate = today.strftime("%Y-%m-%d")
    expiryDate = (today + timedelta(days=days)).strftime("%Y-%m-%d")
    createdAt = today.strftime("%Y-%m-%d %H:%M:%S")

    # تحديد حالة العضوية
    isActive = 1 if days > 0 else 0

    record = (
        member_id,           # id
        memberNumber,        # memberNumber
        name,                # name
        phone,               # phone
        None,                # profileImage
        0,                   # inBodyScans
        0,                   # invitations
        0,                   # freePTSessions
        0.0,                 # subscriptionPrice
        0.0,                 # remainingAmount
        f"تم الاستيراد من Excel - الأيام المتبقية: {days}",  # notes
        isActive,            # isActive
        startDate,           # startDate
        expiryDate,          # expiryDate
        createdAt            # createdAt
    )
    records.append(record)

print(f"📦 عدد السجلات الجاهزة: {len(records)}")

# --- إدخال البيانات ---
try:
    cursor.executemany("""
        INSERT INTO Member 
        (id, memberNumber, name, phone, profileImage,
         inBodyScans, invitations, freePTSessions, subscriptionPrice,
         remainingAmount, notes, isActive, startDate, expiryDate, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, records)
    
    # تحديث MemberCounter
    cursor.execute("UPDATE MemberCounter SET current = ? WHERE id = 1;", (next_member_number - 1,))
    
    conn.commit()
    print(f"✅ تم إدخال {len(records)} مشترك بنجاح إلى قاعدة البيانات.")
    print(f"📊 آخر رقم عضو مستخدم: {next_member_number - 1}")
    
except Exception as e:
    print(f"❌ حدث خطأ أثناء الإدخال: {e}")
    conn.rollback()
    raise

conn.close()
print("🔒 تم الإغلاق بنجاح.")