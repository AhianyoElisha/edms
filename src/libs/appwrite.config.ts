import { Client, Account, Databases, Storage, Avatars, TablesDB } from "appwrite";
import { Client as ServerClient, Databases as ServerDatabases, Storage as ServerStorage } from "node-appwrite";

export const appwriteConfig = {
  // Core Configuration
  api: process.env.APPWRITE_API_KEY!,
  endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  project: process.env.NEXT_PUBLIC_APPWRITE_PROJECT!,
  bucket: process.env.NEXT_PUBLIC_BUCKET_ID!,
  database: process.env.NEXT_PUBLIC_DATABASE_ID!,
  
  // User Management
  users: process.env.NEXT_PUBLIC_USERS_COLLECTION_ID!,
  roles: process.env.NEXT_PUBLIC_ROLES_COLLECTION_ID!,
  permissions: process.env.NEXT_PUBLIC_PERMISSIONS_COLLECTION_ID!,
  rolePermissions: process.env.NEXT_PUBLIC_ROLE_PERMISSIONS_COLLECTION_ID!,
  
  // EDMS - Locations
  pickuplocations: process.env.NEXT_PUBLIC_PICKUP_LOCATIONS_COLLECTION_ID!,
  dropofflocations: process.env.NEXT_PUBLIC_DROPOFF_LOCATIONS_COLLECTION_ID!,
  
  // EDMS - Fleet & Personnel
  vehicles: process.env.NEXT_PUBLIC_VEHICLES_COLLECTION_ID!,
  drivers: process.env.NEXT_PUBLIC_DRIVERS_COLLECTION_ID!,
  routes: process.env.NEXT_PUBLIC_ROUTES_COLLECTION_ID!,
  
  // EDMS - Operations
  trips: process.env.NEXT_PUBLIC_TRIPS_COLLECTION_ID!,
  manifests: process.env.NEXT_PUBLIC_MANIFESTS_COLLECTION_ID!,
  deliveries: process.env.NEXT_PUBLIC_DELIVERIES_COLLECTION_ID!,
  returnwaybills: process.env.NEXT_PUBLIC_RETURN_WAYBILLS_COLLECTION_ID!,
  
  // EDMS - Finance
  expenses: process.env.NEXT_PUBLIC_EXPENSES_COLLECTION_ID!,
  tripexenses: process.env.NEXT_PUBLIC_EXPENSES_COLLECTION_ID!, // Alias for expenses
  ratecards: process.env.NEXT_PUBLIC_RATE_CARDS_COLLECTION_ID!,
  
  // EDMS - Misc
  notifications: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  activityhistory: process.env.NEXT_PUBLIC_ACTIVITY_HISTORY_COLLECTION_ID!,
  
  // Business - Customers & Suppliers
  customers: process.env.NEXT_PUBLIC_CUSTOMERS_COLLECTION_ID!,
  suppliers: process.env.NEXT_PUBLIC_SUPPLIERS_COLLECTION_ID!,
  
  // Business - Workers
  workers: process.env.NEXT_PUBLIC_WORKERS_COLLECTION_ID!,
  workersproduction: process.env.NEXT_PUBLIC_WORKERS_PRODUCTION_COLLECTION_ID!,
  
  // Business - Products & Distribution
  distributedproducts: process.env.NEXT_PUBLIC_DISTRIBUTED_PRODUCTS_COLLECTION_ID!,
  soldproducts: process.env.NEXT_PUBLIC_SOLD_PRODUCTS_COLLECTION_ID!,
  distribution: process.env.NEXT_PUBLIC_DISTRIBUTION_COLLECTION_ID!,
  orders: process.env.NEXT_PUBLIC_ORDERS_COLLECTION_ID!,
  
  // Business - Production
  productioncategory: process.env.NEXT_PUBLIC_PRODUCTION_CATEGORY_COLLECTION_ID!,
  requisitionhistory: process.env.NEXT_PUBLIC_REQUISITION_HISTORY_COLLECTION_ID!,
  
  // Business - Inventory & Warehouse
  warehouse: process.env.NEXT_PUBLIC_WAREHOUSE_COLLECTION_ID!,
  storesrequisition: process.env.NEXT_PUBLIC_STORES_REQUISITION_COLLECTION_ID!,
  productionrequisition: process.env.NEXT_PUBLIC_PRODUCTION_REQUISITION_COLLECTION_ID!,
  warehouserequisition: process.env.NEXT_PUBLIC_WAREHOUSE_REQUISITION_COLLECTION_ID!,
  salesrequisition: process.env.NEXT_PUBLIC_SALES_REQUISITION_COLLECTION_ID!,
  
  // Business - Sales & Returns
  sales: process.env.NEXT_PUBLIC_SALES_COLLECTION_ID!,
  returns: process.env.NEXT_PUBLIC_RETURNS_COLLECTION_ID!,
  
  // Placeholder collections (using notifications for now)
  machinery: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  production: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  salesestimate: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  warehouseestimate: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  productionestimate: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  salescategory: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  inventorycategory: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  spoilage: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
  stores: process.env.NEXT_PUBLIC_NOTIFICATIONS_COLLECTION_ID!,
};

// Client-side Appwrite client (for browser operations)
export const client = new Client();

client.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!);
client.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export const tablesDB = new TablesDB(client);

// Server-side Appwrite client (for server actions with admin privileges)
const serverClient = new ServerClient()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
  .setKey(process.env.APPWRITE_API_KEY!);

export const serverDatabases = new ServerDatabases(serverClient);
export const serverStorage = new ServerStorage(serverClient);