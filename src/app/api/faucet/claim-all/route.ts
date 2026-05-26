import { NextRequest, NextResponse } from 'next/server'
import { createWalletClient, createPublicClient, http, type Address, type Hex, formatUnits, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { unstable_cache } from 'next/cache'
import { STORY_CHAIN, CONTRACTS, FAUCET_CONFIG, MUSDC_CONFIG } from '@/lib/constants'
import { getLastFaucetClaim, recordFaucetClaim } from '@/db/queries'
import { verifyPrivyToken } from '@/lib/verify-privy-token'

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

const getCachedFaucetIpBalance = unstable_cache(
  async (faucetAddress: Address) => {
    const publicClient = createPublicClient({ transport: http(STORY_CHAIN.rpcUrl) })
    const raw = await publicClient.getBalance({ address: faucetAddress })
    return raw.toString()
  },
  ['faucet-ip-balance'],
  { revalidate: 60 }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress || typeof walletAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    let privyToken = request.cookies.get('privy-token')?.value
    const authHeader = request.headers.get('authorization')
    if (!privyToken && authHeader?.startsWith('Bearer ')) {
      privyToken = authHeader.slice(7)
    }
    if (!privyToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }
    const session = await verifyPrivyToken(privyToken)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.walletAddress !== walletAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawPk = process.env.MUSDC_FAUCET_PRIVATE_KEY
    if (!rawPk) {
      console.error('[faucet] MUSDC_FAUCET_PRIVATE_KEY not set')
      return NextResponse.json({ error: 'Faucet not configured' }, { status: 500 })
    }
    const normalizedPk = rawPk.trim()
    const faucetPk = (normalizedPk.startsWith('0x') ? normalizedPk : `0x${normalizedPk}`) as Hex

    const faucetAccount = privateKeyToAccount(faucetPk)
    const publicClient = createPublicClient({ transport: http(STORY_CHAIN.rpcUrl) })
    const walletClient = createWalletClient({
      account: faucetAccount,
      chain: aeneid,
      transport: http(STORY_CHAIN.rpcUrl),
    })

    const lastClaim = await getLastFaucetClaim(walletAddress.toLowerCase())

    const musdcEligible = (() => {
      if (!lastClaim?.claimedAt) return true
      const elapsed = Date.now() - new Date(lastClaim.claimedAt).getTime()
      return elapsed >= MUSDC_CONFIG.faucetCooldownMs
    })()

    const ipEligible = !lastClaim?.claimedIp

    if (!musdcEligible && !ipEligible) {
      const elapsed = Date.now() - new Date(lastClaim!.claimedAt).getTime()
      const remaining = MUSDC_CONFIG.faucetCooldownMs - elapsed
      return NextResponse.json({
        error: 'Nothing to claim',
        remainingMs: remaining,
        nextClaimAt: new Date(Date.now() + remaining).toISOString(),
        hasClaimedIp: true,
      }, { status: 429 })
    }

    const result: {
      musdcTxHash?: string
      ipTxHash?: string
      musdcClaimed?: boolean
      ipClaimed?: boolean
      amounts: { musdc?: number; ip?: string }
    } = { amounts: {} }

    if (musdcEligible) {
      const musdcAddress = CONTRACTS.MUSDC_TOKEN
      if (musdcAddress === '0x0000000000000000000000000000000000000000') {
        return NextResponse.json({ error: 'MUSDC token not deployed yet' }, { status: 503 })
      }

      const faucetBalance = await publicClient.readContract({
        address: musdcAddress,
        abi: MUSDC_ABI,
        functionName: 'balanceOf',
        args: [faucetAccount.address],
      })

      const claimAmount = BigInt(MUSDC_CONFIG.faucetAmount) * (BigInt(10) ** BigInt(MUSDC_CONFIG.decimals))

      if (faucetBalance < claimAmount) {
        return NextResponse.json({ error: 'Faucet MUSDC insufficient balance' }, { status: 503 })
      }

      try {
        const musdcTxHash = await walletClient.writeContract({
          address: musdcAddress,
          abi: MUSDC_ABI,
          functionName: 'transfer',
          args: [walletAddress as Address, claimAmount],
        })
        result.musdcTxHash = musdcTxHash
        result.musdcClaimed = true
        result.amounts.musdc = MUSDC_CONFIG.faucetAmount
        await recordFaucetClaim(walletAddress.toLowerCase(), { musdc: true })
      } catch (err) {
        console.error('[faucet] MUSDC transfer failed:', err)
        return NextResponse.json({ error: 'MUSDC transfer failed' }, { status: 500 })
      }
    }

    if (ipEligible) {
      const faucetIpBalance = await publicClient.getBalance({ address: faucetAccount.address })
      if (faucetIpBalance < FAUCET_CONFIG.ipFaucetAmountWei) {
        if (result.musdcClaimed) {
          return NextResponse.json({
            ok: true,
            musdcTxHash: result.musdcTxHash,
            ipClaimed: false,
            ipError: 'Faucet IP balance too low',
            amounts: result.amounts,
          })
        }
        return NextResponse.json({ error: 'Faucet IP balance too low' }, { status: 503 })
      }

      try {
        const ipTxHash = await walletClient.sendTransaction({
          to: walletAddress as Address,
          value: FAUCET_CONFIG.ipFaucetAmountWei,
        })
        result.ipTxHash = ipTxHash
        result.ipClaimed = true
        result.amounts.ip = '0.5'
        await recordFaucetClaim(walletAddress.toLowerCase(), { ip: true })
      } catch (err) {
        console.error('[faucet] IP transfer failed:', err)
        if (result.musdcClaimed) {
          return NextResponse.json({
            ok: true,
            musdcTxHash: result.musdcTxHash,
            ipClaimed: false,
            ipError: 'IP transfer failed',
            amounts: result.amounts,
          })
        }
        return NextResponse.json({ error: 'IP transfer failed' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[faucet] POST outer catch:', err)
    return NextResponse.json({ error: 'Claim failed' }, { status: 500 })
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
    const publicClient = createPublicClient({ transport: http(STORY_CHAIN.rpcUrl) })

    let musdcBalance = '0'
    if (musdcAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        const raw = await publicClient.readContract({
          address: musdcAddress,
          abi: MUSDC_ABI,
          functionName: 'balanceOf',
          args: [walletAddress as Address],
        })
        musdcBalance = formatUnits(raw, MUSDC_CONFIG.decimals)
      } catch (err) {
        console.error('[faucet] GET balanceOf failed:', err)
      }
    }

    const lastClaim = await getLastFaucetClaim(walletAddress.toLowerCase())

    let musdcCooldownRemaining: number | null = null
    if (lastClaim?.claimedAt) {
      const elapsed = Date.now() - new Date(lastClaim.claimedAt).getTime()
      const remaining = MUSDC_CONFIG.faucetCooldownMs - elapsed
      musdcCooldownRemaining = remaining > 0 ? remaining : null
    }

    const faucetPk = process.env.MUSDC_FAUCET_PRIVATE_KEY as Hex | undefined
    let faucetIpBalance: string | null = null
    if (faucetPk) {
      try {
        const faucetAddress = privateKeyToAccount(faucetPk).address
        const raw = await getCachedFaucetIpBalance(faucetAddress as Address)
        faucetIpBalance = raw ? formatUnits(BigInt(raw), 18) : null
      } catch (err) {
        console.error('[faucet] GET faucet IP balance failed:', err)
      }
    }

    return NextResponse.json({
      musdcBalance,
      lastMusdcClaim: lastClaim?.claimedAt?.toISOString() ?? null,
      hasClaimedIp: lastClaim?.claimedIp ?? false,
      faucetIpBalance,
      musdcCooldownRemaining,
      ipAmount: '0.5',
    })
  } catch (err) {
    console.error('[faucet] GET outer catch:', err)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}
