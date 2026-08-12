// Trip Wizard Data Types

export interface TripDetailsData {
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNumber: string
  routeId: string
  routeName: string
  startTime: string
  tonnage?: string
  tripCost?: number
  notes?: string
}

// NEW: ManifestData now includes package size and count directly
// Each manifest holds ONE type of package size (small, medium, or big)
export interface ManifestData {
  tempId: string
  // Present only when the manifest already exists in the database (edit flow).
  // New manifests added while editing leave this undefined.
  $id?: string
  // Current delivery state, carried through the edit wizard so already-delivered
  // manifests can be locked from edits/removal.
  status?: string
  deliveredCount?: number
  dropoffLocationId: string
  dropoffLocationName: string
  dropoffAddress: string
  manifestNumber: string
  packageSize: 'small' | 'medium' | 'big' // The type of packages in this manifest
  packageCount: number // Head count of packages
  departureTime?: string
  estimatedArrival?: string
  notes?: string
}

// TripWizardData no longer needs packages array - package info is in manifests
export interface TripWizardData {
  tripDetails: TripDetailsData
  manifests: ManifestData[]
}

export interface WizardStepProps {
  activeStep: number
  handleNext: () => void
  handlePrev: () => void
  steps: { title: string; subtitle: string }[]
  wizardData: TripWizardData
  updateWizardData: (data: Partial<TripWizardData>) => void
}
