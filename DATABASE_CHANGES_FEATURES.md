# EDS - New Features Database Schema & Implementation Plan

## Overview

This document outlines the database schema changes and implementation plan for the following new features:
1. **Rate Cards** - Pricing structure for trips based on client, route, and truck volume
2. **Return Way Bills** - Track products returned to pickup location during trips
3. **Expenses Enhancement** - Support various expense types with receipt uploads

---

## 1. RATE CARDS FEATURE

### Purpose
Rate cards determine the cost of each trip based on:
- The importer/client (e.g., JUMIA)
- Route code (e.g., Route A, Route B, VDO 1)
- Truck volume in CBM (Cubic Meters)

### Truck Categories and Volume Tiers

Based on the rate card matrix:

| Category | Volume Tiers (CBM) | Revised Volume | Tonnage |
|----------|-------------------|----------------|---------|
| **Small Truck** | 10 | 10 | 3 tons |
| | 14 | 15 | 3.5 tons |
| | 18 | 18 | 5 tons |
| **Big Truck** | 37 | 37 | 7 tons |
| | 41 | 41 | 8 tons |
| | 50 | 50 | 10 tons |
| | 55 | 55 | 12 tons |
| | 60 | 60 | 15 tons |

### Sample Rate Card Matrix (JUMIA)

| Route | Descr+n | 10 CBM | 14 CBM | 18 CBM | 37 CBM | 41 CBM | 50 CBM | 55 CBM | 60 CBM |
|-------|-------------|--------|--------|--------|--------|--------|--------|--------|--------|
| Route A | GH-Primary-Tema | 893 | 961 | 996 | 1,753 | 1,821 | 1,890 | 2,163 | 2,334 |
| Route B | GH-Primary-Dansoman | 1,013 | 1,103 | 1,147 | 2,103 | 2,193 | 2,282 | 2,640 | 2,863 |
| Route C | GH-Primary-Haatso-Station | 947 | 1,031 | 1,073 | 1,968 | 2,052 | 2,136 | 2,471 | 2,681 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

### Database Collection: `ratecards` (ID: 68d615200027173fa63e)

#### Attributes to CREATE:

| Attribute Name | Type | Required | Description |
|----------------|------|----------|-------------|
| `clientName` | String (255) | Yes | Name of the importer/client (e.g., "JUMIA", "FRANKO") |
| `clientCode` | String (50) | Yes | Unique code for the client |
| `routeCode` | String (50) | Yes | Route code (e.g., "Route A", "Route B", "VDO 1") |
| `routeDescription` | String (255) | Yes | Route description (e.g., "GH-Primary-Tema") |
| `volumePrices` | String (5000) | Yes | JSON string with volume-based pricing array |
| `effectiveFrom` | DateTime | Yes | Date this rate becomes effective |
| `effectiveTo` | DateTime | No | Date this rate expires (null = still active) |
| `isActive` | Boolean | Yes | Whether this rate card is currently active |
| `notes` | String (1000) | No | Additional notes about this rate |
| `creator` | String | Yes | User ID who created this rate card |

#### volumePrices JSON Structure:
```json
[
  { "volume": 10, "tonnage": 3, "rate": 893 },
  { "volume": 14, "tonnage": 3.5, "rate": 961 },
  { "volume": 18, "tonnage": 5, "rate": 996 },
  { "volume": 37, "tonnage": 7, "rate": 1753 },
  { "volume": 41, "tonnage": 8, "rate": 1821 },
  { "volume": 50, "tonnage": 10, "rate": 1890 },
  { "volume": 55, "tonnage": 12, "rate": 2163 },
  { "volume": 60, "tonnage": 15, "rate": 2334 }
]
```

#### Indexes:
- `clientCode_routeCode` - Compound index for quick lookups
- `clientCode` - For filtering by client
- `routeCode` - For filtering by route
- `isActive` - For filtering active rates

---

## 2. RETURN WAY BILLS FEATURE

### Purpose
Return way bills track packages that need to be returned to the pickup location:
- Products rejected at delivery
- Damaged products
- Wrongfully delivered products

**Key Differences from Manifests:**
- Direction: Dropoff → Pickup (opposite of manifest)
- Multiple returns can exist per dropoff location
- All package sizes can be on ONE return waybill
- Trip not complete until all return waybills delivered to pickup

### Database Collection: `returnwaybills` (NEW COLLECTION)

#### Collection ID to CREATE: Use Appwrite console to create

#### Attributes to CREATE:

| Attribute Name | Type | Required | Description |
|----------------|------|----------|-------------|
| `waybillNumber` | String (50) | Yes | Unique way bill number (e.g., "RWB-2026-001234") |
| `trip` | Relationship | Yes | Many-to-One with trips collection |
| `manifest` | Relationship | No | Many-to-One with manifests (source manifest, optional) |
| `dropofflocation` | Relationship | Yes | Many-to-One with dropofflocations (origin of return) |
| `pickuplocation` | Relationship | Yes | Many-to-One with pickuplocations (destination) |
| `returnDate` | DateTime | Yes | Date the return was initiated |
| `returnReason` | Enum | Yes | 'rejected' \| 'damaged' \| 'wrong_delivery' \| 'customer_return' \| 'other' |
| `reasonNotes` | String (500) | No | Additional details about return reason |
| `packageCount` | Integer | Yes | Total count of packages being returned |
| `packageDetails` | String (2000) | No | JSON string with breakdown by size: {small: 5, medium: 3, big: 2} |
| `status` | Enum | Yes | 'pending' \| 'in_transit' \| 'delivered' \| 'processed' |
| `deliveredAt` | DateTime | No | When the return was delivered to pickup location |
| `receivedBy` | String (255) | No | Name of person who received the return |
| `receiverSignature` | String | No | File ID of signature image |
| `waybillImage` | String | No | File ID of waybill document image |
| `proofOfDelivery` | String | No | File ID of proof of delivery image |
| `notes` | String (1000) | No | Additional notes |

#### Relationships:
- `trip` → trips (Many-to-One, Two-Way)
- `manifest` → manifests (Many-to-One, One-Way) 
- `dropofflocation` → dropofflocations (Many-to-One, Two-Way)
- `pickuplocation` → pickuplocations (Many-to-One, Two-Way)

#### Indexes:
- `waybillNumber` - Unique
- `trip` - For finding all returns for a trip
- `status` - For filtering by status
- `dropofflocation` - For finding returns from a location

---

## 3. EXPENSES ENHANCEMENT

### Database Collection: `expenses` (ID: 6835de68001ebc3f8216)

#### Existing Attributes (keep):
- `amount` / `totalAmount`
- `expenseDate`
- `description`
- `category` (if exists)

#### NEW Attributes to ADD:

| Attribute Name | Type | Required | Description |
|----------------|------|----------|-------------|
| `expenseType` | Enum | Yes | Main type: 'fuel' \| 'maintenance' \| 'tools' \| 'equipment' \| 'vehicle_purchase' \| 'office' \| 'salary' \| 'communication' \| 'utilities' \| 'other' |
| `subCategory` | String (100) | No | Sub-category (e.g., "Oil Change" under maintenance) |
| `vendor` | String (255) | No | Name of vendor/supplier |
| `receiptNumber` | String (100) | No | Invoice/receipt number |
| `receiptImage` | String | No | File ID of receipt image |
| `additionalImages` | String | No | JSON array of additional image File IDs |
| `vehicleId` | Relationship | No | Many-to-One with vehicles (if expense is vehicle-related) |
| `tripId` | Relationship | No | Many-to-One with trips (if expense is trip-related) |
| `paymentMethod` | Enum | No | 'cash' \| 'bank_transfer' \| 'mobile_money' \| 'cheque' \| 'credit' |
| `paymentStatus` | Enum | Yes | 'pending' \| 'paid' \| 'partial' |
| `approvedBy` | String | No | User ID who approved the expense |
| `approvalDate` | DateTime | No | When expense was approved |
| `isRecurring` | Boolean | No | Whether this is a recurring expense |
| `recurringFrequency` | Enum | No | 'daily' \| 'weekly' \| 'monthly' \| 'yearly' |

---

## 4. TRIPS COLLECTION UPDATES

### Existing Collection: `trips` (ID: 68d60fed0006e92089b6)

#### NEW Attributes to ADD:

| Attribute Name | Type | Required | Description |
|----------------|------|----------|-------------|
| `rateCard` | Relationship | No | Many-to-One with ratecards |
| `calculatedCost` | Double | No | Trip cost calculated from rate card |
| `returnWaybills` | Relationship | No | One-to-Many with returnwaybills |
| `returnsCompleted` | Boolean | No | Whether all return waybills are delivered |
| `returnCompletedAt` | DateTime | No | When all returns were completed |

#### Updated Trip Completion Logic:
A trip is considered complete when:
1. All manifests are delivered (existing logic)
2. **AND** all return waybills (if any) are delivered to pickup location

---

## 5. FILE STORAGE

### Bucket: Use existing bucket (ID: 68e6a9100001d5b0c070)

Files to store:
- Return waybill images
- Return proof of delivery
- Receiver signatures
- Expense receipt images

---

## IMPLEMENTATION ORDER

### Phase 1: Database Setup (Appwrite Console)
1. Add attributes to `ratecards` collection
2. Create `returnwaybills` collection with attributes
3. Add new attributes to `expenses` collection
4. Add new attributes to `trips` collection
5. Create relationships between collections

### Phase 2: Type Definitions
1. Create `RateCardType` interface
2. Create `ReturnWaybillType` interface
3. Update `ExpenseType` interface
4. Update `TripType` interface

### Phase 3: Actions
1. Create `ratecard.actions.ts` - CRUD operations
2. Create `returnwaybill.actions.ts` - CRUD + delivery tracking
3. Update `expense.actions.ts` - Add receipt handling
4. Update `trip.actions.ts` - Add return waybill completion logic

### Phase 4: Views & Navigation
1. Create Rate Cards views (list, create, edit)
2. Create Return Waybills views (list, create, view)
3. Update Expenses views (add receipt upload)
4. Update Trip views (show returns, rate card selection)
5. Update Navigation menu

### Phase 5: Integration
1. Integrate rate card selection in trip creation
2. Add return waybill creation from manifest view
3. Update trip completion logic
4. Testing and verification

---

## API ENDPOINTS / ACTIONS TO CREATE

### Rate Cards (`src/libs/actions/ratecard.actions.ts`)
```typescript
- createRateCard(data: RateCardInput, creator: string): Promise<RateCardType>
- getRateCardById(id: string): Promise<RateCardType>
- getAllRateCards(filters?: RateCardFilters): Promise<RateCardType[]>
- getActiveRateCards(): Promise<RateCardType[]>
- getRateCardsByClient(clientCode: string): Promise<RateCardType[]>
- getRateCardsByRoute(routeCode: string): Promise<RateCardType[]>
- findApplicableRate(clientCode: string, routeCode: string, volumeCBM: number): Promise<{ rateCard: RateCardType; rate: number } | null>
- calculateTripCost(clientCode: string, routeCode: string, volumeCBM: number): Promise<{ rateCard: RateCardType | null; rate: number; truckCategory: 'small' | 'big'; volume: number; error?: string }>
- getRouteRateMatrix(clientCode: string, routeCode: string): Promise<VolumePrice[] | null>
- updateRateCard(id: string, data: Partial<RateCardInput>): Promise<RateCardType>
- deactivateRateCard(id: string): Promise<RateCardType>
- deleteRateCard(id: string): Promise<void>
- getUniqueClients(): Promise<{ code: string; name: string }[]>
- getUniqueRoutes(): Promise<{ code: string; description: string }[]>
- duplicateRateCard(sourceId: string, effectiveFrom: string, effectiveTo?: string, creator?: string): Promise<RateCardType>
- bulkCreateRateCards(clientName: string, clientCode: string, routes: Array<{routeCode: string; routeDescription: string; volumePrices: VolumePrice[]}>, effectiveFrom: string, creator: string, effectiveTo?: string): Promise<RateCardType[]>
- getRateCardStats(): Promise<{ total: number; active: number; inactive: number; clientCount: number; routeCount: number }>
```

### Return Waybills (`src/libs/actions/returnwaybill.actions.ts`)
```typescript
- createReturnWaybill(data: ReturnWaybillInput): Promise<ReturnWaybillType>
- getReturnWaybillById(id: string): Promise<ReturnWaybillType>
- getReturnWaybillsByTrip(tripId: string): Promise<ReturnWaybillType[]>
- getReturnWaybillsByDropoff(dropoffId: string): Promise<ReturnWaybillType[]>
- getPendingReturnWaybills(): Promise<ReturnWaybillType[]>
- updateReturnWaybill(id: string, data: Partial<ReturnWaybillInput>): Promise<ReturnWaybillType>
- markReturnWaybillDelivered(id: string, receivedBy: string, proofImage?: string): Promise<ReturnWaybillType>
- checkTripReturnsComplete(tripId: string): Promise<boolean>
```

### Expenses (update `src/libs/actions/expense.actions.ts` or create new)
```typescript
- createExpense(data: ExpenseInput): Promise<ExpenseType>
- uploadExpenseReceipt(expenseId: string, file: File): Promise<string>
- getExpensesByType(expenseType: string): Promise<ExpenseType[]>
- getExpensesByDateRange(startDate: string, endDate: string): Promise<ExpenseType[]>
- approveExpense(expenseId: string, approverId: string): Promise<ExpenseType>
```

---

## NAVIGATION UPDATES

Add to `src/data/navigation/verticalMenuData.tsx`:

```tsx
// Under 'Routes' menu item
{
  label: 'Routes',
  children: [
    {
      label: 'All Routes',
      href: '/edms/routes'
    },
    {
      label: 'Create Route',
      href: '/edms/routes/create'
    },
    {
      label: 'Rate Cards',    // NEW
      href: '/edms/routes/rate-cards'
    },
    {
      label: 'Add Rate Card', // NEW
      href: '/edms/routes/rate-cards/create'
    }
  ]
}

// Add new Return Way Bills menu
{
  label: 'Return Way Bills',
  children: [
    {
      label: 'All Returns',
      href: '/edms/returns'
    },
    {
      label: 'Pending Returns',
      href: '/edms/returns/pending'
    }
  ]
}
```

---

## NOTES FROM PDF ANALYSIS

Based on the PDF "Ezar Delivery services Add RR update-1", the rate structure appears to follow:

1. **Client-Based Pricing**: Each importer (JUMIA, etc.) has their own agreed rates
2. **Vehicle-Based Tiers**: Different rates for different vehicle types/sizes
3. **Distance-Based Tiers**: Rates vary by distance ranges
4. **Regulated Pricing**: Product owners regulate the rates, so they need to be easily editable

The implementation should allow:
- Quick lookup of applicable rate during trip creation
- Historical rate tracking (effective dates)
- Easy editing by authorized users
- Multiple rate cards per client (different vehicle/distance combinations)
