# PT Remaining Amount Feature

## Overview
Added support for tracking remaining balance (الباقي) for PT subscriptions.

## What's New ✨

### 1. Database Schema
- Added `remainingAmount` field to PT model (Float, default: 0)
- Applied via `npx prisma db push`

### 2. Frontend Changes

#### PT Page Form
- Added "الباقي" field in the form with orange styling
- Auto-calculates paid amount: `paidAmount = totalPrice - remainingAmount`
- Shows both paid and remaining amounts in the summary box

#### Form Layout
```
السعر الإجمالي (ج.م) *  [required, yellow background]
الباقي (ج.م)              [optional, orange background]
سعر الجلسة (تلقائي)       [calculated, gray background]
```

#### Summary Box Display
```
💰 الإجمالي النهائي: 1600 ج.م
سعر الجلسة الواحدة: 200 ج.م
المدفوع: 1200 ج.م
الباقي: 400 ج.م
```

### 3. Backend Changes

#### API Route Updates
- POST endpoint accepts `remainingAmount` field
- Calculates `paidAmount = totalPrice - remainingAmount`
- Receipt amount now shows paid amount only (not total)
- Receipt itemDetails includes:
  - `totalAmount`: Total subscription price
  - `paidAmount`: Amount actually paid
  - `remainingAmount`: Balance due

#### Receipt Creation Logic
```typescript
const totalAmount = sessionsPurchased * pricePerSession
const paidAmount = totalAmount - (remainingAmount || 0)

// Receipt shows paidAmount
receipt.amount = paidAmount
```

## Usage Example

### Creating PT with Remaining Balance
1. Enter client details
2. Set total price: 1600 ج.م (for 8 sessions)
3. Set remaining amount: 400 ج.م
4. System auto-calculates:
   - Price per session: 200 ج.م
   - Paid amount: 1200 ج.م
5. Receipt shows 1200 ج.م (paid amount)

## Benefits 🎯

1. **Track Unpaid Balances**: Know exactly how much each client owes
2. **Accurate Receipts**: Receipts show only paid amounts for accurate accounting
3. **Flexible Payments**: Allow partial payments on PT subscriptions
4. **Better Financial Reporting**: Separate total subscription value from collected cash

## Data Structure

### PT Model
```prisma
model PT {
  ptNumber          Int
  clientName        String
  sessionsPurchased Int
  pricePerSession   Float
  remainingAmount   Float @default(0)  // New field
  // ... other fields
}
```

### Receipt ItemDetails
```json
{
  "ptNumber": 1001,
  "clientName": "Ahmed",
  "sessionsPurchased": 8,
  "pricePerSession": 200,
  "totalAmount": 1600,
  "paidAmount": 1200,
  "remainingAmount": 400,
  "coachName": "Coach Name"
}
```

## Important Notes ⚠️

1. **Default Value**: remainingAmount defaults to 0 (full payment)
2. **Optional Field**: Field is optional - can be left empty for full payment
3. **Receipt Amount**: Receipt always shows paid amount, not total
4. **Historical Data**: Existing PT records will have remainingAmount = 0

## Files Modified

1. `prisma/schema.prisma` - Added remainingAmount field
2. `app/pt/page.tsx` - Added UI field and calculations
3. `app/api/pt/route.ts` - Added backend handling

---
**Created**: December 2025
**Purpose**: Better tracking of PT payment balances
