import { verifyAuthToken, InvalidAuthTokenError } from '@privy-io/node'

export async function verifyPrivyToken(token: string): Promise<{ walletAddress: string } | null> {
  try {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
    const appSecret = process.env.PRIVY_APP_SECRET
    if (!appId || !appSecret) {
      throw new Error('PRIVY_APP_SECRET or NEXT_PUBLIC_PRIVY_APP_ID not configured')
    }

    const claims = await verifyAuthToken({
      auth_token: token,
      app_id: appId,
      verification_key: appSecret,
    })

    const walletAddress = claims?.wallet?.address
    if (!walletAddress) return null
    return { walletAddress: walletAddress.toLowerCase() }
  } catch (err) {
    if (err instanceof InvalidAuthTokenError) {
      return null
    }
    throw err
  }
}