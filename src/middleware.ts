import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('owl_session')?.value
  const pathname = request.nextUrl.pathname
  
  const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/cadastro') || pathname.startsWith('/_next') || pathname.startsWith('/api/auth')

  if (!token && !isPublicRoute && !pathname.includes('.')) {
      return NextResponse.redirect(new URL('/login', request.url))
  }
  
  if (token && (pathname === '/login' || pathname === '/cadastro')) {
      return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
