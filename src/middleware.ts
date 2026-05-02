import { NextResponse, type NextRequest } from 'next/server'

const TEST_ROUTES = ['/test', '/test-cdr', '/test-cdr-flow']

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!isDev()) {
    for (const route of TEST_ROUTES) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        return new NextResponse(null, { status: 404 })
      }
    }
  }

  const response = NextResponse.next()

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  if (isDev()) {
    response.headers.set('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://api.fontshare.com; " +
      "font-src 'self' https://api.fontshare.com; " +
      "connect-src 'self' https://aeneid.storyrpc.io https://comet.aeneid.storyprotocol.io:443 https://auth.privy.io https://api.privy.io; " +
      "img-src 'self' data: https:; " +
      "frame-src https://widget.privy.io"
    )
  } else {
    response.headers.set('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline' https://api.fontshare.com; " +
      "font-src 'self' https://api.fontshare.com; " +
      "connect-src 'self' https://aeneid.storyrpc.io https://comet.aeneid.storyprotocol.io:443 https://auth.privy.io https://api.privy.io; " +
      "img-src 'self' data: https:; " +
      "frame-src https://widget.privy.io"
    )
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
