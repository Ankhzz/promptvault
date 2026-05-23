import { PrivyClient } from '@privy-io/server-auth'

const getVerifier = (() => {
  let client: PrivyClient | null = null
  return () => {
    if (!client) {
      const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
      const appSecret = process.env.PRIVY_APP_SECRET
      if (!appId || !appSecret) {
        throw new Error('PRIVY_APP_SECRET or NEXT_PUBLIC_PRIVY_APP_ID not configured')
      }
      client = new PrivyClient(appId, appSecret)
    }
    return client
  }
})()

export async function verifyPrivyToken(token: string): Promise<{ walletAddress: string } | null> {
  try {
    const client = getVerifier()
    const verified = await client.verifyAuthToken(token)
    if (!verified?.userId) {
      return null
    }

    let user
    try {
      user = await client.getUser(verified.userId)
    } catch (err) {
      console.error('[verifyPrivyToken] Privy API getUser failed:', err)
      return null
    }

    const linkedWallet = user?.linkedAccounts?.find(
      (a: any) => a.type === 'wallet' || a.type === 'smart_wallet',
    ) as { address?: string } | undefined
    const walletAddress = linkedWallet?.address
    if (!walletAddress) {
      return null
    }

    return { walletAddress: walletAddress.toLowerCase() }
  } catch (err) {
    console.error('[verifyPrivyToken] Token verification failed:', err)
    return null
  }
}