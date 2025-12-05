# Developer Guide: Admin Date Override

## Architecture Overview

### Components:
1. **AdminDateContext** - Global state management
2. **AdminDateOverride** - UI component in Navbar
3. **API Routes** - Backend handling

## How to Add Support to New Pages

### Step 1: Frontend Component

In your page component:

```tsx
import { useAdminDate } from '../../contexts/AdminDateContext'

export default function YourPage() {
  const { customCreatedAt } = useAdminDate()

  // Pass it to your API call
  const response = await fetch('/api/your-endpoint', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      customCreatedAt: customCreatedAt ? customCreatedAt.toISOString() : null
    })
  })
}
```

### Step 2: API Route

In your API route (`/api/your-endpoint/route.ts`):

```ts
export async function POST(request: Request) {
  const body = await request.json()
  const { customCreatedAt, ...otherData } = body

  // For creating records
  const data: any = {
    // your fields
  }

  // Add custom date if provided
  if (customCreatedAt) {
    data.createdAt = new Date(customCreatedAt)
    console.log('⏰ Using custom date:', new Date(customCreatedAt))
  }

  const record = await prisma.yourModel.create({
    data: data
  })

  // Do the same for related records (receipts, etc.)
}
```

## Example: Members Page Implementation

### Frontend:
```tsx
// app/members/page.tsx
const { customCreatedAt } = useAdminDate()

<MemberForm
  customCreatedAt={customCreatedAt}
  onSuccess={() => {}}
/>
```

### MemberForm:
```tsx
// components/MemberForm.tsx
interface MemberFormProps {
  customCreatedAt?: Date | null
}

const cleanedData = {
  ...formData,
  customCreatedAt: customCreatedAt ? customCreatedAt.toISOString() : null
}
```

### API Route:
```ts
// app/api/members/route.ts
const { customCreatedAt, ...body } = await request.json()

const memberData: any = { ...fields }

if (customCreatedAt) {
  memberData.createdAt = new Date(customCreatedAt)
}

const member = await prisma.member.create({ data: memberData })

// Same for receipt
const receiptData: any = { ...receiptFields }

if (customCreatedAt) {
  receiptData.createdAt = new Date(customCreatedAt)
}

await prisma.receipt.create({ data: receiptData })
```

## Testing Checklist

- [ ] Admin sees the date override bar in Navbar
- [ ] Non-admin users don't see the bar
- [ ] Date picker works correctly
- [ ] Time picker works correctly
- [ ] "Now" button resets to current time
- [ ] Created records have the custom date in database
- [ ] Related records (receipts, etc.) also get custom date
- [ ] Disabling the feature returns to normal dates

## Notes

- Always use `toISOString()` when sending dates to API
- Always convert to `new Date()` in the API
- Apply custom date to ALL related records (member + receipt, etc.)
- Log when using custom dates for debugging
- Use `let` not `const` if you need to reassign data objects
