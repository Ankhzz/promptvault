console.log('[lighthouse] module loading...')
import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/verify-privy-token'
console.log('[lighthouse] imports OK')

export async function POST(request: NextRequest) {
  try {
    const privyToken = request.cookies.get('privy-token')?.value
    if (!privyToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }
    console.log('[lighthouse] verifying privy token...')
    const session = await verifyPrivyToken(privyToken)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[lighthouse] privy OK, wallet:', session.walletAddress)

    const apiKey = process.env.LIGHTHOUSE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Lighthouse API key not configured' }, { status: 500 })
    }
    console.log('[lighthouse] apiKey present, length:', apiKey.length)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('[lighthouse] file:', file.name, 'size:', file.size, 'type:', file.type)

    const MAX_FILE_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 10 MB.' }, { status: 400 })
    }

    const ALLOWED_TYPES = new Set([
      'image/png', 'image/jpeg', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain',
      'application/octet-stream',
    ])
    if (!ALLOWED_TYPES.has(file.type) && file.type !== '') {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    const LH_URL = 'https://node.lighthouse.storage/api/v0/add'
    console.log('[lighthouse] uploading to:', LH_URL, 'file:', file.name)

    const body = new FormData()
    body.set('file', file)
    const lhResponse = await fetch(LH_URL, {
      method: 'POST',
      body,
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    })
    console.log('[lighthouse] response status:', lhResponse.status)

    if (!lhResponse.ok) {
      const errBody = await lhResponse.text().catch(() => '')
      throw new Error(`Lighthouse API error ${lhResponse.status}: ${errBody}`)
    }
    const result = await lhResponse.json()
    if (!result?.Hash) {
      throw new Error('Lighthouse upload failed: no Hash in response')
    }

    console.log('[lighthouse] upload OK, cid:', result.Hash)
    return NextResponse.json({ cid: result.Hash })
  } catch (err) {
    console.error('[lighthouse] ERROR:', err)
    const msg = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
