// Trip Wizard Data Types

export interface TripDetailsData {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNumber: string
  routeId: string
  routeName: string
  startTime: string
  notes?: string
}

export interface ManifestData {
  tempId: string
  dropoffLocationId: string
  dropoffLocationName: string
  dropoffAddress: string
  manifestNumber: string
  departureTime?: string
  estimatedArrival?: string
  notes?: string
}

export interface PackageData {
  tempId: string
  manifestTempId: string
  packageSize: 'big' | 'medium' | 'small' | 'bin' // Simplified size categories
  trackingNumber: string
  recipientName: string
  recipientPhone: string
  // Bin-specific fields
  isBin?: boolean // true if this is a bin containing smaller packages
  itemCount?: number // Number of small items in the bin (headcount)
  notes?: string // Optional notes for special instructions
}

export interface TripWizardData {
  tripDetails: TripDetailsData
  manifests: ManifestData[]
  packages: PackageData[]
}

export interface WizardStepProps {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  wizardData: TripWizardData
  updateWizardData: (data: Partial<TripWizardData>) => void
}
