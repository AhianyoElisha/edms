// West African Countries data and component
export const WEST_AFRICAN_COUNTRIES = [
  'Ghana',
  'Nigeria', 
  'Senegal',
  'Mali',
  'Burkina Faso',
  'Niger',
  'Guinea',
  'Sierra Leone',
  'Liberia',
  'Ivory Coast (Côte d\'Ivoire)',
  'Togo',
  'Benin',
  'Gambia',
  'Guinea-Bissau',
  'Mauritania',
  'Cape Verde'
] as const

export type WestAfricanCountry = typeof WEST_AFRICAN_COUNTRIES[number]

export const isWestAfricanCountry = (country: string): country is WestAfricanCountry => {
  return WEST_AFRICAN_COUNTRIES.includes(country as WestAfricanCountry)
}