// lib/barcodeUtils.ts
import bwipjs from 'bwip-js'

/**
 * توليد Barcode كصورة Base64
 */
export async function generateBarcode(text: string): Promise<string> {
  try {
    const canvas = document.createElement('canvas')
    
    bwipjs.toCanvas(canvas, {
      bcid: 'code128',       // نوع الباركود
      text: text,            // النص المراد تحويله
      scale: 6,              // حجم الصورة
      height: 14,            // ارتفاع الباركود (بالمليمتر)
      includetext: true,     // عرض النص تحت الباركود
      textxalign: 'center',  // محاذاة النص
      backgroundcolor: 'ffffff',  // ✅ خلفية بيضاء
      barcolor: '000000',         // ✅ لون الباركود أسود
      textcolor: '000000',        // ✅ لون النص أسود
      paddingwidth: 24,           // ✅ مسافة من الجوانب
      paddingheight: 12,           // ✅ مسافة من أعلى وأسفل
    })
    
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error generating barcode:', error)
    throw error
  }
}

/**
 * تحويل Base64 إلى Blob للتحميل
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(';base64,')
  const contentType = parts[0].split(':')[1]
  const raw = window.atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }

  return new Blob([uInt8Array], { type: contentType })
}

/**
 * تحميل الباركود كصورة
 */
export function downloadBarcode(base64: string, filename: string) {
  const link = document.createElement('a')
  link.href = base64
  link.download = filename
  link.click()
}

/**
 * إرسال رسالة WhatsApp مع نص
 */
export function sendWhatsAppMessage(phone: string, message: string) {
  // تنظيف رقم الهاتف
  const cleanPhone = phone.replace(/\D/g, '')
  
  // إضافة كود مصر إذا لم يكن موجود
  let fullPhone = cleanPhone
  if (!cleanPhone.startsWith('20') && cleanPhone.length === 11) {
    fullPhone = '20' + cleanPhone
  } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
    fullPhone = '20' + cleanPhone
  }
  
  // تشفير الرسالة
  const encodedMessage = encodeURIComponent(message)
  
  // فتح WhatsApp
  const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodedMessage}`
  window.open(whatsappUrl, '_blank')
}

/**
 * إعداد رسالة الباركود
 */
export function prepareBarcodeMessage(memberNumber: number, memberName: string): string {
  return `مرحباً ${memberName} 👋

🎫 *رقم العضوية الخاص بك:* #${memberNumber}

يمكنك استخدام هذا الرقم للدخول إلى الجيم 💪

شكراً لانضمامك إلينا! 🏋️‍♂️`
}

/**
 * إعداد رسالة تفاصيل الإيصال
 */
export function prepareReceiptMessage(receipt: {
  receiptNumber: number
  type: string
  amount: number
  memberName?: string
  memberNumber?: number
  date: string
  paymentMethod: string
  details: any
}): string {
  const typeLabels: { [key: string]: string } = {
    'Member': '🎫 اشتراك عضوية',
    'تجديد عضويه': '🔄 تجديد اشتراك',
    'PT': '💪 تدريب شخصي',
    'DayUse': '📅 يوم استخدام',
    'InBody': '⚖️ فحص InBody',
    'Payment': '💰 دفع متبقي'
  }

  const paymentLabels: { [key: string]: string } = {
    'cash': '💵 كاش',
    'visa': '💳 فيزا',
    'instapay': '📱 إنستا باي',
    'wallet': '💰 محفظة'
  }

  let message = `*🧾 إيصال رقم ${receipt.receiptNumber}*\n\n`
  message += `━━━━━━━━━━━━━━━━━━━━\n\n`
  
  // معلومات العميل
  if (receipt.memberName) {
    message += `👤 *الاسم:* ${receipt.memberName}\n`
  }
  if (receipt.memberNumber) {
    message += `🎫 *رقم العضوية:* #${receipt.memberNumber}\n`
  }
  message += `\n`
  
  // نوع العملية
  message += `📋 *نوع العملية:* ${typeLabels[receipt.type] || receipt.type}\n\n`
  
  // تفاصيل الدفع
  message += `💰 *المبلغ المدفوع:* ${receipt.amount.toFixed(0)} جنيه\n`
  message += `💳 *طريقة الدفع:* ${paymentLabels[receipt.paymentMethod] || receipt.paymentMethod}\n\n`
  
  // التفاصيل الإضافية
  if (receipt.details) {
    if (receipt.details.subscriptionPrice) {
      message += `💵 *سعر الاشتراك:* ${receipt.details.subscriptionPrice} جنيه\n`
    }
    
    if (receipt.details.remainingAmount && receipt.details.remainingAmount > 0) {
      message += `⚠️ *المبلغ المتبقي:* ${receipt.details.remainingAmount} جنيه\n`
    }
    
    if (receipt.details.freePTSessions) {
      message += `💪 *حصص PT مجانية:* ${receipt.details.freePTSessions}\n`
    }
    
    if (receipt.details.inBodyScans) {
      message += `⚖️ *حصص InBody:* ${receipt.details.inBodyScans}\n`
    }
    
    if (receipt.details.invitations) {
      message += `🎟️ *دعوات:* ${receipt.details.invitations}\n`
    }
    
    if (receipt.details.newStartDate && receipt.details.newExpiryDate) {
      message += `\n📅 *تاريخ البداية:* ${new Date(receipt.details.newStartDate).toLocaleDateString('ar-EG')}\n`
      message += `📅 *تاريخ الانتهاء:* ${new Date(receipt.details.newExpiryDate).toLocaleDateString('ar-EG')}\n`
    }
    
    if (receipt.details.staffName) {
      message += `\n👷 *الموظف:* ${receipt.details.staffName}\n`
    }
  }
  
  message += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
  message += `📆 *التاريخ:* ${new Date(receipt.date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}\n\n`
  
  message += `شكراً لتعاملك معنا! 🙏\n`
  message += `نتمنى لك تمريناً رائعاً! 💪🏋️‍♂️`

  return message
}