import { NextResponse } from 'next/server'

// Always answered by the running deployment, never from a cache
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Which build is live right now. Open tabs compare this with the build they were
 * loaded from to know when a newer version has been deployed (see NewVersionBanner).
 */
export function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'dev' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
