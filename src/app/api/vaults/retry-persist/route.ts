import { NextRequest, NextResponse } from 'next/server'
import { createVaultRecord, vaultExists, getVaultByUuid, checkVaultRateLimit } from '@/db/queries'
import { verifyPrivyToken } from '@/lib/verify-privy-token'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uuid } = body

    if (typeof uuid !== 'number' || !Number.isInteger(uuid) || uuid <= 0) {
      return NextResponse.json({ error: 'Invalid uuid' }, { status: 400 })
    }

    if (typeof body.ownerAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(body.ownerAddress)) {
      return NextResponse.json({ error: 'Invalid ownerAddress format' }, { status: 400 })
    }

    const privyToken = request.cookies.get('privy-token')?.value
    if (!privyToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }
    const session = await verifyPrivyToken(privyToken)
    if (!session || session.walletAddress !== body.ownerAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await checkVaultRateLimit(session.walletAddress)
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Max 3 vaults per 2 minutes.' }, { status: 429 })
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