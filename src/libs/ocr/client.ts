import type { ManifestReading } from './manifestText'

export type { ManifestReading } from './manifestText'

/**
 * Ask the server to read the package total off a manifest photo.
 *
 * Never throws for the driver's sake: a photo that cannot be read, a slow
 * service or no service at all just means the office enters the figures by hand,
 * as before. Callers that want to report the failure pass `throwOnError`.
 */
export const readManifestPhoto = async (
  request: { fileId: string } | { manifestId: string },
  options: { timeoutMs?: number; throwOnError?: boolean } = {}
): Promise<ManifestReading | null> => {
  const { timeoutMs = 30_000, throwOnError = false } = options

  try {
    const response = await fetch('/api/manifest-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(timeoutMs)
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) throw new Error(data?.error || 'The photo could not be read')

    return data as ManifestReading
  } catch (error: any) {
    if (throwOnError) {
      throw error?.name === 'TimeoutError' ? new Error('Reading the photo took too long') : error
    }

    console.warn('Manifest OCR skipped:', error?.message || error)

    return null
  }
}
