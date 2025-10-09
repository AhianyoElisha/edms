import { ID, Query } from "appwrite";
import { account, databases, tablesDB } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';
import { Customer, Logistics, Supplier, Worker } from "@/types/apps/ecommerceTypes";


export async function saveCustomerToDB(Customer: Customer) {
  try {
    const newInventoryItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.customers,
      ID.unique(),
        {
            customer: Customer.customer,
            email: Customer.email,
            country: Customer.country,
            city: Customer.city,
            town: Customer.town,
            address1: Customer.address1,
            address2: Customer.address2,
            state: Customer.state,
            GPScode: Customer.GPScode,
            contact1: Customer.contact1,
            contact2: Customer.contact2,
      }
    );
    return newInventoryItem;
  } catch (error) {
    console.log(error);
  }
}


// Save vehicle to database (Delivery Service)
export async function saveTruckOrTricycleToDB(vehicle: Logistics) {
  try {
    console.log('Creating vehicle:', vehicle)
    const newVehicle = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      ID.unique(),
        {
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          brand: vehicle.brand || null,
          model: vehicle.model || null,
          year: vehicle.year || null,
          status: vehicle.status || 'active',
          ownership: vehicle.ownership,
          monthlyRentalCost: vehicle.monthlyRentalCost || 0,
          driver: vehicle.driver || null,
          assignedRoutes: vehicle.assignedRoutes || [],
        }
    );
    return newVehicle;
  } catch (error) {
    console.error('Error creating vehicle:', error);
    throw error;
  }
}


// Update vehicle in database (Delivery Service)
export async function updateTruckOrTricycleInDB(vehicle: Logistics & { id: string}) {
  try {
    console.log('Updating vehicle:', vehicle)
    const updatedVehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicle.id,
        {
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          brand: vehicle.brand || null,
          model: vehicle.model || null,
          year: vehicle.year || null,
          status: vehicle.status,
          ownership: vehicle.ownership,
          monthlyRentalCost: vehicle.monthlyRentalCost || 0,
          driver: vehicle.driver || null,
          assignedRoutes: vehicle.assignedRoutes || [],
      }
    );
    return updatedVehicle;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
}

export async function updateCustomerInDB(Customer: Customer & { id: string}) {
  try {
    const newInventoryItem = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.customers,
      Customer.id,
        {
          customer: Customer.customer,
          email: Customer.email,
          country: Customer.country,
          city: Customer.city,
          town: Customer.town,
          address1: Customer.address1,
          address2: Customer.address2,
          state: Customer.state,
          GPScode: Customer.GPScode,
          contact1: Customer.contact1,
          contact2: Customer.contact2,
      }
    );
    return newInventoryItem;
  } catch (error) {
    console.log(error);
  }
}




export async function saveSupplierToDB(Supplier: Supplier) {
  try {
    const newInventoryItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.suppliers,
      ID.unique(),
        {
        name: Supplier.name,
        address: Supplier.address,
        contact: Supplier.contact,

      }
    );
    return newInventoryItem;
  } catch (error) {
    console.log(error);
  }
}


export async function saveWorkersToDB(Workers: Worker) {
  try {
    const newWorker = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.workers,
      ID.unique(),
        {
          name: Workers.name,
          address: Workers.address,
          contact: Workers.contact,
          workarea: Workers.workarea
      }
    );
    return newWorker;
  } catch (error) {
    console.log(error);
  }
}


export async function getCustomerList() {
  try {
    const customerList = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.customers,
      [Query.orderDesc('debt'), Query.limit(400), Query.select(['*', 'orders.*'])]
    );

    if (!customerList) throw Error;

    return customerList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}



export async function getLogisticsList() {
  try {
    const inventoryList = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      [Query.orderDesc('$createdAt'), Query.select(['*', 'driver.*', 'assignedRoutes.*'])]
    );
    if (!inventoryList) throw Error;
    return inventoryList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getVehicleById(itemId: string) {
  try {

    const vehicleList = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      itemId,
      [
        // Select all fields including relationships
        Query.select(['*', 'driver.*', 'distributedproducts.*']),
      ]
    );

    if (!vehicleList) throw Error;
    return vehicleList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getVehicleDetailById(itemId: string) {
  try {

    const vehicleList = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      itemId,
      [
        // Select all fields including relationships
        Query.select(['*', 'driver.*', 'assignedRoutes.*']),
      ]
    );

    if (!vehicleList) throw Error;
    return vehicleList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getUserList() {
  try {
    const userList = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.users,
      [Query.orderDesc('$createdAt'), Query.select(['*', 'role.*'])]
    );

    if (!userList) throw Error;

    return userList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getSupplierList() {
  try {
    const inventoryList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.suppliers,
      [Query.orderDesc('$createdAt')]
    );

    if (!inventoryList) throw Error;

    return inventoryList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getWorkersList() {
  try {
    const workersList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.workers,
      [Query.orderDesc('$createdAt')]
    );

    if (!workersList) throw Error;

    return workersList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getSupplierById(itemId: string) {
  try {
    const supplierList = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.suppliers,
      itemId
    );

    if (!supplierList) throw Error;

    return supplierList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}




export async function getWorkerById(itemId: string) {
  try {
    const workerList = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.workers,
      itemId
    );

    if (!workerList) throw Error;

    return workerList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getCustomerDetailsById(itemId: string) {
  try {
    const customerData = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.customers,
      itemId
    );

    if (!customerData) throw Error;

    return customerData;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getCustomersWithId(itemId: string) {
  try {
    const customerData = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.customers,
      [Query.equal('$id', itemId)]
    );

    if (!customerData) throw Error;

    return customerData;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}



export async function getLogisticsDetailsById(itemId: string) {
  try {
    const logisticsData = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      itemId
    );

    if (!logisticsData) throw Error;

    return logisticsData;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function updateVehicleInDB(vehicleData: {
  id: string
  vehicleType?: string
  vehicleNumber?: string
  starttown?: string
  startcity?: string
  startcountry?: string
  endtown?: string
  endcity?: string
  endcountry?: string
  status?: string
}) {
  try {
    const { id, ...updateData } = vehicleData
    
    // Remove undefined values
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    const vehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      id,
      cleanUpdateData
    );
    
    return vehicle;
  } catch (error) {
    console.error('Error updating vehicle:', error);
    throw error;
  }
}

export async function getUserById(userId: string) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId
    );

    // Get role information if roleId exists
    if (user.role) {
      try {
        const role = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.roles,
          user.role
        );
        user.role = role;
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    }

    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

export async function updateUserInDB(userId: string, userData: {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  avatar?: string;
  status?: string;
}) {
  try {
    const updatedUser = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      userId,
      userData
    );

    return updatedUser;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function getCustomerWithOrders(customerId: string) {
  try {
    // Get customer with orders using tablesDB for relationships
    const customerData = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.customers,
      customerId,
      [
        Query.select(['*', 'orders.*', 'orders.category.*'])
      ]
    );

    if (!customerData) throw new Error('Customer not found');

    return customerData;
  } catch (error) {
    console.error('Error fetching customer with orders:', error);
    throw error;
  }
}

export async function updateCustomerDebt(customerId: string, debtAmount: number) {
  try {
    const updatedCustomer = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.customers,
      customerId,
      {
        debt: debtAmount
        // Removed lastPaymentDate as it doesn't exist in your schema
      }
    );

    return updatedCustomer;
  } catch (error) {
    console.error('Error updating customer debt:', error);
    throw error;
  }
}

// Add a new function to update customer total spent
export async function updateCustomerTotalSpent(customerId: string, totalSpent: number) {
  try {
    const updatedCustomer = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.customers,
      customerId,
      {
        totalSpent: totalSpent
      }
    );

    return updatedCustomer;
  } catch (error) {
    console.error('Error updating customer total spent:', error);
    throw error;
  }
}
