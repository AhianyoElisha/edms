import { NextResponse } from 'next/server'

import { HttpError, notify } from '@/libs/notifications/server'
import type { NotifyRequest } from '@/libs/notifications/shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Called by the browser right after a driver uploads a delivery or a return.
 * Writes the in-app notification and pushes it to every office device.
 *
 * The body carries only a record id; see libs/notifications/server.ts for why
 * that is all this route needs to trust.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifyRequest

    // The driver's browser calls this once and moves on, so a dropped connection
    // to Appwrite would silently lose the alert. Retrying is safe: the
    // notification id is derived from the record, so it can only be written once.
    for (let attempt = 1; ; attempt++) {
      try {
        return NextResponse.json(await notify(body))
      } catch (error: any) {
        const networkError = !(error instanceof HttpError) && /fetch failed|ETIMEDOUT|ECONNRESET/i.test(String(error?.message))

        if (!networkError || attempt >= 3) throw error
        await new Promise(resolve => setTimeout(resolve, attempt * 1000))
      }
    }
  } catch (error: any) {
    if (!(error instanceof HttpError)) console.error('Notify error:', error)

    return NextResponse.json(
      { error: error instanceof HttpError ? error.message : 'Could not send the notification' },
      { status: error instanceof HttpError ? error.status : 500 }
    )
  }
}
