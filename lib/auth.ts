// lib/auth.ts
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export async function verifyAuth(request: Request) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return null
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { permissions: true }
    })
    
    if (!user || !user.isActive) {
      return null
    }
    
    return user
  } catch (error) {
    return null
  }
}

export async function requireAuth(request: Request) {
  const user = await verifyAuth(request)
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}

export async function requireAdmin(request: Request) {
  const user = await requireAuth(request)
  
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }
  
  return user
}

// ✅ دالة جديدة للتحقق من صلاحية معينة
export async function requirePermission(request: Request, permission: string) {
  const user = await requireAuth(request)
  
  // الأدمن عنده كل الصلاحيات
  if (user.role === 'ADMIN') {
    return user
  }
  
  // التحقق من الصلاحية
  if (!user.permissions || !user.permissions[permission as keyof typeof user.permissions]) {
    throw new Error(`Forbidden: Missing permission: ${permission}`)
  }
  
  return user
}

export function checkPermission(
  user: any,
  permission: string
): boolean {
  if (user.role === 'ADMIN') return true
  
  if (user.permissions && user.permissions[permission]) {
    return true
  }
  
  return false
}