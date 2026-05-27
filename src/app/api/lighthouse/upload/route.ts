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

    const apiKey = process.env.LIGHTHOUSE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Lighthouse API key not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

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

    const body = new FormData()
    body.set('file', file)
    const lhResponse = await fetch('https://node.lighthouse.storage/api/v0/add', {
      method: 'POST',
      body,
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!lhResponse.ok) {
      const errBody = await lhResponse.text().catch(() => '')
      throw new Error(`Lighthouse API error ${lhResponse.status}: ${errBody}`)
    }
    const result = await lhResponse.json()
    if (!result?.Hash) {
      throw new Error('Lighthouse upload failed: no Hash in response')
    }

    return NextResponse.json({ cid: result.Hash })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}