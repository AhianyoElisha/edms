import { DamagedItemDetailType, DamagedProductDataParams, ProductionEstimate, ProductionRequisitionDataParams, RequisitionHistory } from '@/types/apps/ecommerceTypes';
import { ID, Query } from "appwrite";
import { databases, tablesDB } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';
import { getProductionCategoryItemById } from './production.actions';

export async function addToWarehouseEstimate(requisitionItem: ProductionEstimate) {
  try {
    const requisition = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.warehouseestimate,
      ID.unique(),
      {
        packageQuantity: requisitionItem.packageQuantity,
        category: requisitionItem.category,
        pricePerBox: requisitionItem.pricePerBox,
        qtyPerBox: requisitionItem.qtyPerBox,
        totalPrice: requisitionItem.totalPrice
      }
    );
    return requisition;
  } catch (error) {
    console.log(error);
  }
}

export async function makeProductionRequisition(itemId: string, quantity: number) {
  if (!itemId || !quantity) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId
    ) 

    const updatedCategory = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId,
      {
        requisitionRequest: category.requisitionRequest + quantity,
        totalProducts: category.totalProducts - quantity,
        status: category.totalProducts - quantity == 0 ? ' unavailable' : 'available'
      }
    );

    if (!updatedCategory) throw Error;

    return updatedCategory;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function addToProductionRequisition(itemId: string, quantity: number, creator: string) {
  if (!itemId || !quantity || !creator) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId
    )

    if (!category) throw Error;

    const requisition = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.productionrequisition,
      ID.unique(),
      {
        category: itemId,
        noOfBoxes: quantity,
        requisitionist: creator,
        requisitionEvent: 'pending',
        requisitionType: 'production',
        description: `Requisition for ${category?.title}`
      }
    )

    if (!requisition) throw Error;

    return requisition;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function getWarehouseRequisitionList() {
  try {
    const requisitionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.warehouserequisition,
      [Query.equal('requisitionEvent', 'pending')]
    );

    if (!requisitionList) throw Error;

    return requisitionList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

// FIXED: Sequential processing to prevent race conditions
export async function makeProductionRequisitionList(list: ProductionRequisitionDataParams, creator: string) {
  try {
    const requisitionList = list.details;
    const results = [];
    const errors = [];

    // Process items sequentially to prevent race conditions
    for (const [index, item] of requisitionList.entries()) {
      try {
        // Fetch fresh category data for each item
        const category = await getProductionCategoryItemById(item.productionCategory);
        
        if (!category) {
          errors.push(`Production category not found for item ${index + 1}`);
          continue;
        }

        // Validate quantity with fresh data
        if (item.noOfBoxes > category.totalProducts) {
          errors.push(
            `Cannot exceed available products limit for ${category.categoryTitle}. ` +
            `Requested: ${item.noOfBoxes}, Available: ${category.totalProducts} (Item ${index + 1})`
          );
          continue;
        }

        // Process the requisition with fresh data
        const updatedCategory = await makeProductionRequisition(
          item.productionCategory,
          item.noOfBoxes
        );

        const requisitions = await addToProductionRequisition(
          item.productionCategory,
          item.noOfBoxes,
          creator
        );

        // Add to history
        await addRequisitionHistory({
          noOfBoxes: item.noOfBoxes,
          requisitionist: creator,
          category: category.title,
          requisitionType: 'production',
          requisitionEvent: 'requested',
          description: category.description
        });

        results.push(updatedCategory);
      } catch (error) {
        console.error(`Error processing item ${index + 1}:`, error);
        errors.push(`Failed to process item ${index + 1}: ${error}`);
      }
    }

    // If there were any errors, throw them
    if (errors.length > 0) {
      throw new Error(`Some items failed to process: ${errors.join('; ')}`);
    }

    return results;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

// FIXED: Sequential processing to prevent race conditions
export async function pushToWarehouseRequisitionList(list: ProductionRequisitionDataParams, creator: string) {
  try {
    const requisitionList = list.details;
    const results = [];
    const errors = [];

    // Process items sequentially to prevent race conditions
    for (const [index, item] of requisitionList.entries()) {
      try {
        // Fetch fresh category data for each item
        const category = await getProductionCategoryItemById(item.productionCategory);
        
        if (!category) {
          errors.push(`Production category not found for item ${index + 1}`);
          continue;
        }

        // Validate quantity with fresh data
        if (item.noOfBoxes > category.totalProducts) {
          errors.push(
            `Cannot exceed available products limit for ${category.categoryTitle}. ` +
            `Requested: ${item.noOfBoxes}, Available: ${category.totalProducts} (Item ${index + 1})`
          );
          continue;
        }

        // Process the requisition with fresh data
        const updatedCategory = await pushProductionToWarehouse(
          item.productionCategory,
          item.noOfBoxes,
          creator
        );

        results.push(updatedCategory);
      } catch (error) {
        console.error(`Error processing item ${index + 1}:`, error);
        errors.push(`Failed to process item ${index + 1}: ${error}`);
      }
    }

    // If there were any errors, throw them
    if (errors.length > 0) {
      throw new Error(`Some items failed to process: ${errors.join('; ')}`);
    }

    return results;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function pushProductionToWarehouse(itemId: string, quantity: number, approvedBy: string) {
  if (!itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId
    ) 

    if (category.totalProducts < quantity) throw new Error('Not enough products to push to warehouse');

    const warehouseEstimate = await addToWarehouseEstimate({
      category: category.title,
      pricePerBox: category.pricePerBox,
      qtyPerBox: category.qtyPerPackage,
      packageQuantity: quantity,
      totalPrice: category.pricePerBox! * quantity
    })

    const updatedCategory = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId,
      {
        totalProducts: category.totalProducts - quantity,
        status: category.totalProducts - quantity == 0 ? ' unavailable' : 'available',
        totalWarehouseProducts: category.totalWarehouseProducts + quantity
      }
    );

    const warehouseItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.warehouse,
      ID.unique(),
      {
        productCategory: category.$id,
        description: category.description,
        pricePerBox: category.pricePerBox,
        qtyPerPackage: category.qtyPerPackage,
        packageQuantity: quantity,
        images: category.images,
        totalPrice: category.pricePerBox! * quantity,
        status: 'Warehouse',
        creator: approvedBy,
        priceOfOneItem: category.priceOfOneItem,
      }
    )

    if (!warehouseItem) throw Error;

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: quantity,
      requisitionType: 'production',
      category: category.title,
      description: category.description,
      requisitionist: approvedBy,
      requisitionEvent: 'pushed'
    })

    return { warehouseItem, requisitionHistory, warehouseEstimate };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function approveProductionRequisition(itemId: string ,categoryId: string, approvedBy: string) {
  if (!categoryId || !approvedBy || !itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId
    )

    const updatedRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productionrequisition,
      itemId,
      {
        requisitionEvent: 'approved'
      }
    )

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.requisitionRequest,
      requisitionType: 'production',
      category: category.title,
      description: category.description,
      requisitionist: approvedBy,
      requisitionEvent: 'approved'
    })

    return { requisitionHistory};
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function issueProductionRequisition(itemId: string ,categoryId: string, approvedBy: string) {
  if (!categoryId || !approvedBy || !itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId
    ) 

    const warehouseEstimate = await addToWarehouseEstimate({
      category: category.title,
      pricePerBox: category.pricePerBox,
      qtyPerBox: category.qtyPerPackage,
      packageQuantity: category.requisitionRequest!,
      totalPrice: category.pricePerBox! * category.requisitionRequest
    })

    const requisition = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productionrequisition,
      itemId
    )

    const updatedItem = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId,
      {
        totalWarehouseProducts: category.totalWarehouseProducts + requisition.noOfBoxes,
        requisitionRequest: category.requisitionRequest! - requisition.noOfBoxes!,
        warehouseStatus: 'available'
      }
    );
    
    if (!updatedItem) throw Error;

    const updatedRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productionrequisition,
      itemId,
      {
        requisitionEvent: 'issued'
      }
    )

    console.log(updatedRequisition)

    const warehouseItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.warehouse,
      ID.unique(),
      {
        productCategory: category.$id,
        description: category.description,
        pricePerBox: category.pricePerBox,
        qtyPerPackage: category.qtyPerPackage,
        packageQuantity: category.requisitionRequest,
        images: category.images,
        totalPrice: category.pricePerBox! * category.requisitionRequest,
        status: 'Warehouse',
        creator: approvedBy,
        priceOfOneItem: category.priceOfOneItem,
      }
    )

    if (!warehouseItem) throw Error;

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.requisitionRequest,
      requisitionType: 'production',
      category: category.title,
      description: category.description,
      requisitionist: approvedBy,
      requisitionEvent: 'issued'
    })

    return { updatedItem, warehouseItem, requisitionHistory, warehouseEstimate };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function denyProductionRequisition(itemId: string, categoryId: string, deniedBy: string) {
  if (!categoryId || !deniedBy || !itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId
    )
    if (!category) throw new Error('Error denying requisition');

    const requisition = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productionrequisition,
      itemId
    )
    
    const updatedItem = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId,
      {
        totalProducts: category.totalProducts + category.requisitionRequest,
        requisitionRequest: category.requisitionRequest - requisition.noOfBoxes,
        status: 'available'
      }
    );

    if (!updatedItem) throw Error;

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.requisitionRequest,
      requisitionType: 'production',
      category: category.title,
      description: category.description,
      requisitionist: deniedBy,
      requisitionEvent: 'denied'
    })
    return {updatedItem, requisitionHistory};
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getWarehouseProductList() {
  try {
    const warehouseList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.warehouse,
      [Query.orderDesc('$createdAt'), Query.limit(500)]
    );

    if (!warehouseList) throw Error;

    return warehouseList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getWarehouseProductItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const manufacturedItems = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.warehouse,
      itemId,
      [Query.select(['*', 'productCategory.*', 'creator.*'])]
    );

    if (!manufacturedItems) throw Error;

    return manufacturedItems
  } catch (error) {
    console.log(error);
  }
}

export async function addRequisitionHistory(requisitionItem: RequisitionHistory) {
  if (!requisitionItem.requisitionist) throw new Error('No requisitionist provided');
  try {
    const requisition = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.requisitionhistory,
      ID.unique(),
      {
        noOfBoxes: requisitionItem.noOfBoxes,
        requisitionist: requisitionItem.requisitionist,
        description: requisitionItem.description,
        requisitionType: requisitionItem.requisitionType,
        category: requisitionItem.category,
        requisitionEvent: requisitionItem.requisitionEvent
      }
    );
    return requisition;
  } catch (error) {
    console.log(error);
  }
}

export async function saveDamagedProductsItemToDB(damagedProductsItem: DamagedItemDetailType) {
  try {
    const newDamagedProductsItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.spoilage,
      ID.unique(),
      damagedProductsItem
    );
    return newDamagedProductsItem;
  } catch (error) {
    console.log(error);
  }
}

export async function createDamagedProductsItem(damagedProductsItem: DamagedItemDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const existingWarehouseProduct = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        damagedProductsItem.category
      );
      
      const updatedWarehouseProduct = await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        existingWarehouseProduct.$id,
        {
          totalWarehouseProducts: existingWarehouseProduct.totalWarehouseProducts - damagedProductsItem.quantity,
        }
      );

      if (!updatedWarehouseProduct) throw Error;

      const newDamagedProductsItem = await saveDamagedProductsItemToDB({
        category: damagedProductsItem.category,
        creator: creator,
        quantity: damagedProductsItem.quantity,
        damageDate: damagedProductsItem.damageDate
      });

      return newDamagedProductsItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create goods returned item for ${damagedProductsItem.category} `, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

// FIXED: Sequential processing to prevent race conditions
export async function createDamagedProductList(list: DamagedProductDataParams, creator: string) {
  try {
    const damagedProductsData = list.details;
    const results = [];
    const errors = [];

    // Process items sequentially to prevent race conditions
    for (const [index, damagedDataItem] of damagedProductsData.entries()) {
      try {
        const result = await createDamagedProductsItem(damagedDataItem, creator);
        if (result) {
          results.push(result);
        } else {
          errors.push(`Failed to process damaged product item ${index + 1}`);
        }
      } catch (error) {
        console.error(`Error processing damaged product item ${index + 1}:`, error);
        errors.push(`Failed to process damaged product item ${index + 1}: ${error}`);
      }
    }

    // Log errors but don't throw - some items might have succeeded
    if (errors.length > 0) {
      console.warn(`Some damaged product items failed to process: ${errors.join('; ')}`);
    }

    return results;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getDamagedProductList() {
  try {
    const spoilageList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.spoilage,
      [Query.orderDesc('damageDate'), Query.limit(300)]
    );

    if (!spoilageList) throw Error;

    // Extract unique IDs for optimized batch fetching
    const categoryIds = [...new Set(
      spoilageList.documents
        .map(doc => doc.category)
        .filter(Boolean)
    )];
    
    const creatorIds = [...new Set(
      spoilageList.documents
        .map(doc => doc.creator)
        .filter(Boolean)
    )];

    // Optimized batch fetch all related documents in parallel
    const [categories, creators] = await Promise.all([
      categoryIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.productioncategory, // Update this to your actual category collection name
        [Query.equal('$id', categoryIds), Query.limit(categoryIds.length)]
      ) : { documents: [] },
      creatorIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.users, // Update this to your actual creator/user collection name
        [Query.equal('$id', creatorIds), Query.limit(creatorIds.length)]
      ) : { documents: [] }
    ]);
    
    // Create optimized lookup maps for O(1) access
    const categoryMap = new Map(categories.documents.map(cat => [cat.$id, cat]));
    const creatorMap = new Map(creators.documents.map(creator => [creator.$id, creator]));
    
    // Populate relationships with fallback values
    const processedDocuments = spoilageList.documents.map(doc => ({
      ...doc,
      category: doc.category ? 
        categoryMap.get(doc.category) || { title: 'Unknown Category', $id: doc.category } : 
        { title: 'Uncategorized', $id: null },
      creator: doc.creator ? 
        creatorMap.get(doc.creator) || { name: 'Unknown Creator', avatar: 'Unknown Avatar', $id: doc.creator } : 
        { name: 'Unknown Creator', avatar: 'Unknown Avatar', $id: null }
    }));

    return {
      ...spoilageList,
      documents: processedDocuments
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getReturnedProductList() {
  try {
    // Step 1: Fetch the main documents
    const returnProductsList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.returns,
      [Query.orderDesc('returnDate'), Query.limit(300)]
    );

    if (!returnProductsList || !returnProductsList.documents) {
      throw new Error('No returns data found');
    }

    // Step 2: Extract unique IDs for batch fetching
    const categoryIds = [...new Set(
      returnProductsList.documents
        .map(doc => doc.category)
        .filter(id => id) // Remove null/undefined
    )];
    
    const vehicleIds = [...new Set(
      returnProductsList.documents
        .map(doc => doc.vehicle)
        .filter(id => id)
    )];
    
    const creatorIds = [...new Set(
      returnProductsList.documents
        .map(doc => doc.creator)
        .filter(id => id)
    )];

    // Step 3: Fetch all relationships in parallel batches
    const [categories, vehicles, creators] = await Promise.all([
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.productioncategory, categoryIds),
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.vehicles, vehicleIds),
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.users, creatorIds) // assuming creators are from users collection
    ]);

    // Step 4: Create lookup maps for O(1) access
    const categoryMap = new Map(categories.map(cat => [cat.$id, cat]));
    const vehicleMap = new Map(vehicles.map(vehicle => [vehicle.$id, vehicle]));
    const creatorMap = new Map(creators.map(creator => [creator.$id, creator]));

    // Step 5: Populate relationships in the original documents
    const enrichedDocuments = returnProductsList.documents.map(doc => ({
      ...doc,
      category: categoryMap.get(doc.category) || doc.category,
      vehicle: vehicleMap.get(doc.vehicle) || doc.vehicle,
      creator: creatorMap.get(doc.creator) || doc.creator
    }));

    return {
      ...returnProductsList,
      documents: enrichedDocuments
    };

  } catch (error) {
    console.log('Error fetching returned products list:', error);
    return undefined;
  }
}


async function fetchDocumentsBatch(databaseId: any, collectionId: any, ids: any) {
  if (!ids || ids.length === 0) return [];
  
  try {
    // Split into batches of 25 (Appwrite's Query.in() limit is typically 100, but 25 is safer)
    const batchSize = 25;
    const batches = [];
    
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize);
      batches.push(
        databases.listDocuments(databaseId, collectionId, [
          Query.equal('$id', batchIds),
          Query.limit(batchSize)
        ])
      );
    }
    
    // Execute all batches in parallel
    const batchResults = await Promise.all(batches);
    
    // Combine all results
    return batchResults.flatMap(result => result.documents || []);
    
  } catch (error) {
    console.log(`Error fetching batch from ${collectionId}:`, error);
    return [];
  }
}


export async function getReturnedProductItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const returnItems = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.returns,
      itemId,
      [Query.select(['*', 'category.*', 'vehicle.*', 'creator.*'])]
    );

    if (!returnItems) throw Error;

    return returnItems
  } catch (error) {
    console.log(error);
  }
}

export async function getExpensesList() {
  try {
    // Step 1: Fetch the main documents
    const expensesList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      [Query.orderDesc('expenseDate'), Query.limit(300)]
    );

    if (!expensesList || !expensesList.documents) {
      throw new Error('No expenses data found');
    }

    // Step 2: Extract unique IDs for batch fetching
    const vehicleIds = [...new Set(
      expensesList.documents
        .map(doc => doc.vehicle)
        .filter(id => id) // Remove null/undefined
    )];
    
    const creatorIds = [...new Set(
      expensesList.documents
        .map(doc => doc.creator)
        .filter(id => id)
    )];

    // Step 3: Fetch all relationships in parallel batches
    const [vehicles, creators] = await Promise.all([
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.vehicles, vehicleIds),
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.users, creatorIds) // assuming creators are from users collection
    ]);

    // Step 4: Create lookup maps for O(1) access
    const vehicleMap = new Map(vehicles.map(vehicle => [vehicle.$id, vehicle]));
    const creatorMap = new Map(creators.map(creator => [creator.$id, creator]));

    // Step 5: Populate relationships in the original documents
    const enrichedDocuments = expensesList.documents.map(doc => ({
      ...doc,
      vehicle: vehicleMap.get(doc.vehicle) || doc.vehicle,
      creator: creatorMap.get(doc.creator) || doc.creator
    }));

    return {
      ...expensesList,
      documents: enrichedDocuments
    };

  } catch (error) {
    console.log('Error fetching expenses list:', error);
    return undefined;
  }
}

export async function getExpensesItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const expensesItem = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.expenses,
      itemId,
      [Query.select(['*', 'vehicle.*', 'creator.*'])]
    );

    if (!expensesItem) throw Error;

    return expensesItem
  } catch (error) {
    console.log(error);
  }
}

export async function getSalesItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const salesItem = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.orders,
      itemId,
      [
        Query.select(['*', 'category.*', 'creator.*', 'customers.*', 'vehicle.*', 'salesCategory.*'])
      ]
    );

    if (!salesItem) throw Error;

    return salesItem;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}