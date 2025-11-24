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
    // هنا نفس دالتك القديمة لتجهيز نص الرسالة
    return `إيصال #${data.receiptNumber}\nالعميل: ${data.memberName}\nالمبلغ: ${data.amount} ج.م\nطريقة الدفع: ${data.paymentMethod}\nتاريخ: ${data.date}`;
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

  const handleAutoSend = () => {
    const phoneNumber = details.phone || details.memberPhone || details.clientPhone;

    if (!phoneNumber) {
      alert('⚠️ رقم الهاتف غير متوفر في تفاصيل الإيصال');
      return;
    }

    setPhone(phoneNumber);
    setShowSendModal(true);
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

        {(details.phone || details.memberPhone || details.clientPhone) && (
          <button
            onClick={handleAutoSend}
            className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1"
          >
            📲
          </button>
        )}
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
