import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/unlock', '/activity']

const CSP_ALLOWED_HOSTS = new Set([
  'promptvaultcdr.vercel.app',
  'localhost:3000',
])

function isAllowedCspHost(host: string): boolean {
  return CSP_ALLOWED_HOSTS.has(host) || host.endsWith('.vercel.app')
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '0',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Cross-Origin-Embedder-Policy': 'unsafe-none',
}

// Best-effort in-memory rate limiter (per-edge-worker, not global on Vercel).
// For production with multiple instances, add Vercel KV or Upstash.
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 40
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
  const safeHost = isAllowedCspHost(host) ? host : 'localhost:3000'

  const base = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline' https://api.fontshare.com https://fonts.googleapis.com",
    "font-src 'self' https://api.fontshare.com https://cdn.fontshare.com https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "frame-src 'self' https://widget.privy.io https://auth.privy.io about: blob: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://auth.privy.io https://widget.privy.io",
    `report-uri ${isDev ? 'http' : 'https'}://${safeHost}/api/csp-report`,
  ]

  const connectSrc = [
    "'self'",
    'https://aeneid.storyrpc.io',
    'https://auth.privy.io',
    'wss://auth.privy.io',
    'https://api.auth.privy.io',
    'https://api.privy.io',
    'https://explorer-api.walletconnect.com',
    'wss://relay.walletconnect.com',
    'wss://www.walletlink.org',
    'https://gateway.pinata.cloud',
    'https://api.pinata.cloud',
    'https://*.supabase.co',
  ]

  if (isDev) {
    return [
      ...base,
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'",
      `connect-src ${connectSrc.join(' ')}`,
    ].join('; ')
  }

  return [
    ...base,
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'",
    `connect-src ${connectSrc.join(' ')}`,
  ].join('; ')
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/create') {
    console.log('[middleware] /create cookies:', JSON.stringify(request.cookies.getAll()))
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
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = (forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown'
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
