// middleware.ts (في جذر المشروع - بره app/)
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  const { pathname } = request.nextUrl
  
  // الصفحات المحمية (محتاجة تسجيل دخول)
  const protectedPaths = [
    '/',
    '/members',
    '/pt',
    '/staff',
    '/receipts',
    '/reports',
    '/settings',
    '/admin',
    '/visitors',
    '/expenses',
    '/dayuse',
    '/attendance',
    '/invitations'
  ]
  
  // تحقق لو الصفحة الحالية محمية
  const isProtectedPath = protectedPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  )
  
  // لو الصفحة محمية ومفيش token
  if (isProtectedPath && !token) {
    // استثناء: لو على صفحة /login نفسها، سيبه يدخل
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  // لو عنده token وعلى صفحة /login، يروح على الـ home
  if (pathname === '/login' && token) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ]
}