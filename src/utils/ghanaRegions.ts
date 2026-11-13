/** Ghana's 16 administrative regions, as they are stored. */
export const GHANA_REGIONS = [
  'Ahafo Region',
  'Ashanti Region',
  'Bono Region',
  'Bono East Region',
  'Central Region',
  'Eastern Region',
  'Greater Accra Region',
  'North East Region',
  'Northern Region',
  'Oti Region',
  'Savannah Region',
  'Upper East Region',
  'Upper West Region',
  'Volta Region',
  'Western Region',
  'Western North Region'
] as const

// Ways a region gets written that are not its name: a regional capital, or an older name
const ALIASES: Record<string, string> = {
  accra: 'Greater Accra Region',
  tema: 'Greater Accra Region',
  kumasi: 'Ashanti Region',
  'sekondi takoradi': 'Western Region',
  'brong ahafo': 'Bono Region'
}

const key = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\bregions?\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * The region `value` refers to ("ashanti", "Ashanti Region", "Kumasi"), or null
 * when it is not recognisably one of the 16.
 */
export const toGhanaRegion = (value?: string | null): string | null => {
  if (!value) return null

  const k = key(value)

  return ALIASES[k] || GHANA_REGIONS.find(region => key(region) === k) || null
}
