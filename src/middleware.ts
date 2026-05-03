import { NextResponse, type NextRequest } from 'next/server'

const TEST_ROUTES = ['/test', '/test-cdr', '/test-cdr-flow']

const PROTECTED_ROUTES = ['/create', '/unlock', '/activity']

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '0',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Cross-Origin-Embedder-Policy': 'credentialless',
}

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 30
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT_MAX
}

function getCsp(host: string): string {
  const isDev = process.env.NODE_ENV === 'development'

  const base = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
    "font-src 'self' https://api.fontshare.com https://cdn.fontshare.com",
    "img-src 'self' data: blob: https:",
    "frame-src https://widget.privy.io https://auth.privy.io",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${isDev ? 'http' : 'https'}://${host}/api/csp-report`,
  ]

  const connectSrc = [
    "'self'",
    'https://aeneid.storyrpc.io',
    'https://auth.privy.io',
    'https://api.privy.io',
    'https://explorer-api.walletconnect.com',
    'wss://relay.walletconnect.com',
    'wss://www.walletlink.org',
    'https://gateway.lighthouse.storage',
    'https://api.lighthouse.storage',
    'https://node.lighthouse.storage',
  ]

  if (isDev) {
    return [
      ...base,
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      `connect-src ${connectSrc.join(' ')} https://172.192.41.96:26657`,
    ].join('; ')
  }

  return [
    ...base,
    "script-src 'self'",
    `connect-src ${connectSrc.join(' ')}`,
  ].join('; ')
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (process.env.NEXT_PUBLIC_ENABLE_TEST_ROUTES !== 'true') {
    for (const route of TEST_ROUTES) {
      if (pathname === route || pathname.startsWith(route + '/')) {
        return new NextResponse(null, { status: 404 })
      }
    }
  }

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  )
  if (isProtected) {
    const privySession = request.cookies.get('privy-session')?.value
    const privyToken = request.cookies.get('privy-token')?.value
    if (!privySession && !privyToken) {
      return NextResponse.redirect(new URL('/?auth=required', request.url))
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  const response = NextResponse.next()

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  response.headers.set('Content-Security-Policy', getCsp(request.headers.get('host') || 'localhost:3000'))

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
