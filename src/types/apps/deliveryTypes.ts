// Delivery Service Type Definitions

// Location Types
export interface GPSCoordinates {
  latitude: number
  longitude: number
}

// Base location type matching database schema
export interface BaseLocationType {
  $id: string
  locationName: string
  locationCode: string
  address: string
  city: string
  region: string
  country?: string
  gpsCoordinates?: string
  contactPerson?: string
  contactPhone?: string
  isActive: boolean
  $createdAt: string
  $updatedAt: string
}

export interface PickupLocationType extends BaseLocationType {
  // Additional fields can be added later if needed
}

export interface DropoffLocationType extends BaseLocationType {
  // Additional fields can be added later if needed
}

// Location Status Types
export type LocationStatusType = 'active' | 'inactive' | 'maintenance' | 'temporary-closed'

// Proximity validation
export interface ProximityValidation {
  locationId: string
  driverLocation: GPSCoordinates
  distance: number // in meters
  isWithinRange: boolean
  requiredProximity: number // default 100 meters
}

export interface DeliveryHistory {
  $id: string
  packageId: string
  packageTrackingNumber: string
  status: PackageStatusType
  location: string
  timestamp: string
  description: string
  driverName?: string
  driverId?: string
  completed: boolean
  $createdAt: string
  $updatedAt: string
}

export type PackageStatusType = 'pending' | 'picked-up' | 'in-transit' | 'out-for-delivery' | 'delivered' | 'failed'

export type TripStatusType = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'delayed'

export type VehicleStatusType = 'active' | 'maintenance' | 'available' | 'unavailable' | 'retired'

export type DriverStatusType = 'active' | 'offline' | 'on-trip'

export interface PackageTrackingType {
  $id: string
  trackingNumber: string
  // Simplified - no sender info required for driver entry
  recipient: string // Recipient name
  recipientPhone: string
  pickuplocation: string // pickup location ID (lowercase 'l')
  dropofflocation: string // dropoff location ID (lowercase 'l')
  manifest: string // manifest ID (package -> manifest -> trip relationship)
  // Note: trip relationship removed - access trip via manifest
  status: PackageStatusType
  expectedDeliveryDate: string
  deliveryDate?: string | null
  // Updated package fields
  packageSize: 'big' | 'medium' | 'small' | 'bin' // Driver-friendly size categories
  isBin?: boolean // Is this a bin containing multiple small items?
  itemCount?: number // Headcount of items in bin (for tracking)
  notes?: string // Optional special instructions
  $createdAt: string
  $updatedAt: string
}

export interface VehicleType {
  $id: string
  vehicleNumber: string
  licensePlate: string
  vehicleType: 'truck' | 'van' | 'bike' | 'car'
  type: 'truck' | 'van' | 'motorcycle' | 'bicycle'
  brand: string
  model: string
  year: number
  status: 'active' | 'maintenance' | 'retired' | 'available' | 'unavailable'
  ownership: 'owned' | 'rented'
  monthlyRentalCost: number
  driver?: string // relationship to user
  driverId?: string
  driverName?: string
  assignedRoute?: string // relationship to route
  capacity?: number
  location?: string
  fuelLevel?: number
  batteryLevel?: number
  lastMaintenance?: string
  nextMaintenance?: string
  $createdAt: string
  $updatedAt: string
}

export interface DriverType {
  $id: string
  name: string
  email: string
  phone: string
  avatar?: string
  rating: number
  totalDeliveries: number
  completedDeliveries: number
  onTimeDeliveries: number
  vehicleId?: string
  vehicleType?: string
  status: DriverStatusType
  todayEarnings: number
  monthlyEarnings: number
  licenseNumber: string
  licenseExpiry: string
  $createdAt: string
  $updatedAt: string
}

export interface TripType {
  $id: string
  tripNumber: string
  vehicle: string // vehicle ID (Many-to-one)
  driver: string // driver ID (Many-to-one)
  route: string // route ID (Many-to-one)
  tripDate: string
  startTime: string
  clientRate?: number
  driverRate?: number
  profit?: number
  manifests: string[] // array of manifest IDs (One-to-many)
  status: 'planned' | 'in_progress' | 'at_pickup' | 'on_route' | 'completed' | 'cancelled'
  notes?: string
  creator: string // creator ID (Many-to-one)
  
  // Trip Checkpoint Tracking
  checkpoints?: string | null // JSON string of checkpoint array
  currentLocation?: string | null // current GPS coordinates
  currentCheckpoint?: number // index of current checkpoint
  distanceTraveled?: number // in kilometers
  
  // GPS and Tracking
  gpsTrackingData?: string | null // JSON GPS tracking points
  
  // Financial
  tripexpenses?: string // trip expense ID (Many-to-one, not array)
  invoiceGenerated: boolean
  invoiceAmount: number
  paymentStatus: 'pending' | 'partial' | 'paid'
  
  $createdAt: string
  $updatedAt: string
}

export interface CustomerType {
  $id: string
  name: string
  email: string
  phone: string
  address: string
  avatar?: string
  totalPackages: number
  totalSpent: number
  preferredDeliveryTime?: string
  $createdAt: string
  $updatedAt: string
}

// Dashboard Data Interfaces
export interface PackageStats {
  active: number
  delivered: number
  pending: number
  inTransit: number
  failed: number
  totalRevenue: number
  packages?: PackageTrackingType[]
}

export interface VehicleStats {
  total: number
  active: number
  maintenance: number
  retired: number
  available?: number
  unavailable?: number
  vehicles?: VehicleType[]
}

export interface DriverStats {
  total: number
  active: number
  onTrip: number
  offline: number
  averageRating: number
  drivers?: DriverType[]
}

export interface TripStats {
  total: number
  active: number
  scheduled: number
  completed: number
  cancelled: number
  totalRevenue: number
  totalDistance: string
  trips?: TripType[]
}

export interface ClientStats {
  total: number
  new: number
  returning: number
  vip: number
  totalValue: number
  clients?: CustomerType[]
}

export interface RevenueData {
  today: number
  week: number
  month: number
  year: number
  growth: number
  isPositive: boolean
}

export interface DeliveryMetrics {
  totalPackages: number
  delivered: number
  pending: number
  inTransit: number
  failed: number
  onTimeRate: number
  successRate: number
}

// Main Dashboard Response Interface
export interface DeliveryDashboardData {
  packageStats: PackageStats
  vehicleStats: VehicleStats
  driverStats: DriverStats
  tripStats: TripStats
  clientStats: ClientStats
  revenueData: RevenueData
  deliveryMetrics: DeliveryMetrics
  activityTimeline: {
    rows: DeliveryHistory[]
    total: number
  }
}

// API Response Interfaces
export interface CreatePackageRequest {
  trackingNumber: string
  recipient: string
  recipientPhone: string
  pickuplocation: string // pickup location ID (lowercase 'l')
  dropofflocation: string // dropoff location ID (lowercase 'l')
  manifest: string // manifest ID
  trip: string // trip ID
  packageSize: 'big' | 'medium' | 'small' | 'bin'
  isBin?: boolean // Is this a bin?
  itemCount?: number // Headcount for bin
  notes?: string // Optional notes
  expectedDeliveryDate: string
  status: PackageStatusType
}

export interface CreateTripRequest {
  driverId: string
  vehicleId: string
  route: string
  origin: string
  destination: string
  packages: string[]
  estimatedArrival: string
}

export interface UpdatePackageStatusRequest {
  packageId: string
  status: PackageStatusType
  location: string
  description: string
  driverId?: string
}

export interface UpdateDriverLocationRequest {
  driverId: string
  latitude: number
  longitude: number
  address: string
}

// Search and Filter Types
export interface PackageSearchFilter {
  status?: PackageStatusType[]
  dateRange?: {
    start: string
    end: string
  }
  driverId?: string
  origin?: string
  destination?: string
}

export interface TripSearchFilter {
  status?: TripStatusType[]
  dateRange?: {
    start: string
    end: string
  }
  driverId?: string
  vehicleId?: string
}

export interface DriverSearchFilter {
  status?: DriverStatusType[]
  rating?: {
    min: number
    max: number
  }
  vehicleType?: string[]
}

// Manifest Types
export type ManifestStatusType = 'pending' | 'loaded' | 'in_transit' | 'delivered' | 'completed'

export interface ManifestType {
  $id: string
  manifestNumber: string
  trip: string // relationship to trip
  vehicle: string // relationship to vehicle
  driver: string // relationship to user with role as driver
  pickuplocation: string // relationship to pickup location (lowercase 'l')
  dropofflocation: string // relationship to dropoff location (lowercase 'l')
  dropoffSequence: number // order in route
  manifestDate: string
  totalPackages: number
  packageTypes: string // JSON string: {small: number, medium: number, big: number, bin: number}
  packages: string[] // array of package IDs
  status: ManifestStatusType
  manifestImage?: string | null // uploaded manifest photo
  departureTime?: string | null
  arrivalTime?: string | null
  deliveryTime?: string | null
  notes?: string
  // Proof of delivery fields
  proofOfDeliveryImage?: string | null
  deliveryGpsCoordinates?: string | null
  deliveryGpsVerified: boolean
  gpsVerificationDistance?: number | null
  deliveredPackages: string // JSON string of delivered package IDs
  missingPackages: string // JSON string of missing package IDs
  recipientName?: string | null
  recipientPhone?: string | null
  creator: string 
  $createdAt: string
  $updatedAt: string
}

export interface ManifestStats {
  total: number
  pending: number
  loaded: number
  in_transit: number
  delivered: number
  completed: number
}

export interface ManifestFilters {
  search: string
  status?: ManifestStatusType
  dateRange?: {
    start: string
    end: string
  }
  driverId?: string
  vehicleId?: string
  pickupLocationId?: string
  dropoffLocationId?: string
}

// Route Types
export interface RouteStopType {
  locationId: string
  locationName: string
  address: string
  sequence: number // order in the route
  estimatedArrival?: string
  actualArrival?: string
}

export interface RouteType {
  $id: string
  routeName: string
  routeCode: string
  startLocation: string // pickup location ID
  startLocationName?: string
  endLocation: string // final dropoff location ID
  endLocationName?: string
  intermediateStops: RouteStopType[] // array of intermediate dropoff locations
  distance?: number // in kilometers
  estimatedDuration?: number // in minutes
  baseRate: number
  isActive: boolean
  $createdAt: string
  $updatedAt: string
}

export interface RouteFilters {
  search?: string
  isActive?: boolean
  startLocation?: string
  endLocation?: string
}

// Trip Types (Enhanced)
export interface TripManifestType {
  dropoffLocationId: string
  dropoffLocationName: string
  manifestId?: string
  manifestNumber?: string
  packages: string[] // package IDs
  packageCount: number
  status: ManifestStatusType
}

export interface TripDetailsType {
  $id: string
  tripNumber: string
  driverId: string
  driverName: string
  vehicleId: string
  vehicleNumber: string
  routeId: string
  routeName: string
  status: TripStatusType
  startTime: string
  endTime?: string
  manifests: TripManifestType[]
  totalPackages: number
  deliveredPackages: number
  notes?: string
  creator: string
  $createdAt: string
  $updatedAt: string
}