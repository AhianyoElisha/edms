export type Vehicle = {
  id: number
  location: number
  startcity: string
  startCountry: string
  endCity: string
  endCountry: string
  warnings: string
  progress: number
}

export type logisticsType = {
  vehicles: Vehicle[]
}
