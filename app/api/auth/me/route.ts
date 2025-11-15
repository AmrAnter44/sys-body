// app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { verifyAuth } from '../../../../lib/auth'

export async function GET(request: Request) {
  try {
    const user = await verifyAuth(request)
    
    if (!user) {
      return NextResponse.json(
        { error: 'غير مصرح' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: 'غير مصرح' },
      { status: 401 }
    )
  }
}