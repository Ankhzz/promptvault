import { NextRequest, NextResponse } from 'next/server'
import { createVaultRecord, vaultExists, getVaultByUuid } from '@/db/queries'

// NOTE: Auth is session-bound (cookie presence + address match).
// This is NOT cryptographic JWT verification — the privy-token signature
// is not validated here. Full JWKS validation is tracked for FASE 3.
function extractWalletFromCookie(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('privy-token')?.value
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.wallet?.address ?? null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uuid } = body

    if (typeof uuid !== 'number' || !Number.isInteger(uuid) || uuid <= 0) {
      return NextResponse.json({ error: 'Invalid uuid' }, { status: 400 })
    }

    const sessionWallet = extractWalletFromCookie(request)
    if (!sessionWallet || !body.ownerAddress || sessionWallet.toLowerCase() !== String(body.ownerAddress).toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const existing = await vaultExists(uuid)
    if (existing) {
      const vault = await getVaultByUuid(uuid)
      return NextResponse.json({ ok: true, status: 'already_exists', vault })
    }

    const requiredFields = ['uuid', 'ownerAddress', 'name'] as const
    for (const field of requiredFields) {
      if (body[field] == null) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const result = await createVaultRecord({
      uuid: body.uuid,
      ownerAddress: body.ownerAddress,
      name: body.name,
      description: body.description,
      vaultType: body.vaultType,
      ipId: body.ipId,
      licenseTermsId: body.licenseTermsId,
      licenseTokenId: body.licenseTokenId,
      ipfsCid: body.ipfsCid,
      encryptedFileMeta: body.encryptedFileMeta,
      encryptedDataKey: body.encryptedDataKey,
      dataKeyEncryptionMeta: body.dataKeyEncryptionMeta,
      allocateTxHash: body.allocateTxHash,
      writeTxHash: body.writeTxHash,
      registerTxHash: body.registerTxHash,
      mintTxHash: body.mintTxHash,
      priceMusdc: body.priceMusdc,
    })

    return NextResponse.json({ ok: true, status: 'created', vault: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
