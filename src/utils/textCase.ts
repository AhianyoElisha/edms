/**
 * One way of writing typed text before it is stored, so "RICHARD MENSAH",
 * "richard mensah" and "Richard Mensah" do not end up as three different values.
 *
 *  - names (people, places, routes, vendors, brands): each word capitalised
 *  - emails: lower case
 *  - number plates: capitals
 *  - free text (notes, descriptions, addresses): left as typed unless it was
 *    typed entirely in capitals, in which case it is treated like a name
 */

import { toGhanaRegion } from './ghanaRegions'

// Abbreviations that are written in capitals even inside a name
const ACRONYMS = new Set([
  'GH', '3PL', 'EDS', 'EMG', 'BGC', 'PAWK', 'KAD', 'VDO', 'IHS', 'FLS', 'CCML',
  'UPSA', 'UCC', 'TTU', 'KNUST', 'JHS', 'SHS', 'ICT',
  'MTN', 'FM', 'CBG', 'GTB', 'GCB', 'STC', 'SSNIT', 'NCA', 'ECG', 'DVLA', 'PPAG', 'MTTD', 'CCTH', 'DHL',
  'DAF', 'CF', 'XF', 'LF', 'FH', 'CBM', 'POD', 'ATM', 'HQ', 'II', 'III', 'IV'
])

const capitalise = (word: string) => {
  if (!word) return word

  const upper = word.toUpperCase()

  if (ACRONYMS.has(upper)) return upper

  // Codes such as "W62H" or "A1" are not words; leave them as typed
  if (/\d/.test(word)) return word

  // Deliberate inner capitals ("McCarthy") are kept; only the first letter is fixed
  const isMixed = word !== upper && word !== word.toLowerCase()

  if (isMixed) return word.charAt(0).toUpperCase() + word.slice(1)

  return upper.charAt(0) + word.slice(1).toLowerCase()
}

/** "RICHARD  mensah" -> "Richard Mensah", "GH-3PL ADEISO" -> "GH-3PL Adeiso" */
export const toNameCase = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .trim()
    // letters and digits form words; apostrophes stay inside a word ("Ma'am")
    .replace(/[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g, capitalise)

export const toEmailCase = (value: string) => value.trim().toLowerCase()

export const toPlateCase = (value: string) => value.toUpperCase().replace(/\s+/g, ' ').trim()

/** Free text: only text typed entirely in capitals is changed. */
export const toFreeTextCase = (value: string) => {
  const trimmed = value.trim()
  const shouting = /[A-Z]{2}/.test(trimmed) && trimmed === trimmed.toUpperCase()

  return shouting ? toNameCase(trimmed) : trimmed
}

export type TextCaseKind = 'name' | 'email' | 'plate' | 'free' | 'region'
export type TextCaseRules = Record<string, TextCaseKind>

const CONVERTERS: Record<TextCaseKind, (value: string) => string> = {
  name: toNameCase,
  email: toEmailCase,
  plate: toPlateCase,
  free: toFreeTextCase,

  // One of the 16 regions when recognisable ("ashanti", "Kumasi"); otherwise treated as a name
  region: value => toGhanaRegion(value) || toNameCase(value)
}

/**
 * Which typed fields each collection has. Anything not listed (codes, statuses,
 * ids, links, JSON) is stored exactly as given.
 */
export const TEXT_CASE_RULES = {
  users: { name: 'name', email: 'email' },
  roles: { displayName: 'name', description: 'free' },
  pickuplocations: { locationName: 'name', city: 'name', region: 'region', country: 'name', contactPerson: 'name', address: 'free' },
  dropofflocations: { locationName: 'name', city: 'name', region: 'region', country: 'name', contactPerson: 'name', address: 'free' },
  routes: { routeName: 'name' },
  vehicles: { vehicleNumber: 'plate', brand: 'name', model: 'name' },
  // subCategory is picked from a fixed list, not typed
  expenses: { vendor: 'name', description: 'free' },
  ratecards: { clientName: 'name', routeDescription: 'name' },
  companies: { name: 'name', contactPerson: 'name', contactEmail: 'email', notes: 'free' },
  trips: { notes: 'free', deletedBy: 'name' },
  manifests: { notes: 'free', verifiedBy: 'name' },
  returnwaybills: { notes: 'free' }
} satisfies Record<string, TextCaseRules>

/** A copy of `data` with its typed text fields written the standard way. */
export function applyTextCase<T>(data: T, rules: TextCaseRules | undefined): T {
  if (!rules || !data || typeof data !== 'object' || Array.isArray(data)) return data

  let result: any = data

  for (const [field, kind] of Object.entries(rules)) {
    const value = (data as any)[field]

    if (typeof value !== 'string' || !value) continue

    const converted = CONVERTERS[kind](value)

    if (converted !== value) {
      if (result === data) result = { ...(data as any) }
      result[field] = converted
    }
  }

  return result
}
