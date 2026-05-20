import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, createPublicClient, http, type Address, type Hex, formatUnits, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { STORY_CHAIN, CONTRACTS, MUSDC_CONFIG } from '@/lib/constants'
import { getLastFaucetClaim, recordFaucetClaim } from '@/db/queries'

const aeneid = defineChain({
  id: STORY_CHAIN.id,
  name: STORY_CHAIN.name,
  nativeCurrency: { name: 'IP', symbol: 'IP', decimals: 18 },
  rpcUrls: { default: { http: [STORY_CHAIN.rpcUrl] } },
  blockExplorers: { default: { name: 'StoryScan', url: STORY_CHAIN.explorer } },
})

const MUSDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

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
    const { walletAddress } = body

    if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const sessionWallet = extractWalletFromCookie(request)
    if (!sessionWallet || sessionWallet.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const faucetPk = process.env.MUSDC_FAUCET_PRIVATE_KEY as Hex | undefined
    if (!faucetPk) {
      return NextResponse.json({ error: 'Faucet not configured' }, { status: 500 })
    }

    const musdcAddress = CONTRACTS.MUSDC_TOKEN
    if (musdcAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ error: 'MUSDC token not deployed yet' }, { status: 503 })
    }

    const lastClaim = await getLastFaucetClaim(walletAddress.toLowerCase())
    if (lastClaim?.claimedAt) {
      const elapsed = Date.now() - new Date(lastClaim.claimedAt).getTime()
      if (elapsed < MUSDC_CONFIG.faucetCooldownMs) {
        const remaining = MUSDC_CONFIG.faucetCooldownMs - elapsed
        return NextResponse.json({
          error: 'Cooldown active',
          remainingMs: remaining,
          nextClaimAt: new Date(Date.now() + remaining).toISOString(),
        }, { status: 429 })
      }
    }

    const faucetAccount = privateKeyToAccount(faucetPk)
    const publicClient = createPublicClient({
      transport: http(STORY_CHAIN.rpcUrl),
    })

    const faucetBalance = await publicClient.readContract({
      address: musdcAddress,
      abi: MUSDC_ABI,
      functionName: 'balanceOf',
      args: [faucetAccount.address],
    })

    const claimAmount = BigInt(MUSDC_CONFIG.faucetAmount) * BigInt(10 ** MUSDC_CONFIG.decimals)

    if (faucetBalance < claimAmount) {
      return NextResponse.json({ error: 'Faucet insufficient balance' }, { status: 503 })
    }

    const walletClient = createWalletClient({
      account: faucetAccount,
      chain: aeneid,
      transport: http(STORY_CHAIN.rpcUrl),
    })

    const txHash = await walletClient.writeContract({
      address: musdcAddress,
      abi: MUSDC_ABI,
      functionName: 'transfer',
      args: [walletAddress as Address, claimAmount],
    })

    await recordFaucetClaim(walletAddress.toLowerCase())

    return NextResponse.json({
      ok: true,
      txHash,
      amount: MUSDC_CONFIG.faucetAmount,
      claimedAt: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const musdcAddress = CONTRACTS.MUSDC_TOKEN
    if (musdcAddress === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({ balance: '0', lastClaim: null })
    }

    const publicClient = createPublicClient({
      transport: http(STORY_CHAIN.rpcUrl),
    })

    const balance = await publicClient.readContract({
      address: musdcAddress,
      abi: MUSDC_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    })

    const lastClaim = await getLastFaucetClaim(walletAddress.toLowerCase())

    return NextResponse.json({
      balance: formatUnits(balance, MUSDC_CONFIG.decimals),
      lastClaim: lastClaim?.claimedAt?.toISOString() ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
