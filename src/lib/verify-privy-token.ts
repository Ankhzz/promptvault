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
    const verifier = getVerifier()
    console.error('[verifyPrivyToken] appId used:', process.env.NEXT_PUBLIC_PRIVY_APP_ID?.slice(0, 10) + '...')
    console.error('[verifyPrivyToken] token prefix:', token?.slice(0, 20) + '...')

    const verified = await verifier.verifyAuthToken(token)

    if (!verified) {
      console.error('[verifyPrivyToken] verifyAuthToken returned null')
      return null
    }
    if (!verified.userId) {
      console.error('[verifyPrivyToken] verifyAuthToken returned object without userId, keys:', Object.keys(verified))
      return null
    }

    // Token cryptographically verified; decode payload for wallet address
    const tokenParts = token.split('.')
    if (tokenParts.length < 2) {
      console.error('[verifyPrivyToken] token has no payload part')
      return null
    }
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
    const walletAddress = payload?.wallet?.address
    if (!walletAddress) {
      console.error('[verifyPrivyToken] no wallet address in payload, payload keys:', Object.keys(payload || {}))
      return null
    }

    return { walletAddress: walletAddress.toLowerCase() }
  } catch (err) {
    console.error('[verifyPrivyToken] Token verification failed:', err)
    return null
  }
}