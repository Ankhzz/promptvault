import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/verify-privy-token'

export async function POST(request: NextRequest) {
  try {
    const privyToken = request.cookies.get('privy-token')?.value
    if (!privyToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }
    const session = await verifyPrivyToken(privyToken)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const jwt = process.env.PINATA_JWT
    if (!jwt) {
      return NextResponse.json({ error: 'Pinata JWT not configured' }, { status: 500 })
    }

    return NextResponse.json({ jwt })
  } catch (err) {
    console.error('[upload] ERROR:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
