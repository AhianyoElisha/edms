import 'server-only'

import { Client, Databases, Query, Storage } from 'node-appwrite'

import { EMPTY_READING, cellsToReread, readManifestText, wordsFromCells } from './manifestText'
import type { ManifestReading, OcrWord } from './manifestText'

/**
 * Server side of manifest OCR. Runs only inside /api/manifest-ocr.
 *
 * The OCR itself happens on the VPS (ocr-service/), beside Appwrite. This route
 * stands between the browser and that service. It never takes an image from the
 * browser, only an id, and it reads a photo only if it is:
 *
 *  - a file uploaded to the manifest bucket in the last few minutes (the driver's
 *    upload, read while they are still submitting); or
 *  - the photo of a manifest still waiting on the office's review (the admin's
 *    "Read from photo" on the review screen).
 *
 * As with /api/push/notify, the app signs in entirely in the browser, so the
 * route cannot tell who is calling; those two rules are what it trusts instead.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT!
const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID!
const MANIFESTS = process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID!
const BUCKET = process.env.NEXT_PUBLIC_BUCKET_ID!

const OCR_URL = process.env.OCR_SERVICE_URL
const OCR_TOKEN = process.env.OCR_SERVICE_TOKEN

// The driver's photo is read while they wait on Submit.
const FRESH_WINDOW_MS = 15 * 60 * 1000
const OCR_TIMEOUT_MS = 25_000

export class OcrError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const isOcrConfigured = (): boolean => Boolean(OCR_URL && OCR_TOKEN)

const adminClient = () => new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(process.env.APPWRITE_API_KEY!)

// Stored photo links look like .../storage/buckets/{bucket}/files/{file}/view?project=...
const fileIdFromUrl = (url: string | null | undefined): string | null => {
  const match = url ? /\/storage\/buckets\/([^/]+)\/files\/([^/?#]+)/.exec(url) : null

  return match && match[1] === BUCKET ? match[2] : null
}

const freshUploadId = async (fileId: string): Promise<string> => {
  try {
    const file = await new Storage(adminClient()).getFile(BUCKET, fileId)

    if (!file.mimeType?.startsWith('image/')) throw new OcrError(415, 'Not a photo')

    if (Date.now() - new Date(file.$createdAt).getTime() > FRESH_WINDOW_MS) {
      throw new OcrError(409, 'This photo is not a new upload')
    }

    return file.$id
  } catch (error: any) {
    if (error?.code === 404) throw new OcrError(404, 'Photo not found')
    throw error
  }
}

const reviewPhotoId = async (manifestId: string): Promise<string> => {
  let manifest: any

  try {
    manifest = await new Databases(adminClient()).getDocument(DATABASE_ID, MANIFESTS, manifestId, [
      Query.select(['$id', 'detailsVerified', 'manifestImage', 'proofOfDeliveryImage'])
    ])
  } catch (error: any) {
    if (error?.code === 404) throw new OcrError(404, 'Manifest not found')
    throw error
  }

  if (manifest.detailsVerified === true) throw new OcrError(409, 'This manifest has already been reviewed')

  const fileId = fileIdFromUrl(manifest.manifestImage) || fileIdFromUrl(manifest.proofOfDeliveryImage)

  if (!fileId) throw new OcrError(404, 'This manifest has no photo')

  return fileId
}

export const readManifestPhoto = async (request: {
  fileId?: string
  manifestId?: string
}): Promise<ManifestReading & { ms?: number }> => {
  if (!isOcrConfigured()) throw new OcrError(503, 'Reading photos is not set up')

  const fileId = request.fileId
    ? await freshUploadId(request.fileId)
    : request.manifestId
      ? await reviewPhotoId(request.manifestId)
      : null

  if (!fileId) throw new OcrError(400, 'fileId or manifestId is required')

  const image = Buffer.from(await new Storage(adminClient()).getFileView(BUCKET, fileId))
  const deadline = Date.now() + OCR_TIMEOUT_MS
  const base = OCR_URL!.replace(/\/$/, '')

  const response = await fetch(`${base}/ocr`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${OCR_TOKEN}`, 'Content-Type': 'application/octet-stream' },
    body: image,
    signal: AbortSignal.timeout(OCR_TIMEOUT_MS),
    cache: 'no-store'
  })

  if (!response.ok) {
    console.error('OCR service error:', response.status, await response.text().catch(() => ''))
    throw new OcrError(502, 'The photo could not be read')
  }

  const result = (await response.json()) as {
    lines?: Array<{ text: string }>
    words?: OcrWord[]
    frame?: { turns: number; tilt: number }
    ms?: number
  }

  const lines = (result.lines || []).map(line => line.text)
  const words = result.words || []

  if (!lines.length) return { ...EMPTY_READING, ms: result.ms }

  const reading = readManifestText(lines, words)

  if (reading.confidence === 'high' || !result.frame) return { ...reading, ms: result.ms }

  // Not sure: read again the cells where a figure should be but none was found -
  // usually a printed figure with a tick or a note written across it
  const cells = cellsToReread(words, lines)
  const timeLeft = deadline - Date.now()

  if (cells.length === 0 || timeLeft < 4000) return { ...reading, ms: result.ms }

  try {
    const second = await fetch(`${base}/cells`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OCR_TOKEN}`,
        'Content-Type': 'application/octet-stream',
        'X-Cells': JSON.stringify({ frame: result.frame, cells })
      },
      body: image,
      signal: AbortSignal.timeout(timeLeft),
      cache: 'no-store'
    })

    if (!second.ok) throw new Error(`cells: ${second.status}`)

    const reread = (await second.json()) as { cells?: Array<{ text: string; score: number }>; ms?: number }
    const found = wordsFromCells(cells, reread.cells || [])

    if (found.length === 0) return { ...reading, ms: result.ms }

    const improved = readManifestText(lines, [...words, ...found])

    return { ...(improved.totalPackages ? improved : reading), ms: (result.ms || 0) + (reread.ms || 0) }
  } catch (error) {
    // The first reading stands; an older service without /cells lands here too
    console.warn('OCR cell re-read skipped:', error)

    return { ...reading, ms: result.ms }
  }
}
