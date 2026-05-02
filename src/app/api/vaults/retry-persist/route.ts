import { NextRequest, NextResponse } from 'next/server'
import { createVaultRecord, vaultExists, getVaultByUuid } from '@/db/queries'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uuid } = body

    if (typeof uuid !== 'number' || uuid <= 0) {
      return NextResponse.json({ error: 'Invalid uuid' }, { status: 400 })
    }

    const existing = await vaultExists(uuid)
    if (existing) {
      const vault = await getVaultByUuid(uuid)
      return NextResponse.json({ ok: true, status: 'already_exists', vault })
    }

    const requiredFields = ['uuid', 'ownerAddress', 'name', 'ipId', 'licenseTermsId'] as const
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    const result = await createVaultRecord({
      uuid: body.uuid,
      ownerAddress: body.ownerAddress,
      name: body.name,
      description: body.description,
      ipId: body.ipId,
      licenseTermsId: body.licenseTermsId,
      licenseTokenId: body.licenseTokenId,
      encryptedDataKey: body.encryptedDataKey,
      dataKeyEncryptionMeta: body.dataKeyEncryptionMeta,
      allocateTxHash: body.allocateTxHash,
      writeTxHash: body.writeTxHash,
      registerTxHash: body.registerTxHash,
      mintTxHash: body.mintTxHash,
    })

    return NextResponse.json({ ok: true, status: 'created', vault: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
