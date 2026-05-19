import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PREFIXES = ['/login', '/change-password', '/forgot-password', '/reset-password', '/api/auth/', '/api/health', '/_next', '/favicon.ico']
const PUBLIC_EXTENSIONS = /\.(jpg|jpeg|png|gif|svg|ico|webp|woff|woff2|ttf|eot|mp4|pdf|zip)$/i

export function middleware(req: NextRequest) {
  const { pathname, method } = req.nextUrl as unknown as { pathname: string; method: string }
  const start = Date.now()

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || PUBLIC_EXTENSIONS.test(pathname)

  if (isPublic) {
    return NextResponse.next()
  }

  const session = req.cookies.get('chatbot_session')
  if (!session?.value) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', event: 'auth_redirect', path: pathname }))
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const res = NextResponse.next()
  // Log after response is produced — duration is approximate (middleware overhead only)
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', event: 'request', method: req.method, path: pathname, ms: Date.now() - start }))
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
