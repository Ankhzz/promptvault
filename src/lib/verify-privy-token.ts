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
    const verified = await getVerifier().verifyAuthToken(token)
    if (!verified?.userId) return null

    // Token cryptographically verified; decode payload for wallet address
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const walletAddress = payload?.wallet?.address
    if (!walletAddress) return null

    return { walletAddress: walletAddress.toLowerCase() }
  } catch (err) {
    console.error('[verifyPrivyToken] Token verification failed:', err)
    return null
  }
}