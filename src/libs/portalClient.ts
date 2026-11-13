import { account } from '@/libs/appwrite.config'

/**
 * A short-lived token proving to our server who is signed in, for the company
 * portal's server actions. Tokens last 15 minutes; one is reused for 10.
 */
let cached: { jwt: string; expires: number } | null = null

export async function getPortalToken(): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.jwt

  const { jwt } = await account.createJWT()

  cached = { jwt, expires: Date.now() + 10 * 60 * 1000 }

  return jwt
}

export const clearPortalToken = () => {
  cached = null
}
