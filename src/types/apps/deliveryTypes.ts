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
  manifestId: string
  manifestNumber: string
  status: ManifestStatusType
  location: string
  timestamp: string
  description: string
  driverName?: string
  driverId?: string
  completed: boolean
  $createdAt: string
  $updatedAt: string
}

// Package size type - each manifest holds ONE type of package
export type PackageSizeType = 'small' | 'medium' | 'big'

export type TripStatusType = 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'delayed'

export type VehicleStatusType = 'active' | 'maintenance' | 'available' | 'unavailable' | 'retired'

export type DriverStatusType = 'active' | 'offline' | 'on-trip'

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
  vehicle: any // vehicle ID (Many-to-one)
  driver: any // driver ID (Many-to-one)
  route: any // route ID (Many-to-one)
  tripDate: string
  startTime: string
  tonnage?: string // e.g., '10' for 10 CBM volume tier
  tripCost?: number // Price from rate card based on route + tonnage
  clientRate?: number
  driverRate?: number
  profit?: number
  manifests: string[] // array of manifest IDs (One-to-many)
  status: 'planned' | 'in_progress' | 'at_pickup' | 'on_route' | 'completed' | 'cancelled' | 'awaiting_manifests'
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
export interface ManifestStatsData {
  total: number
  delivered: number
  pending: number
  inTransit: number
  loaded: number
  totalPackages: number // total package count across all manifests
  deliveredPackages: number // total delivered packages
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
  manifestStats: ManifestStatsData
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

// Package Status Type (used for backwards compatibility)
export type PackageStatusType = 'pending' | 'loaded' | 'in-transit' | 'delivered' | 'failed'

// DEPRECATED: These interfaces are kept for backwards compatibility
// Package tracking is now done at the manifest level
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
export interface ManifestSearchFilter {
  status?: ManifestStatusType[]
  packageSize?: PackageSizeType
  dateRange?: {
    start: string
    end: string
  }
  driverId?: string
  dropoffLocationId?: string
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
// NEW SCHEMA: Each manifest holds ONE type of package size (small, medium, or big)
// This simplifies the tracking - just head count per manifest
export type ManifestStatusType = 'pending' | 'loaded' | 'in_transit' | 'delivered' | 'completed'

export interface ManifestType {
  $id: string
  manifestNumber: string
  trip: string // relationship to trip (trip contains vehicle, driver, route relationships)
  dropofflocation: string // direct relationship to dropoff location (manifest serves ONE dropoff location)
  dropoffSequence: number // order in route
  manifestDate: string
  
  // NEW: Package tracking by head count - each manifest holds ONE package size type
  packageSize: PackageSizeType // 'small' | 'medium' | 'big' - the type of packages in this manifest
  packageCount: number // total head count of packages in this manifest
  deliveredCount: number // number of packages successfully delivered
  
  status: ManifestStatusType
  manifestImage?: string | null // uploaded manifest photo
  departureTime?: string | null
  arrivalTime?: string | null
  deliveryTime?: string | null
  estimatedArrival?: string | null // estimated arrival time
  notes?: string | null
  
  // Proof of delivery fields
  proofOfDeliveryImage?: string | null
  deliveryGpsCoordinates?: string | null
  deliveryGpsVerified?: boolean
  gpsVerificationDistance?: number | null
  
  // Recipient details (auto-populated from dropofflocation)
  recipientName?: string | null
  recipientPhone?: string | null
  
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
}

export interface RouteType {
  $id: string
  routeName: string
  routeCode: string
  startLocation: string // pickup location ID (populated as object when queried with select)
  endLocation: string // final dropoff location ID (populated as object when queried with select)
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

// ============================================
// RATE CARDS TYPES
// ============================================

// Truck categories based on size classification
export type TruckCategoryType = 'small' | 'big'

// Volume tiers in CBM (Cubic Meters) based on truck category
// Small truck volumes: 10, 14, 18 CBM
// Big truck volumes: 37, 41, 50, 55, 60 CBM
export type SmallTruckVolumeType = 10 | 14 | 18
export type BigTruckVolumeType = 37 | 41 | 50 | 55 | 60
export type TruckVolumeType = SmallTruckVolumeType | BigTruckVolumeType

// Tonnage corresponding to volume tiers
// Small truck: 3, 3.5, 5 tons
// Big truck: 7, 8, 10, 12, 15 tons
export type SmallTruckTonnageType = 3 | 3.5 | 5
export type BigTruckTonnageType = 7 | 8 | 10 | 12 | 15
export type TruckTonnageType = SmallTruckTonnageType | BigTruckTonnageType

// Volume tier configuration for display purposes
export interface VolumeTierConfig {
  volume: number // CBM
  revisedVolume: number // Revised CBM
  tonnage: number // Tons
  truckCategory: TruckCategoryType
}

// All available volume tiers
export const VOLUME_TIERS: VolumeTierConfig[] = [
  // Small truck tiers
  { volume: 10, revisedVolume: 10, tonnage: 3, truckCategory: 'small' },
  { volume: 14, revisedVolume: 15, tonnage: 3.5, truckCategory: 'small' },
  { volume: 18, revisedVolume: 18, tonnage: 5, truckCategory: 'small' },
  // Big truck tiers
  { volume: 37, revisedVolume: 37, tonnage: 7, truckCategory: 'big' },
  { volume: 41, revisedVolume: 41, tonnage: 8, truckCategory: 'big' },
  { volume: 50, revisedVolume: 50, tonnage: 10, truckCategory: 'big' },
  { volume: 55, revisedVolume: 55, tonnage: 12, truckCategory: 'big' },
  { volume: 60, revisedVolume: 60, tonnage: 15, truckCategory: 'big' },
  { volume: 65, revisedVolume: 65, tonnage: 18, truckCategory: 'big' },
]

// Price entry for a specific volume tier
export interface VolumePrice {
  volume: number // CBM (10, 14, 18, 37, 41, 50, 55, 60)
  tonnage: number // Corresponding tonnage
  rate: number // Price in local currency (GH₵)
}

// Rate Card Type - Now route-based with volume tiers
export interface RateCardType {
  $id: string
  clientName: string // Name of the importer/client (e.g., "JUMIA", "FRANKO")
  clientCode: string // Unique code for the client
  route?: any // Relationship to route document
  routeCode: string // Route code (e.g., "Route A", "Route B", "VDO 1")
  routeDescription: string // Route description (e.g., "GH-Primary-Tema", "GH-Primary-Dansoman")
  // Volume-based pricing - JSON string stored in DB, parsed to array
  volumePrices: VolumePrice[] | string // Array of prices per volume tier
  effectiveFrom: string // Date this rate becomes effective (ISO string)
  effectiveTo?: string // Date this rate expires (null = still active)
  isActive: boolean
  notes?: string
  creator: string // User ID who created this rate card
  $createdAt: string
  $updatedAt: string
}

export interface RateCardInput {
  clientName: string
  clientCode: string
  route?: string // Route document ID (relationship)
  routeCode: string
  routeDescription: string
  volumePrices: VolumePrice[] // Array of prices per volume tier
  effectiveFrom: string
  effectiveTo?: string
  isActive?: boolean
  notes?: string
}

export interface RateCardFilters {
  clientCode?: string
  routeCode?: string
  truckCategory?: TruckCategoryType
  isActive?: boolean
  search?: string
}

// Legacy type kept for compatibility
export type VehicleSizeType = 'small' | 'medium' | 'large' | 'extra-large'

// ============================================
// RETURN WAY BILLS TYPES
// ============================================

export type ReturnReasonType = 'rejected' | 'damaged' | 'wrong_delivery' | 'customer_return' | 'other'
export type ReturnWaybillStatusType = 'pending' | 'in_transit' | 'delivered' | 'processed'

export interface PackageBreakdown {
  small: number
  medium: number
  big: number
}

export interface ReturnWaybillType {
  $id: string
  waybillNumber: string // Unique way bill number (e.g., "RWB-2026-001234")
  trip: string | any // Relationship to trips collection
  manifest?: string | any // Source manifest (optional)
  dropofflocation: string | any // Origin of return (dropoff location)
  pickuplocation: string | any // Destination (pickup location)
  returnDate: string // Date the return was initiated
  returnReason: ReturnReasonType
  reasonNotes?: string // Additional details about return reason
  packageCount: number // Total count of packages being returned
  packageDetails?: string | PackageBreakdown // JSON breakdown by size or parsed object
  status: ReturnWaybillStatusType
  deliveredAt?: string // When the return was delivered to pickup location
  receivedBy?: string // Name of person who received the return
  receiverSignature?: string // File ID of signature image
  waybillImage?: string // File ID of waybill document image
  proofOfDelivery?: string // File ID of proof of delivery image
  notes?: string
  $createdAt: string
  $updatedAt: string
}

export interface ReturnWaybillInput {
  tripId: string
  manifestId?: string
  dropoffLocationId: string
  pickupLocationId: string
  returnDate: string
  returnReason: ReturnReasonType
  reasonNotes?: string
  packageCount: number
  packageDetails?: PackageBreakdown
  notes?: string
}

export interface ReturnWaybillFilters {
  tripId?: string
  dropoffLocationId?: string
  pickupLocationId?: string
  status?: ReturnWaybillStatusType
  returnReason?: ReturnReasonType
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

// ============================================
// EXPENSES TYPES (ENHANCED)
// ============================================

export type ExpenseTypeCategory = 
  | 'fuel' 
  | 'maintenance' 
  | 'tools' 
  | 'equipment' 
  | 'vehicle_purchase' 
  | 'office' 
  | 'salary' 
  | 'allowance'
  | 'truck_rental'
  | 'communication' 
  | 'utilities' 
  | 'trip_related'
  | 'other'

export type PaymentMethodType = 'cash' | 'bank_transfer' | 'mobile_money' | 'cheque' | 'credit'
export type PaymentStatusType = 'pending' | 'paid' | 'partial'

export interface ExpenseType {
  $id: string
  amount: number
  totalAmount?: number // Some systems use totalAmount
  expenseDate: string
  description: string
  category?: string
  expenseType: ExpenseTypeCategory
  subCategory?: string // Sub-category (e.g., "Oil Change" under maintenance)
  vendor?: string // Name of vendor/supplier
  receiptNumber?: string // Invoice/receipt number
  receiptImage?: string // File ID of receipt image
  additionalImages?: string | string[] // JSON array of additional image File IDs or parsed array
  vehicleId?: string // Relationship with vehicles (if expense is vehicle-related)
  tripId?: string // Relationship with trips (if expense is trip-related)
  paymentMethod?: PaymentMethodType
  paymentStatus: PaymentStatusType
  approvedBy?: string // User ID who approved the expense
  approvalDate?: string
  isRecurring?: boolean
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  creator?: string
  $createdAt: string
  $updatedAt: string
}

export interface ExpenseInput {
  amount: number
  expenseDate: string
  description: string
  expenseType: ExpenseTypeCategory
  subCategory?: string
  vendor?: string
  receiptNumber?: string
  vehicleId?: string
  tripId?: string
  paymentMethod?: PaymentMethodType
  paymentStatus?: PaymentStatusType
  isRecurring?: boolean
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  notes?: string
}

export interface ExpenseFilters {
  expenseType?: ExpenseTypeCategory
  paymentStatus?: PaymentStatusType
  vehicleId?: string
  tripId?: string
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}