'use client'

import { useState } from 'react';

interface ReceiptWhatsAppProps {
  receipt: {
    id: string;
    receiptNumber: number;
    type: string;
    amount: number;
    itemDetails: string;
    paymentMethod: string;
    staffName?: string;
    createdAt: string;
    memberId?: string;
    ptNumber?: number;
    dayUseId?: string;
  };
  onDetailsClick?: () => void;
}

export default function ReceiptWhatsApp({ receipt, onDetailsClick }: ReceiptWhatsAppProps) {
  const [showSendModal, setShowSendModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  const details = JSON.parse(receipt.itemDetails);

  const prepareReceiptMessage = (data: any) => {
    const details = data.details;
    const date = new Date(data.date);
    const formattedDate = date.toLocaleDateString('ar-EG');
    const formattedTime = date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    // الترويسة
    let message = `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*ايصال رقم #${data.receiptNumber}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // نوع الإيصال
    const typeName = data.type === 'Member' ? 'اشتراك عضوية' : data.type === 'PT' ? 'تدريب شخصي' : data.type === 'DayUse' ? 'Day Use' : data.type === 'Expense' ? 'مصروف' : data.type;
    message += `*النوع:* ${typeName}\n\n`;

    // تفاصيل العميل/العضو
    if (details.memberNumber) {
      message += `*رقم العضو:* ${details.memberNumber}\n`;
    }
    if (details.memberName || details.clientName || details.name) {
      message += `*الاسم:* ${details.memberName || details.clientName || details.name}\n`;
    }
    if (details.phone || details.memberPhone || details.clientPhone) {
      message += `*الهاتف:* ${details.phone || details.memberPhone || details.clientPhone}\n`;
    }
    message += `\n`;

    // تفاصيل الاشتراك (للأعضاء)
    if (data.type === 'Member' && details.subscriptionDays) {
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `*تفاصيل الاشتراك*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      if (details.startDate) {
        message += `• من: ${new Date(details.startDate).toLocaleDateString('ar-EG')}\n`;
      }
      if (details.expiryDate) {
        message += `• الى: ${new Date(details.expiryDate).toLocaleDateString('ar-EG')}\n`;
      }
      message += `• المدة: ${details.subscriptionDays} يوم\n`;

      // الخدمات الإضافية
      const extras = [];
      if (details.freePTSessions > 0) extras.push(`${details.freePTSessions} جلسة PT`);
      if (details.inBodyScans > 0) extras.push(`${details.inBodyScans} InBody`);
      if (details.invitations > 0) extras.push(`${details.invitations} دعوة`);
      if (extras.length > 0) {
        message += `*هدايا:* ${extras.join(' + ')}\n`;
      }
      message += `\n`;
    }

    // تفاصيل PT
    if (data.type === 'PT') {
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      message += `*تفاصيل التدريب*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━\n`;
      if (details.ptNumber) {
        message += `• رقم PT: ${details.ptNumber}\n`;
      }
      if (details.sessions) {
        message += `• عدد الجلسات: ${details.sessions}\n`;
      }
      if (details.pricePerSession) {
        message += `• سعر الجلسة: ${details.pricePerSession} ج.م\n`;
      }
      message += `\n`;
    }

    // المبالغ المالية
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*التفاصيل المالية*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;

    if (details.subscriptionPrice > 0) {
      message += `• سعر الاشتراك: ${details.subscriptionPrice} ج.م\n`;
    }
    if (details.totalPrice > 0 && data.type === 'PT') {
      message += `• الاجمالي: ${details.totalPrice} ج.م\n`;
    }

    message += `*المدفوع:* ${data.amount} ج.م\n`;

    if (details.remainingAmount > 0) {
      message += `*المتبقي:* ${details.remainingAmount} ج.م\n`;
    }

    // طريقة الدفع
    const paymentName = data.paymentMethod === 'cash' ? 'كاش' : data.paymentMethod === 'visa' ? 'فيزا' : data.paymentMethod === 'instapay' ? 'InstaPay' : data.paymentMethod === 'wallet' ? 'محفظة' : data.paymentMethod;
    message += `*طريقة الدفع:* ${paymentName}\n`;
    message += `\n`;

    // التاريخ والموظف
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*التاريخ:* ${formattedDate}\n`;
    message += `*الوقت:* ${formattedTime}\n`;
    if (details.staffName || data.staffName) {
      message += `*الموظف:* ${details.staffName || data.staffName}\n`;
    }
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // ملاحظة الشكر
    message += `شكرا لثقتكم بنا\n`;
    message += `نتمنى لكم تجربة رائعة\n\n`;

    // رابط الموقع
    message += `🌐 *الموقع الإلكتروني:*\n`;
    message += `https://www.xgym.website/`;

    return message;
  };

  const handleSendWhatsApp = () => {
    if (!phone || phone.trim().length < 10) {
      alert('⚠️ يرجى إدخال رقم هاتف صحيح');
      return;
    }

    setSending(true);

    const receiptMessage = prepareReceiptMessage({
      receiptNumber: receipt.receiptNumber,
      type: receipt.type,
      amount: receipt.amount,
      memberName: details.memberName || details.clientName || details.name,
      memberNumber: details.memberNumber,
      date: receipt.createdAt,
      paymentMethod: receipt.paymentMethod,
      details: details,
    });

    try {
      // تنظيف رقم الهاتف من أي أحرف غير رقمية
      const cleanPhone = phone.replace(/\D/g, '');
      // فتح واتساب مباشرة
      const url = `https://wa.me/2${cleanPhone}?text=${encodeURIComponent(receiptMessage)}`;
      window.open(url, '_blank');

      alert('✅ سيتم فتح واتساب الآن');
      setShowSendModal(false);
      setPhone('');
    } catch (err) {
      console.error(err);
      alert('❌ حدث خطأ أثناء الإرسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {onDetailsClick && (
          <button
            onClick={onDetailsClick}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
          >
            👁️
          </button>
        )}

        {/* زر الواتساب يظهر دائماً - إذا كان هناك رقم محفوظ سيتم ملؤه تلقائياً، وإلا سيُطلب إدخاله يدوياً */}
        <button
          onClick={() => {
            const phoneNumber = details.phone || details.memberPhone || details.clientPhone;
            if (phoneNumber) {
              setPhone(phoneNumber);
            }
            setShowSendModal(true);
          }}
          className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
          title={details.phone || details.memberPhone || details.clientPhone ? 'إرسال عبر واتساب' : 'إرسال عبر واتساب (أدخل الرقم يدوياً)'}
        >
          📲
        </button>
      </div>

      {showSendModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSendModal(false);
              setPhone('');
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">📱</span>
                <div>
                  <h3 className="text-2xl font-bold">إرسال تفاصيل الإيصال</h3>
                  <p className="text-sm text-gray-500">إيصال #{receipt.receiptNumber}</p>
                </div>
              </div>
              <button onClick={() => { setShowSendModal(false); setPhone(''); }} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">×</button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">📞 رقم الهاتف *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-lg"
                dir="ltr"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSendWhatsApp}
                disabled={sending || !phone || phone.trim().length < 10}
                className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                {sending ? <>⏳ جاري الإرسال...</> : <>📲 إرسال عبر واتساب</>}
              </button>

              <button
                onClick={() => { setShowSendModal(false); setPhone(''); }}
                disabled={sending}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
