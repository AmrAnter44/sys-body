-- Migration: تحويل staffCode من Int إلى String مع إضافة "s" في البداية
-- التاريخ: 2025-12-06

-- الخطوة 1: إنشاء عمود جديد مؤقت
ALTER TABLE Staff ADD COLUMN staffCode_new TEXT;

-- الخطوة 2: نسخ البيانات مع إضافة "s" في البداية
UPDATE Staff SET staffCode_new = 's' || CAST(staffCode AS TEXT);

-- الخطوة 3: حذف العمود القديم
ALTER TABLE Staff DROP COLUMN staffCode;

-- الخطوة 4: إعادة تسمية العمود الجديد
ALTER TABLE Staff RENAME COLUMN staffCode_new TO staffCode;

-- الخطوة 5: إضافة unique constraint
CREATE UNIQUE INDEX Staff_staffCode_key ON Staff(staffCode);
