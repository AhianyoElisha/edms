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
  sender: string
  senderPhone: string
  recipient: string
  recipientPhone: string
  origin: string
  destination: string
  status: PackageStatusType
  estimatedDelivery: string
  currentLocation?: string
  driverName?: string
  driverPhone?: string
  packageType: string
  weight: string
  value: number
  timeline: DeliveryHistory[]
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
  driverId: string
  driverName: string
  vehicleId: string
  vehicleLicense: string
  route: string
  origin: string
  destination: string
  status: TripStatusType
  startTime: string
  estimatedArrival: string
  actualArrival?: string
  packages: string[] // Array of package IDs
  packagesCount: number
  completedDeliveries: number
  revenue: number
  distance: string
  fuelCost: number
  tolls: number
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
  sender: string
  senderPhone: string
  recipient: string
  recipientPhone: string
  origin: string
  destination: string
  packageType: string
  weight: string
  value: number
  estimatedDelivery: string
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
  vehicle: string // relationship to vehicle
  driver: string // relationship to user with role as driver
  pickupLocation: string // relationship to pickup location
  dropoffLocation: string // relationship to dropoff location
  manifestDate: string
  totalPackages: number
  packageTypes: {
    small: number
    medium: number
    large: number
    bins: number
  }
  packages: string[] // array of package IDs
  status: ManifestStatusType
  manifestImage?: string // uploaded manifest photo
  departureTime?: string
  arrivalTime?: string
  deliveryTime?: string
  notes?: string
  creator: string // relationship to user
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