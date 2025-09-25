import type { logisticsType } from '@/types/apps/logisticsTypes'

export const db: logisticsType = {
  vehicles: [
    {
      id: 1,
      location: 468031,
      startcity: 'Accra Warehouse Quarters',
      startCountry: 'Ejisu',
      endCity: 'Ejisu',
      endCountry: 'Kumasi',
      warnings: 'No Warnings',
      progress: 49
    },
    {
      id: 2,
      location: 302781,
      startcity: 'Accra Warehouse Quarters',
      startCountry: 'Ejisu',
      endCity: 'Kotei',
      endCountry: 'Kumasi',
      warnings: 'Ecu Not Responding',
      progress: 24
    },
    {
      id: 3,
      location: 715822,
      startcity: 'Accra Warehouse Quarters',
      startCountry: 'Ejisu',
      endCity: 'Adum',
      endCountry: 'Kumasi',
      warnings: 'Oil Leakage',
      progress: 7
    },
    {
      id: 4,
      location: 451430,
      startcity: 'Accra Warehouse Quarters',
      startCountry: 'Kumasi',
      endCity: 'Kejetia',
      endCountry: 'Kumasi',
      warnings: 'No Warnings',
      progress: 95
    },
    {
      id: 5,
      location: 921577,
      startcity: 'Accra Warehouse Quarters',
      startCountry: 'Ejisu',
      endCity: 'Bomso',
      endCountry: 'Kumasi',
      warnings: 'No Warnings',
      progress: 65
    },
  ]
}
