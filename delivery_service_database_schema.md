# Deliv### 1. **packages** Collection (New - Core Entity)
```
$id: string
packageId: string (required, unique identifier/barcode)
trackingNumber: string (required, unique, size: 100) // unique tracking number
packageType: string (required) // small, medium, large, bins
relationship:pickupLocation: string (required)
relationship:dropoffLocation: string (required)
relationship:route: string
relationship:manifest: string (required) // link to manifest
relationship:trip: string (required) // link to trip
status: string (required) // pending, collected, in_transit, at_dropoff, delivered, missing, returned
createdAt: datetime (required)
deliveryDate: datetime
expectedDeliveryDate: datetime
relationship:creator: string

// Package Details
senderName: string (size: 200)
senderPhone: string (size: 20)
recipientName: string (required, size: 200)
recipientPhone: string (required, size: 20)
weight: float (min: 0) // in kg
value: float (min: 0) // declared value
description: string (size: 500)

// Delivery Tracking
deliveredAt: datetime
deliveryConfirmed: boolean (default: false) // checkbox confirmation during delivery
notDeliveredReason: string (size: 500) // if package not delivered
packagePhoto: string (size: 8000) // optional photo of package

$createdAt: datetime
$updatedAt: datetime
```ication Database Schema

## Overview
This document outlines the database schema transformation from a mineral water company management system to a comprehensive delivery service application based on client requirements and industry best practices.

## Core Collections (Modified/New)

### 1. **packages** Collection (New - Core Entity)
```
$id: string (auto)
packageId: string (required, unique identifier/barcode)
packageType: string (required) // small, medium, large, bin
relationship:pickupLocation: string (required)
relationship:dropoffLocation: string (required)
relationship:route: string
status: string (required) // collected, in_transit, delivered, returned, pending
createdAt: datetime (required)
deliveryDate: datetime
expectedDeliveryDate: datetime
relationship:creator: string
$createdAt: datetime
$updatedAt: datetime
```

### 2. **pickupLocations** Collection (New)
```
$id: string
locationName: string (required, size: 200)
locationCode: string (required, size: 20, unique)
address: string (required, size: 500)
city: string (required, size: 100)
region: string (required, size: 100)
gpsCoordinates: string (size: 50)
contactPerson: string (size: 200)
contactPhone: string (size: 20)
isActive: boolean (default: true)
$createdAt: datetime
$updatedAt: datetime
```

### 3. **dropoffLocations** Collection (New)
```
$id: string
locationName: string (required, size: 200)
locationCode: string (required, size: 20, unique)
address: string (required, size: 500)
city: string (required, size: 100)
region: string (required, size: 100)
gpsCoordinates: string (size: 50)
contactPerson: string (size: 200)
contactPhone: string (size: 20)
isActive: boolean (default: true)
$createdAt: datetime
$updatedAt: datetime
```

### 4. **routes** Collection (Modified from existing logistics)
```
$id: string
routeName: string (required, size: 200)
routeCode: string (required, size: 20, unique)
startLocation: string (required) // pickup location
endLocation: string (required) // dropoff location
distance: float (min: 0) // in kilometers
estimatedDuration: integer (min: 0) // in minutes
baseRate: float (min: 0, required)
isActive: boolean (default: true)
relationship:intermediateStops: array // for multi-stop routes
$createdAt: datetime
$updatedAt: datetime
```

### 5. **vehicles** Collection (Enhanced)
```
$id: string
vehicleNumber: string (required, size: 30, unique)
vehicleType: string (required) // truck, van, bike, car
brand: string (size: 100)
model: string (size: 100)
year: integer
status: string (required) // active, maintenance, retired
ownership: string (required) // owned, rented
monthlyRentalCost: float (min: 0, default: 0)
relationship:driver: string -  user with role as driver
relationship:assignedRoute: string
$createdAt: datetime
$updatedAt: datetime
```

### 6. **manifests** Collection (New - Core for Operations)
```
$id: string
manifestNumber: string (required, unique)
relationship:trip: string (required) // link to trip
relationship:vehicle: string (required)
relationship:driver: string (required) -  user with role as driver
relationship:pickupLocation: string (required)
relationship:dropoffLocation: string (required)
dropoffSequence: integer (min: 0) // order in route
manifestDate: datetime (required)
totalPackages: integer (min: 0, default: 0)
packageTypes: json // {small: 0, medium: 0, large: 0, bins: 0}
relationship:packages: array // list of package IDs
status: string (required) // pending, loaded, in_transit, at_location, delivered, completed
manifestImage: string (size: 8000) // uploaded manifest photo with signatures
departureTime: datetime
estimatedArrival: datetime
actualArrival: datetime
deliveryCompletedTime: datetime
notes: string (size: 1000)
relationship:creator: string (required)

// Proof of Delivery Fields
proofOfDeliveryImage: string (size: 8000) // physical manifest photo with signatures
deliveryGpsCoordinates: string (size: 100) // GPS coords where delivery was marked complete
deliveryGpsVerified: boolean (default: false) // whether driver was within 200m radius
gpsVerificationDistance: float // actual distance in meters from dropoff location
deliveredPackages: json // array of delivered package IDs with checkboxes
missingPackages: json // array of package IDs not delivered
deliveryNotes: string (size: 1000) // notes at time of delivery
recipientName: string (size: 200) // name of person who received
recipientPhone: string (size: 20) // phone of recipient
recipientSignature: string (size: 8000) // digital signature if captured

$createdAt: datetime
$updatedAt: datetime
```

### 7. **deliveries** Collection (New - Tracking Individual Deliveries)
```
$id: string
relationship:packages: string (required) deliveries can contain many packages and packages can belong to one deliveries
relationship:manifest: string (required) deliveries can contain many packages and
packages can belong to one deliveries
relationship:vehicle: string (required)
deliveryStatus: string (required) // picked_up, in_transit, delivered, failed, returned
attemptCount: integer (min: 0, default: 0)
deliveryAttempts: json // array of attempt details
actualDeliveryTime: datetime
deliveryPhoto: string (size: 5000)
deliveryNotes: string (size: 500)
failureReason: string (size: 500)
returnReason: string (size: 500)
$createdAt: datetime
$updatedAt: datetime
```

### 9. **tripExpenses** Collection (Enhanced from expenses)
```
$id: string
relationship:trip: string (required)
expenseType: string (required) // fuel, toll, maintenance, food, parking, other
description: string (required, size: 500)
amount: float (required, min: 0)
receiptNumber: string (size: 100)
receiptImage: string (size: 5000)
paymentMode: string (required) // cash, bank, card, mobile_money
expenseDate: datetime (required)
approvedBy: string (size: 200)
approvalStatus: string (required) // pending, approved, rejected
relationship:creator: string (required)
$createdAt: datetime
$updatedAt: datetime
```

### 10. **trips** Collection (New - Complete Trip Management)
```
$id: string
tripNumber: string (required, unique)
relationship:vehicle: strigpsVerificationDistanceng (required)
relationship:driver: string (required) -  user with role as driver
relationship:route: string (required)
tripDate: datetime (required)
startTime: datetime (required)
endTime: datetime
clientRate: float (min: 0) // rate charged to client
driverRate: float (min: 0) // rate paid to driver/transport
profit: float (default: 0)
relationship:manifests: array // multiple manifests per trip
status: string (required) // planned, in_progress, at_pickup, on_route, completed, cancelled
notes: string (size: 1000)
relationship:creator: string (required)

// Trip Checkpoint Tracking
checkpoints: json // array of dropoff locations with completion status
// Structure: [{
//   dropoffLocationId: string,
//   dropoffLocationName: string,
//   manifestId: string,
//   sequence: number,
//   status: 'pending' | 'arrived' | 'delivering' | 'completed' | 'skipped',
//   arrivalTime: datetime,
//   completionTime: datetime,
//   gpsCoordinates: string,
//   gpsVerified: boolean,
//   packagesDelivered: number,
//   packagesMissing: number

// }]

// GPS and Tracking
gpsTrackingData: json // GPS tracking points during trip
currentLocation: string (size: 100) // current GPS coordinates
currentCheckpoint: integer // index of current checkpoint
distanceTraveled: float // in kilometers

// Financial
relationship:expenses: array
invoiceGenerated: boolean (default: false)
invoiceAmount: float (min: 0, default: 0)
paymentStatus: string (required) // pending, partial, paid

$createdAt: datetime
$updatedAt: datetime
```

### 11. **rateCards** Collection (New - Dynamic Pricing)
```
$id: string
relationship:route: string (required)
baseRate: float (required, min: 0)
perKmRate: float (min: 0, default: 0)
fuelSurcharge: float (min: 0, default: 0)
driverCommission: float (min: 0, default: 0)
effectiveDate: datetime (required)
expiryDate: datetime
isActive: boolean (default: true)
currency: string (required, size: 10, default: "GHS")
notes: string (size: 500)
relationship:creator: string (required)
$createdAt: datetime
$updatedAt: datetime
```

### 12. **notifications** Collection (New)
```
$id: string
type: string (required) // sms, email, push, in_app
recipient: string (required) // phone, email, or user ID
subject: string (size: 200)
message: string (required, size: 1000)
status: string (required) // pending, sent, delivered, failed
$createdAt: datetime
$updatedAt: datetime
```

### 13. **gpsVerificationLogs** Collection (New - GPS Proximity Tracking)
```
$id: string
relationship:trip: string (required)
relationship:manifest: string (required)
relationship:driver: string (required)
relationship:dropoffLocation: string (required)
attemptTime: datetime (required)
driverGpsCoordinates: string (required, size: 100) // driver's GPS at time of attempt
dropoffGpsCoordinates: string (required, size: 100) // expected dropoff GPS
calculatedDistance: float (required) // distance in meters
isWithinRadius: boolean (required) // true if within 200m
requiredRadius: float (default: 200) // required proximity in meters
verificationResult: string (required) // success, too_far, gps_unavailable, location_error
errorMessage: string (size: 500) // if verification failed
deviceInfo: string (size: 500) // device and GPS accuracy info
$createdAt: datetime
$updatedAt: datetime
```

## Collections to Keep (with minor modifications)

### 17. **users** Collection (Keep existing structure)
- Add delivery-specific roles: driver, pickup_agent, delivery_agent, route_manager

### 18. **roles** Collection (Keep existing)
- Update with new delivery service roles

### 19. **permissions** Collection (Keep existing)
- Update with delivery-specific permissions

### 20. **rolepermission** Collection (Keep existing)

## Collections to Remove/Archive
- mineralwater specific collections (stores, production, warehouse, machinery, etc.)
- workersproduction
- spoilage (unless neegpsVerificationDistanceded for package damage tracking)
- salescategory (replace with delivery zones)

## Key Relationships

### Package Lifecycle
```
Driver creates Package → Assigned to Manifest → Loaded to Vehicle → Tracked via Deliveries → Completed
```

### Trip Management
```
Route → Vehicle + Driver → Multiple Manifests → Expenses → Invoice → Payment
```


## Integration Points

### SMS/Notification System
- Bulk SMS for delivery notifications
- Real-time status updates
- Automated client notifications

### GPS Tracking Integration
- Vehicle location tracking
- Route optimization
- Fuel monitoring integration

### Payment Integration
- Commission calculations

### Reporting System
- Daily trip reports
- Monthly invoice generation
- Performance analytics
- Financial summaries

## Security Considerations

### Access Control
- Role-based permissions for different user types
- Location-based access restrictions
- Audit trails for all transactions

### Data Protection
- Encrypted sensitive data (phone numbers, addresses)
- Secure file uploads for manifests and receipts
- Regular backup procedures

This schema provides a comprehensive foundation for a modern delivery service application while maintaining the robust structure of the existing system.