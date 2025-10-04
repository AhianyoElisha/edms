export type Customer = {
  $id: string
  customer: string
  customerId?: string
  email: string
  country: string
  address1: string
  address2: string
  city: string
  state: string
  town: string
  GPScode: string
  countryCode?: string
  countryFlag?: string
  orders?: any[]
  totalSpent?: number
  avatar?: string
  status?: string
  contact1?: string
  contact2?: string
  debt?: number
}


export type Users = {
  $id: string
  role: any
  email: string
  status: string
  phone: string
  name: string
  accountId: string
  avatar?: string
  lastLoginAt?: any
  loginDevices?: any
  permissions?: any
  $createdAt: string
  $updatedAt: string
  
}


// Vehicle/Logistics Types for Delivery Service
export type Vehicle = {
  $id: string
  vehicleNumber: string
  vehicleType: 'truck' | 'van' | 'bike' | 'car' | 'tricycle'
  brand?: string
  model?: string
  year?: number
  status: 'active' | 'maintenance' | 'retired'| 'inactive'
  ownership: 'owned' | 'rented'
  monthlyRentalCost?: number
  driver?: string // Relationship to user with driver role
  assignedRoutes?: string[] // Array of route IDs - a vehicle can serve multiple routes
  creator?: string
  $createdAt?: string
  $updatedAt?: string
}

// Alias for backward compatibility
export type Logistics = Vehicle

export type LogisticsType = Vehicle & {
  driver?: Users
  assignedRoutes?: any[] // Array of routes - will be defined by route types
}

export type Supplier = {
  $id?: number
  name: string
  address: string
  contact?: string
}


export type Worker = {
  $id?: number
  name: string
  address: string
  contact?: string
  workarea: string
}


export type ReferralsType = {
  id: number
  user: string
  email: string
  avatar: string
  referredId: number
  status: string
  value: string
  earning: string
}

// export type ReviewType = {
//     category: string 
//     qtyPerBox: number
//     status: string
//     productBrand: string
//     requisitionist: string
//     description: string
//     packageQuantity: number
//     invoiceNumber: string
//     batchNumber: string,
//     images: string
//     priceOfOneItem: number
//     pricePerBox: number
//     totalPrice: number
//     $id: string
//     requisition: string
//     $createdAt: string
//     $updatedAt: string
// }

export type ProductType = {
  id: number
  productName: string
  category: string
  stock: boolean
  sku: number
  price: string
  qty: number
  status: string
  image: string
  productBrand: string
}

export type OrderType = {
  id: number
  order: string
  customer: string
  email: string
  avatar: string
  payment: number
  status: string
  spent: number
  method: string
  date: string
  time: string
  methodNumber: number
}

// export type ECommerceType = {
//   products: ProductType[]
//   orderData: OrderType[]// export type ECommerceType = {
//   products: ProductType[]
//   orderData: OrderType[]
//   customerData: Customer[]
//   reviews: ReviewType[]
//   referrals: ReferralsType[]
// }
//   customerData: Customer[]
//   reviews: ReviewType[]
//   referrals: ReferralsType[]
// }


export type InventoryDetailType = {
  vendorName: string
  invoiceNumber: string
  description?: string
  pricePerBox?: number
  partialPayment?: number
  quantityPerPackage?: number
  paymentStatus: string
  paymentMode: string
  paymentModeCash?: number
  paymentModeCheque?: number
  paymentModeBank?: number
  paymentModeImages?: File[]
  packageQuantity: number
  creator?: string
  inventoryCategory: string
  inventoryImages?: File[]
  usdRate: number
  purchaseDate?: Date
}

export type MachineryDetailType = {
  vendorName: string
  invoiceNumber: string
  description?: string
  pricePerOne?: number
  partialPayment?: number
  usdRate: number
  paymentStatus: string
  paymentMode: string
  paymentModeCash?: number
  purchaseDate?: Date
  paymentModeCheque?: number
  paymentModeBank?: number
  paymentModeImages?: File[]
  packageQuantity: number
  creator?: string
  machineryCategory: string
  machineryImages?: File[]
}

// First define the ImageType for better type safety
export type ImageType = {
  fileId: string
  fileUrl: string
}

export type CategoryType = {
  $id: string
  $createdAt?: string
  $updatedAt?: string
  categoryTitle: string
  description: string
  stockLimit: number
  totalProducts?: number
  // Images can be either File objects (for new uploads) or ImageType objects (for existing images)
  images: (File | ImageType)[]
  quantityPerPackage: number
  pricePerBox: number
  status?: string
  requisitionRequest?: number
  usdRate: number
}



export type SalesCategoryType = {
  $id: string
  $createdAt?: string
  $updatedAt?: string
  categoryTitle: string
  description: string
}

export type MachineryCategoryType = {
  $id: string
  $createdAt?: string
  $updatedAt?: string
  categoryTitle: string
  description: string
  totalProducts?: number
  // Images can be either File objects (for new uploads) or ImageType objects (for existing images)
  images: (File | ImageType)[]
  pricePerOne: number
  usdRate: number
  status?: string
}

export type ProductionCategoryType = {
  $id: string
  $createdAt?: string
  $updatedAt?: string
  title: string
  description: string
  totalProducts?: number
  images: (File | ImageType)[]
  qtyPerPackage: number
  pricePerBox: number
  status?: string
  requisitionRequest?: number
  warehouseRequisitionRequest?: number
  totalWarehouseProducts?: number
  totalSalesProducts?: number
  warehouseStatus?: string
  salesStatus?: string
}

export type RequisitionHistory = {
  $id?: string
  noOfBoxes: number
  requisitionist: any
  description: string
  requisitionType: string
  category: string
  requisitionEvent: string
  $createdAt?: string
}



export type StoreRequisition = {
  $id: string
  noOfBoxes: number
  requisitionist: User
  description: string
  requisitionType: string
  category: CategoryType
  requisitionEvent: string
  $createdAt?: string
}

export type ProductionRequisition = {
  $id: string
  noOfBoxes: number
  requisitionist: User
  description: string
  requisitionType: string
  category: ProductionCategoryType
  requisitionEvent: string
  $createdAt?: string
}

export type ProductionEstimate = {
  $id?: string
  pricePerBox: number
  packageQuantity: number
  qtyPerBox: number
  category: string
  totalPrice: number
}

export type ManufacturedItemDetailType = {
  packageQuantity: number
  qtyPerPackage: number
  pricePerBox: number
  description: string
  manufactureDate: Date
  productCategory: string
  productImages: File[]
  creator?: string
  priceOfOneItem?: number
  totalPrice?: number
  batchNumber?: string
}



export type DistributedItemDetailType = {
  packageQuantity: number
  productCategory: string
  vehicle: string
  distributionDate: Date
  totalPrice?: number
  creator?: string
  $createdAt?: string
  $id?: string
 
}


export type TransactionItemDetailType = {
  quantity: number
  category: string
  vehicle?: string
  customer?: string
  totalPrice?: number
  salesPrice?: number
  creator?: string
  paymentStatus: string
  paymentMode?: string
  cash: number
  bank: number
  momo: number
  cheque: number
  salesDate: Date
  paymentImages?: File[]
  salesCategory?: string
  chequematurity?: Date
  $createdAt?: string
  $id?: string
 
}


export type ReturnItemDetailType = {
  quantity: number
  category: string
  vehicle?: string
  returnDate: Date
  creator?: string
  $createdAt?: string
  $id?: string
 
}


export type WorkerDetailType = {
  quantity: number
  category: string
  productionDate: Date
  worker?: string
  creator?: string
  $createdAt?: string
  $id?: string
 
}

export type DamagedItemDetailType = {
  quantity: number
  category: string
  damageDate: Date
  creator?: string
  $createdAt?: string
  $id?: string
 
}

export type ExpensesDetailType = {
  expenseType: string
  paymentMode: string
  description: string
  amount: number
  vehicle?: string
  expenseDate: Date
  creator?: string
  cash: number
  bank: number
  momo: number
  cheque: number
  $createdAt?: string
  $id?: string 
}

export type DailySalesItemDetailType = {
  quantity: number
  category: string
  totalPrice?: number
  creator?: string
  vehicle?: string
  salesDate: Date
  paymentStatus: string
  paymentMode?: string
  salesCategory?: string
  cash: number
  bank: number
  momo: number
  cheque: number
  chequematurity?: Date
  $createdAt?: string
  $id?: string
 
}

export type DistributedDetail = {
  packageQuantity: number
  productCategory: string
  vehicle: Logistics
  totalPrice?: number
  creator?: string
  $createdAt?: string
  $id?: string
 
}

export type ManufacturedProductDetailsType = {
  packageQuantity: number
  qtyPerPackage: number
  pricePerBox: number
  description: string
  manufactureDate: Date
  productCategory: string
  productImages: string
  creator: string
  status?: string
  priceOfOneItem: number
  totalPrice: number
  requisition?: string
  batchNumber: string
}

export type ProductDetailsType = {
  category: string
  totalPrice: number
  pricePerBox: number
  qtyPerBox: number
  status: string
  images: string
  productBrand: string
  paymentStatus: string
  description: string
  packageQuantity: number
  partialPayment?: number
  paymentModeCash?: number
  paymentModeCheque?: number
  paymentModeBank?: number
  paymentImages?: string
  invoiceNumber: string
  creator: string
  priceOfOneItem: number
  purchaseDate?: Date
  requisition?: string
  usdRate: number
}


export type MachineryDetailsType = {
  category: string
  totalPrice: number
  status: string
  images: string
  productBrand: string
  paymentStatus: string
  description: string
  packageQuantity: number
  partialPayment?: number
  paymentModeCash?: number
  paymentModeCheque?: number
  purchaseDate?: Date
  paymentModeBank?: number
  paymentImages?: string
  invoiceNumber: string
  creator: string
  pricePerOne: number
  usdRate: number
}

export type InventoryDataParams = {
  details: InventoryDetailType[]
}

export type MachineryDataParams = {
  details: MachineryDetailType[]
}

export type ManufacturedProductDataParams = {
  details: ManufacturedItemDetailType[]
}

export type DistributedProductDataParams = {
  details: DistributedItemDetailType[]
}

export type TransactionProductDataParams = {
  details: TransactionItemDetailType[]
}

export type ReturnProductDataParams = {
  details: ReturnItemDetailType[]
}

export type WorkerDataParams = {
  details: WorkerDetailType[]
}

export type DamagedProductDataParams = {
  details: DamagedItemDetailType[]
}


export type ExpensesDataParams = {
  details: ExpensesDetailType[]
}

export type DailyProductDataParams = {
  details: DailySalesItemDetailType[]
}


export type RequisitionDetails = {
  noOfBoxes: number
  inventoryCategory: string
}

export type ProductionRequisitionDetails = {
  noOfBoxes: number
  productionCategory: string
}

export type ProductionRequisitionDataParams = {
  details: ProductionRequisitionDetails[]
}

export type RequisitionDataParams = {
  details: RequisitionDetails[]
}


export type InventoryListType = {
  category: string 
  qtyPerBox: number
  status: string
  productBrand: string
  description: string
  packageQuantity: number
  invoiceNumber: string
  requisitionist?: string
  batchNumber: string,
  images: string
  priceOfOneItem: number
  pricePerBox: number
  totalPrice: number
  $id: string
  requisition: string
  $createdAt: string
  $updatedAt: string
  paymentStatus: string
  usdRate: number
  purchaseDate?: Date
}


export type MachineryListType = {
    category: string 
    status: string
    productBrand: string
    description: string
    packageQuantity: number
    invoiceNumber: string
    images: string
    pricePerOne: number
    purchaseDate: Date
    totalPrice: number
    $id: string
    $createdAt: string
    $updatedAt: string
    paymentStatus: string    
}



export type ManufacturedProductListType = {
    category: string 
    qtyPerBox: number
    status: string
    description: string
    packageQuantity: number
    requisitionist?: string
    batchNumber: string,
    manufactureDate?: Date
    images: string
    priceOfOneItem: number
    pricePerPackage: number
    totalPrice: number
    $id: string
    requisition: string
    $createdAt: string
    $updatedAt: string
}