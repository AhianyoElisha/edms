/**
 * Reads the package total off the text of a photographed manifest.
 *
 * The OCR service hands back the page as lines of text. Manifests from different
 * clients are laid out differently, so this looks for the total two ways:
 *
 *  1. a labelled total - "Total Packages: 14", "No. of Pkgs 14", "TOTAL QTY 14";
 *  2. failing that, the row numbers - a list numbered 1, 2, 3 ... 14 has 14 rows.
 *
 * Anything it finds is only a starting point: the admin checks it against the
 * photo on the review screen, where it can be changed.
 */

export type ManifestReadingSource = 'label' | 'rows'

export interface ManifestReading {
  totalPackages: number | null
  source: ManifestReadingSource | null
  // 'high' when a labelled total was found, or the label and the row count agree
  confidence: 'high' | 'low' | null
  // The line the figure was read from, for the review screen
  evidence: string | null
}

export const EMPTY_READING: ManifestReading = { totalPackages: null, source: null, confidence: null, evidence: null }

const MAX_PACKAGES = 10000

const UNIT = '(?:packages?|packs?|pkgs?|pkg|parcels?|pieces?|pcs|items?|boxes?|bx|cartons?|ctns?|bags?|qty|quantity|units?|cases?)'

// Most specific first. The tier decides between two candidates on one page.
const LABELS: Array<{ tier: number; pattern: RegExp }> = [
  { tier: 3, pattern: new RegExp(`\\b(?:grand\\s*)?(?:total|ttl|tot)\\.?\\s*(?:no\\.?\\s*of\\s*|number\\s*of\\s*)?${UNIT}\\b`, 'i') },
  { tier: 3, pattern: new RegExp(`\\b(?:no\\.?|nos\\.?|number|num)\\s*(?:of\\s*)?${UNIT}\\b`, 'i') },
  { tier: 2, pattern: new RegExp(`\\b${UNIT}\\s*(?:total|count)\\b`, 'i') },
  { tier: 2, pattern: new RegExp(`\\b(?:packages?|pkgs?|parcels?|pieces?|pcs)\\s*[:=]`, 'i') },
  { tier: 1, pattern: /\b(?:grand\s*)?total\b/i }
]

// A "total" next to any of these is money, weight or volume, not a package count.
const NOT_A_COUNT = /(gh[s¢₵]?\b|₵|\bcedis?\b|\$|€|£|\bamount\b|\bprice\b|\bvalue\b|\bcost\b|\bweight\b|\bwt\b|\bkgs?\b|\bcbm\b|\bvat\b|\blevy\b|\btax\b|\bvolume\b|\bm3\b)/i

// OCR mistakes inside numbers: O for 0, l or I for 1, S for 5, B for 8.
const fixDigits = (token: string): string =>
  token.replace(/[oO]/g, '0').replace(/[lI|]/g, '1').replace(/[sS]/g, '5').replace(/B/g, '8')

// A whole number token, allowing the usual OCR slips as long as it has at least one real digit.
const NUMBER_TOKEN = /(?<![\w.,/])([0-9oOlIsSB|]*[0-9][0-9oOlIsSB|]*)(?![\w/]|[.,]\d)/g

const firstCount = (text: string): number | null => {
  for (const match of text.matchAll(NUMBER_TOKEN)) {
    const value = parseInt(fixDigits(match[1]), 10)

    if (Number.isFinite(value) && value >= 1 && value <= MAX_PACKAGES) return value
  }

  return null
}

const isLoneNumber = (line: string): boolean => /^\s*[:=\-]?\s*[0-9oOlIsSB|]*[0-9][0-9oOlIsSB|]*\s*$/.test(line)

interface Candidate {
  value: number
  tier: number
  index: number
  evidence: string
}

const fromLabels = (lines: string[]): Candidate | null => {
  let best: Candidate | null = null

  lines.forEach((line, index) => {
    if (NOT_A_COUNT.test(line)) return

    for (const { tier, pattern } of LABELS) {
      const match = pattern.exec(line)

      if (!match) continue

      // The figure follows the label on the same line, or sits alone on the next one.
      let value = firstCount(line.slice(match.index + match[0].length))
      let evidence = line

      if (value === null && index + 1 < lines.length && isLoneNumber(lines[index + 1])) {
        value = firstCount(lines[index + 1])
        evidence = `${line} ${lines[index + 1].trim()}`
      }

      if (value === null) continue

      // Higher tier wins; within a tier the later line, since totals sit at the foot of the page.
      if (!best || tier > best.tier || (tier === best.tier && index > best.index)) {
        best = { value, tier, index, evidence: evidence.trim() }
      }

      break
    }
  })

  return best
}

/**
 * The highest row number reached counting up from 1. A few numbers can be
 * missing (OCR drops the odd one), but not a run of them.
 */
const fromRowNumbers = (lines: string[]): number | null => {
  const seen = new Set<number>()

  lines.forEach(line => {
    const match = /^\s*([0-9oOlIsSB|]{1,4})(?:[\s.):\-]|$)/.exec(line)

    if (!match) return

    const value = parseInt(fixDigits(match[1]), 10)

    if (Number.isFinite(value) && value >= 1 && value <= MAX_PACKAGES) seen.add(value)
  })

  if (!seen.has(1) && !seen.has(2)) return null

  let last = 0
  let gap = 0

  for (let n = 1; n <= MAX_PACKAGES; n++) {
    if (seen.has(n)) {
      last = n
      gap = 0
    } else if (++gap > 2) {
      break
    }
  }

  // A handful of numbered lines is more likely a list of terms than a package list.
  if (last < 3) return null

  // Too many holes and it is guesswork.
  let found = 0

  for (let n = 1; n <= last; n++) if (seen.has(n)) found++

  return found / last >= 0.75 ? last : null
}

export const readManifestText = (rawLines: string[]): ManifestReading => {
  const lines = rawLines.map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean)

  if (lines.length === 0) return EMPTY_READING

  const label = fromLabels(lines)
  const rows = fromRowNumbers(lines)

  if (label) {
    return {
      totalPackages: label.value,
      source: 'label',
      confidence: label.tier >= 2 || label.value === rows ? 'high' : 'low',
      evidence: label.evidence
    }
  }

  if (rows) {
    return { totalPackages: rows, source: 'rows', confidence: 'low', evidence: `Rows numbered 1 to ${rows}` }
  }

  return EMPTY_READING
}
