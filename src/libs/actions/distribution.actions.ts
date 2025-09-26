import { ID, Query } from "appwrite";
import { account, databases, storage, tablesDB } from "../appwrite.config";
import { appwriteConfig } from '../appwrite.config';
import { DistributedItemDetailType, DistributedProductDataParams, TransactionItemDetailType, TransactionProductDataParams } from "@/types/apps/ecommerceTypes";
import { getProductionCategoryItemById } from "./production.actions";
import { getLogisticsDetailsById } from "./customer.action";
import { addToSalesEstimate } from "./sales.actions";
import { addRequisitionHistory } from "./stores.actions";

// Production

export async function saveDistributedItemToDB(DistributedItem: DistributedItemDetailType) {
  console.log(DistributedItem)
  try {
    const newDistributionItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.distribution,
      ID.unique(),
      DistributedItem
    );
    return newDistributionItem;
  } catch (error) {
    console.log(error);
  }
}

export async function createDistributionItem(distributedItem: DistributedItemDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // IMPORTANT: Fetch fresh data each time to get the most current totalWarehouseProducts
      const distributionCategoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        // @ts-ignore
        distributedItem.productCategory
      );

      if (!distributionCategoryList) {
        throw new Error('Distribution category not found');
      }

      const distributionVehicle = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.vehicles,
        distributedItem.vehicle
      );

      if (!distributionVehicle) {
        throw new Error('Distribution vehicle not found');
      }

      const category = distributionCategoryList;
      const currentTotalProducts = category.totalWarehouseProducts || 0;
      const currentTotalDistributedProducts = distributionVehicle.totalDistributedProducts || 0;

      // Validate quantity against current warehouse stock
      if (distributedItem.packageQuantity > currentTotalProducts) {
        throw new Error(
          `Cannot exceed available products limit for ${category.title}. ` +
          `Requested: ${distributedItem.packageQuantity}, Available: ${currentTotalProducts}`
        );
      }

      const newTotalProducts = currentTotalProducts - distributedItem.packageQuantity;
      const newDistributedProducts = currentTotalDistributedProducts + distributedItem.packageQuantity;
      const totalPrice = distributionCategoryList.pricePerBox * distributedItem.packageQuantity;

      
      // Update category with new total
      const updatedProductionCategory = await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        category.$id,
        {
          totalWarehouseProducts: newTotalProducts,
          warehouseStatus: currentTotalProducts - distributedItem.packageQuantity === 0 ? 'unavailable' : 'available',
        }
      );

      // Search for existing distributed product with same category AND vehicle
      const existingDistributedProduct = await databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.distributedproducts,
        [
          Query.equal('category', distributedItem.productCategory),
          Query.equal('vehicles', distributedItem.vehicle)
        ]
      );

      console.log(`Checking for existing distributed product - Category: ${distributedItem.productCategory}, Vehicle: ${distributedItem.vehicle}`);
      console.log(`Found ${existingDistributedProduct.documents.length} existing distributed products`);
      
      let distributedProductId: string;
      
      if (existingDistributedProduct.documents.length > 0) {
        // Update existing distributed product (same category + same vehicle)
        const currentProduct = existingDistributedProduct.documents[0];
        console.log(`Updating existing distributed product: ${currentProduct.$id}`);
        
        const updatedDistributedProduct = await databases.updateDocument(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          currentProduct.$id,
          {
            totalProducts: currentProduct.totalProducts + distributedItem.packageQuantity,
            totalPrice: currentProduct.totalPrice + totalPrice,
            status: 'available'
          }
        );
        distributedProductId = currentProduct.$id;
        console.log(`Updated existing distributed product: ${distributedProductId}`);
        
        // Verify the relationship is still intact
        const verifyProduct = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          distributedProductId
        );
        console.log(`Verification - Product ${distributedProductId} vehicle field:`, verifyProduct.vehicles);
      } else {
        // Create new distributed product (new category for this vehicle)
        console.log(`Creating new distributed product for Category: ${distributedItem.productCategory}, Vehicle: ${distributedItem.vehicle}`);
        
        const newDistributedProduct = await databases.createDocument(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          ID.unique(),
          {
            category: distributedItem.productCategory,
            vehicles: distributedItem.vehicle, // Let Appwrite handle the two-way relationship
            totalProducts: distributedItem.packageQuantity,
            totalPrice: totalPrice,
            status: 'available'
          }
        );
        distributedProductId = newDistributedProduct.$id;
        console.log(`Created new distributed product: ${distributedProductId}`);
        
        // Verify the relationship was created correctly
        const verifyProduct = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          distributedProductId
        );
        console.log(`Verification - New product ${distributedProductId} vehicle field:`, verifyProduct.vehicles);
      }
      
      // REMOVED: Manual vehicle relationship management
      // Since we have a two-way relationship, Appwrite automatically manages both sides
      // Manual updates can cause conflicts and null values
      
      console.log(`Distributed product ${distributedProductId} linked to vehicle ${distributionVehicle.$id} via two-way relationship`);
      
      if (!updatedProductionCategory) {
        throw new Error('Failed to process distribution item');
      }
      
      const newDistributedItem = await saveDistributedItemToDB({
        // @ts-ignore
        category: distributedItem.productCategory,
        creator: creator,
        // @ts-ignore
        quantity: distributedItem.packageQuantity,
        distributionDate: distributedItem.distributionDate,
        totalPrice: totalPrice,
        vehicles: distributedItem.vehicle
      });

      if (!newDistributedItem) {
        throw new Error('Failed to create distributed item');
      }
      
      const salesEstimate = await addToSalesEstimate({
        category: category.title,
        pricePerBox: category.pricePerBox,
        qtyPerBox: category.qtyPerPackage,
        packageQuantity: distributedItem.packageQuantity,
        totalPrice: category.pricePerBox! * distributedItem.packageQuantity
      })
      
      // Add to history
      await addRequisitionHistory({
        noOfBoxes: distributedItem.packageQuantity,
        requisitionist: creator,
        category: category.title,
        // @ts-ignore
        requisitionType: distributedItem.vehicle.vehicleNumber,
        requisitionEvent: 'distributed',
        description: category.description
      });

      return newDistributedItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create distribution item for ${distributedItem.productCategory} `, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}


// Helper function to get vehicle's distributed products safely
export async function getVehicleDistributedProducts(vehicleId: string) {
  try {
    const vehicle = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.vehicles,
      vehicleId
    );
    
    const distributedProductIds = vehicle.distributedproducts || [];
    
    if (distributedProductIds.length === 0) {
      return [];
    }

    // Get all distributed products for this vehicle
    const distributedProducts = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.distributedproducts,
      [
        Query.equal('vehicles', vehicleId)
      ]
    );

    return distributedProducts.documents;
  } catch (error) {
    console.error('Error getting vehicle distributed products:', error);
    return [];
  }
}

// Helper function to validate vehicle-category relationship
export async function validateVehicleCategoryDistribution(vehicleId: string, categoryId: string) {
  try {
    const existingDistribution = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.distributedproducts,
      [
        Query.equal('vehicles', vehicleId),
        Query.equal('category', categoryId)
      ]
    );

    return {
      exists: existingDistribution.documents.length > 0,
      distributedProduct: existingDistribution.documents[0] || null
    };
  } catch (error) {
    console.error('Error validating vehicle-category distribution:', error);
    return { exists: false, distributedProduct: null };
  }
}

export async function getDistributionProductList() {
  try {
    const distributionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.distribution,
      [Query.orderDesc('distributionDate'), Query.limit(300)]
    );
    
    if (!distributionList) throw Error;
    
    // Extract unique IDs for batch fetching
    const categoryIds = [...new Set(
      distributionList.documents
        .map(doc => doc.category)
        .filter(Boolean)
    )];
    
    const vehicleIds = [...new Set(
      distributionList.documents
        .map(doc => doc.vehicles)
        .filter(Boolean)
    )];
    
    // Batch fetch categories and vehicles
    const [categories, vehicles] = await Promise.all([
      categoryIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        [Query.equal('$id', categoryIds)]
      ) : { documents: [] },
      vehicleIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.vehicles,
        [Query.equal('$id', vehicleIds)]
      ) : { documents: [] }
    ]);
    
    // Create lookup maps
    const categoryMap = new Map(categories.documents.map(cat => [cat.$id, cat]));
    const vehicleMap = new Map(vehicles.documents.map(veh => [veh.$id, veh]));
    
    // Populate relationships
    const populatedDocuments = distributionList.documents.map(doc => ({
      ...doc,
      category: doc.category ? categoryMap.get(doc.category) || doc.category : doc.category,
      vehicles: doc.vehicles ? vehicleMap.get(doc.vehicles) || doc.vehicles : doc.vehicles
    }));
    
    return {
      ...distributionList,
      documents: populatedDocuments
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function createDistributionProductList(list: DistributedProductDataParams, creator: string) {
  try {
    const distributionData = list.details;
    
    // Validate input data before processing
    if (!distributionData || distributionData.length === 0) {
      throw new Error('No distribution data provided');
    }

    // Process items sequentially to ensure proper stock deduction
    // This prevents race conditions when multiple items have the same category
    const distributedProducts = [];
    const failedItems = [];
    
    for (const distributionDataItem of distributionData) {
      try {
        // Validate required fields
        if (!distributionDataItem.productCategory || !distributionDataItem.vehicle) {
          throw new Error('Missing required fields: productCategory or vehicle');
        }

        const distributedProduct = await createDistributionItem(distributionDataItem, creator);
        if (distributedProduct) {
          distributedProducts.push(distributedProduct);
          console.log(`Successfully processed distribution for category ${distributionDataItem.productCategory}`);
        } else {
          failedItems.push({
            category: distributionDataItem.productCategory,
            reason: 'Function returned null'
          });
        }
      } catch (error) {
        console.error(`Failed to process distribution item for category ${distributionDataItem.productCategory}:`, error);
        failedItems.push({
          category: distributionDataItem.productCategory,
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue processing other items even if one fails
      }
    }
    
    // Log summary
    console.log(`Distribution processing completed. Success: ${distributedProducts.length}, Failed: ${failedItems.length}`);
    if (failedItems.length > 0) {
      console.log('Failed items:', failedItems);
    }
    
    return {
      success: distributedProducts,
      failed: failedItems,
      totalProcessed: distributionData.length,
      successCount: distributedProducts.length,
      failedCount: failedItems.length
    };

  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getDistributionItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const distributionItems = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.distribution,
      itemId,
      [Query.select(['*', 'category.*', 'vehicles.*', 'creator.*'])]
    );

    if (!distributionItems) throw Error;

    return distributionItems;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function addStaffToVehicleInDB(
  staff: { staffId: string },
  logisticsId: string
): Promise<any> {
  try {

    // Update the document
    const updatedVehicle = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.users,
      staff.staffId,
      {
        vehicles: logisticsId
      }
    );

    if (!updatedVehicle) {
      throw new Error('Failed to update vehicle staff');
    }

    return updatedVehicle;

  } catch (error) {
    console.error('Error updating manufacture category:', error);
    throw error;
  }
}


export async function saveTransactionItemToDB(transactionItem: TransactionItemDetailType) {
  console.log(transactionItem)
  try {
    const newTransactionItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.orders,
      ID.unique(),
      transactionItem
    );
    return newTransactionItem;
  } catch (error) {
    console.log(error);
  }
}


export async function createTransactionItem(transactionItem: TransactionItemDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const transactionCategoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        transactionItem.category
      );

      if (!transactionCategoryList) {
        throw new Error('Transaction category not found');
      }

      const transactionVehicle = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.vehicles,
        transactionItem.vehicle!
      );

      const transactionCustomer = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.customers,
        transactionItem.customer || ''
      );

      if (!transactionVehicle) {
        throw new Error('Transaction vehicle not found');
      }

      // IMPORTANT: Fetch fresh distributed product data to get current stock levels
      const existingDistributedProduct = await databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.distributedproducts,
        [
          Query.equal('category', transactionItem.category),
          Query.equal('vehicles', transactionItem.vehicle!)
        ]
      );

      if (existingDistributedProduct.documents.length === 0) {
        throw new Error('No distributed products found for this category and vehicle');
      }

      const currentDistributedProduct = existingDistributedProduct.documents[0];
      
      // Validate quantity against current distributed stock
      if (transactionItem.quantity > currentDistributedProduct.totalProducts) {
        throw new Error(
          `Cannot exceed available products limit for ${transactionCategoryList.title}. ` +
          `Requested: ${transactionItem.quantity}, Available: ${currentDistributedProduct.totalProducts}`
        );
      }

      const totalPrice = (transactionItem.salesPrice || transactionCategoryList.salesPrice) * transactionItem.quantity;
      
      const calculatedDebt = transactionCustomer.debt + (totalPrice - (transactionItem.cash + transactionItem.cheque + transactionItem.bank))

      const newTransactionItem = await saveTransactionItemToDB({
        category: transactionItem.category,
        creator: creator,
        quantity: transactionItem.quantity,
        paymentStatus: transactionItem.paymentStatus,
        cash: transactionItem.cash,
        cheque: transactionItem.cheque,
        vehicle: transactionItem.vehicle,
        bank: transactionItem.bank,
        momo: transactionItem.momo,
        salesDate: transactionItem.salesDate,
        chequematurity: transactionItem.chequematurity,
        totalPrice: totalPrice,
        // @ts-ignore
        customers: transactionItem.customer
      });

      if (!newTransactionItem) {
        throw new Error('Failed to create transaction item');
      }

      const updatedTransactionCustomer = await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.customers,
        transactionItem.customer!,
        {
          totalSpent: transactionCustomer.totalSpent + totalPrice,
          debt: transactionItem.paymentStatus != 'paid' ? calculatedDebt : transactionCustomer.debt
        }
      )

      if (!updatedTransactionCustomer) {
        throw new Error('Failed to update customer');
      }

      let soldProductId: string;

      const existingSoldProduct = await databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.soldproducts,
        [
          Query.equal('category', transactionItem.category),
          Query.equal('vehicles', transactionItem.vehicle!)
        ]
      );

      if (existingSoldProduct.documents.length > 0) {
        console.log(existingSoldProduct)
        // Update existing sold product (same category + same vehicle)
        const currentProduct = existingSoldProduct.documents[0];
        console.log(`Updating existing sold product: ${currentProduct.$id}`);
        
        const updatedSoldProduct = await databases.updateDocument(
          appwriteConfig.database,
          appwriteConfig.soldproducts,
          currentProduct.$id,
          {
            totalProducts: currentProduct.totalProducts + transactionItem.quantity,
            totalPrice: currentProduct.totalPrice + totalPrice,
            status: 'available'
          }
        );
        soldProductId = currentProduct.$id;
        console.log(`Updated existing sold product: ${soldProductId}`);
        
        // Verify the relationship is still intact
        const verifyProduct = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.soldproducts,
          soldProductId
        );
        console.log(`Verification - Product ${soldProductId} vehicle field:`, verifyProduct.vehicles);
      } else {
        // Create new sold product (new category for this vehicle)
        console.log(`Creating new sold product for Category: ${transactionItem.category}, Vehicle: ${transactionItem.vehicle}`);
        
        const newSoldProduct = await databases.createDocument(
          appwriteConfig.database,
          appwriteConfig.soldproducts,
          ID.unique(),
          {
            category: transactionItem.category,
            vehicles: transactionItem.vehicle, // Let Appwrite handle the two-way relationship
            totalProducts: transactionItem.quantity,
            totalPrice: totalPrice,
            status: 'available'
          }
        );
        soldProductId = newSoldProduct.$id;
        console.log(`Created new sold product: ${soldProductId}`);
        
        // Verify the relationship was created correctly
        const verifyProduct = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.soldproducts,
          soldProductId
        );
        console.log(`Verification - New product ${soldProductId} vehicle field:`, verifyProduct.vehicles);
      }

      // Update distributed product with reduced stock
      const updatedDistributedProduct = await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.distributedproducts,
        currentDistributedProduct.$id,
        {
          totalProducts: currentDistributedProduct.totalProducts - transactionItem.quantity,
          totalPrice: currentDistributedProduct.totalPrice - totalPrice,
          status: currentDistributedProduct.totalProducts - transactionItem.quantity == 0 ? 'unavailable' : 'available'
        }
      );

      // REMOVED: Manual vehicle relationship management
      // Since we have a two-way relationship, Appwrite automatically manages both sides
      // Manual updates can cause conflicts and null values
      
      console.log(`Sold product ${soldProductId} linked to vehicle ${transactionVehicle.$id} via two-way relationship`);

      addRequisitionHistory({
        noOfBoxes: transactionItem.quantity,
        requisitionist: creator,
        category: transactionCategoryList.title,
        requisitionType: 'sales',
        requisitionEvent: 'sold',
        description: transactionCategoryList.description!
      });

      return newTransactionItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create transaction item for ${transactionItem.category} `, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

export async function getTransactionProductList() {
  try {
    const transactionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.orders,
      [Query.orderDesc('salesDate'), Query.limit(300)]
    );

    if (!transactionList) throw Error;

    // Extract unique IDs for optimized batch fetching
    const categoryIds = [...new Set(
      transactionList.documents
        .map(doc => doc.category)
        .filter(Boolean)
    )];
    
    const creatorIds = [...new Set(
      transactionList.documents
        .map(doc => doc.creator)
        .filter(Boolean)
    )];
    
    const customerIds = [...new Set(
      transactionList.documents
        .map(doc => doc.customers)
        .filter(Boolean)
    )];
    
    const salesCategoryIds = [...new Set(
      transactionList.documents
        .map(doc => doc.salesCategory)
        .filter(Boolean)
    )];
    
    const vehicleIds = [...new Set(
      transactionList.documents
        .map(doc => doc.vehicle)
        .filter(Boolean)
    )];

    // Optimized batch fetch all related documents in parallel
    const [categories, creators, customers, salesCategories, vehicles] = await Promise.all([
      categoryIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.productioncategory, // Update this to your actual category collection name
        [Query.equal('$id', categoryIds), Query.limit(categoryIds.length)]
      ) : { documents: [] },
      creatorIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.users, // Update this to your actual creator/user collection name
        [Query.equal('$id', creatorIds), Query.limit(creatorIds.length)]
      ) : { documents: [] },
      customerIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.customers, // Update this to your actual customers collection name
        [Query.equal('$id', customerIds), Query.limit(customerIds.length)]
      ) : { documents: [] },
      salesCategoryIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.productioncategory, // Using production category collection
        [Query.equal('$id', salesCategoryIds), Query.limit(salesCategoryIds.length)]
      ) : { documents: [] },
      vehicleIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.vehicles, // Update this to your actual vehicles collection name
        [Query.equal('$id', vehicleIds), Query.limit(vehicleIds.length)]
      ) : { documents: [] }
    ]);
    
    // Create optimized lookup maps for O(1) access
    const categoryMap = new Map(categories.documents.map(cat => [cat.$id, cat]));
    const creatorMap = new Map(creators.documents.map(creator => [creator.$id, creator]));
    const customerMap = new Map(customers.documents.map(customer => [customer.$id, customer]));
    const salesCategoryMap = new Map(salesCategories.documents.map(sc => [sc.$id, sc]));
    const vehicleMap = new Map(vehicles.documents.map(vehicle => [vehicle.$id, vehicle]));
    
    // Populate relationships with fallback values
    const processedDocuments = transactionList.documents.map(doc => ({
      ...doc,
      category: doc.category ? 
        categoryMap.get(doc.category) || { title: 'Unknown Category', $id: doc.category } : 
        { title: 'Uncategorized', $id: null },
      creator: doc.creator ? 
        creatorMap.get(doc.creator) || { name: 'Unknown Creator', avatar: 'Unknown Avatar', $id: doc.creator } : 
        { name: 'Unknown Creator', avatar: 'Unknown Avatar', $id: null },
      customers: doc.customers ? 
        customerMap.get(doc.customers) || { name: 'Unknown Customer', $id: doc.customers } : 
        null,
      salesCategory: doc.salesCategory ? 
        salesCategoryMap.get(doc.salesCategory) || { title: 'Unknown Sales Category', $id: doc.salesCategory } : 
        { title: 'Uncategorized', $id: null },
      vehicle: doc.vehicle ? 
        vehicleMap.get(doc.vehicle) || { name: 'Unknown Vehicle', $id: doc.vehicle } : 
        null
    }));

    return {
      ...transactionList,
      documents: processedDocuments
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getTransactionProductListByCustomerId(customerId: string) {
  try {
    const transactionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.orders,
      [Query.equal('customers', customerId)]
    );

    if (!transactionList) throw Error;

    return transactionList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function createTransactionProductList(list: TransactionProductDataParams, creator: string) {
  try {
    const transactionData = list.details;
    
    // Process items sequentially to ensure proper stock deduction
    // This prevents race conditions when multiple items have the same category/vehicle combination
    const transactionProducts = [];
    
    for (const transactionDataItem of transactionData) {
      try {
        const transactionProduct = await createTransactionItem(transactionDataItem, creator);
        if (transactionProduct) {
          transactionProducts.push(transactionProduct);
        }
      } catch (error) {
        console.error(`Failed to process transaction item for category ${transactionDataItem.category}:`, error);
        // Continue processing other items even if one fails
        // You might want to modify this behavior based on your requirements
      }
    }
    
    return transactionProducts;

  } catch (error) {
    console.log(error);
    throw error;
  }
}


export async function getTransactionItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const transactionItems = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.orders,
      itemId
    );

    if (!transactionItems) throw Error;

    return transactionItems
  } catch (error) {
    console.log(error);
  }
}