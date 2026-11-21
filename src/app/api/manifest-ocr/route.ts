import { NextResponse } from 'next/server'

import { OcrError, readManifestPhoto } from '@/libs/ocr/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Reads the package total off a manifest photo. Called by the driver's Log
 * Delivery dialog right after the upload, and by the review screen's "Read from
 * photo". The body carries only an id; see libs/ocr/server.ts for what is trusted.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { fileId?: unknown; manifestId?: unknown }

    const fileId = typeof body.fileId === 'string' ? body.fileId : undefined
    const manifestId = typeof body.manifestId === 'string' ? body.manifestId : undefined

    return NextResponse.json(await readManifestPhoto({ fileId, manifestId }))
  } catch (error: any) {
    const known = error instanceof OcrError
    const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'

    if (!known) console.error('Manifest OCR error:', error)

    return NextResponse.json(
      { error: known ? error.message : timedOut ? 'Reading the photo took too long' : 'The photo could not be read' },
      { status: known ? error.status : timedOut ? 504 : 500 }
    )
  }
}
