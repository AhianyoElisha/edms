import { CategoryType, ProductionEstimate, RequisitionHistory, ImageType, RequisitionDataParams, StoreRequisition } from '@/types/apps/ecommerceTypes';
import { ID, Query } from "appwrite";
import { databases, storage, tablesDB } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';
import { InventoryDataParams, InventoryDetailType,  ManufacturedProductDetailsType, ProductDetailsType } from "@/types/apps/ecommerceTypes";



export async function createInventoryItem(inventoryItem: InventoryDetailType, creator: string, maxRetries = 1) {
if(!creator) throw new Error('creator must be provided')
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const inventoryImageCollection = inventoryItem.inventoryImages ?? []
    const paymentImageCollection = inventoryItem.paymentModeImages ?? []
    try {
      // First, fetch the category document to get current totalProducts
      const categoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.inventorycategory,
        inventoryItem.inventoryCategory);

      if (!categoryList) {
        throw new Error('Category not found');
      }
      
      const category = categoryList;
      const currentTotalProducts = category.totalProducts || 0;
      const newTotalProducts = currentTotalProducts + inventoryItem.packageQuantity;
  

      // Upload images
      const uploadedImages = await Promise.all(inventoryImageCollection.map(async (file) => {
        const uploadedFile = await storage.createFile(
          appwriteConfig.bucket,
          ID.unique(),
          file
        );
        return {
          fileId: uploadedFile.$id,
          fileUrl: `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucket}/files/${uploadedFile.$id}/view?project=${appwriteConfig.project}`
        };
      }));

      const uploadedPaymentImages = await Promise.all(paymentImageCollection.map(async (file) => {
        const uploadedFile = await storage.createFile(
          appwriteConfig.bucket,
          ID.unique(),
          file
        );
        return {
          fileId: uploadedFile.$id,
          fileUrl: `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucket}/files/${uploadedFile.$id}/view?project=${appwriteConfig.project}`
        };
      }));

      // Update category with new total
      const updatedCategory = await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.inventorycategory,
        category.$id, // Use the actual document ID
        {
          totalProducts: newTotalProducts,
          status: 'available',
        }
      );

      // Create new inventory item
      const newInventoryItem = await saveInventoryItemToDB({
        category: inventoryItem.inventoryCategory,
        totalPrice: inventoryItem.pricePerBox! * inventoryItem.packageQuantity,
        pricePerBox: inventoryItem.pricePerBox!,
        qtyPerBox: inventoryItem.quantityPerPackage!,
        usdRate: inventoryItem.usdRate!,
        purchaseDate: inventoryItem.purchaseDate,
        status: 'Stores',
        images: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : category.images,
        paymentImages: JSON.stringify(uploadedPaymentImages),
        productBrand: inventoryItem.vendorName,
        paymentStatus: inventoryItem.paymentStatus ,
        paymentModeCash: inventoryItem.paymentModeCash,
        paymentModeCheque: inventoryItem.paymentModeCheque,
        paymentModeBank: inventoryItem.paymentModeBank,
        description: inventoryItem.description!,
        invoiceNumber: inventoryItem.invoiceNumber,
        creator: creator,
        packageQuantity: inventoryItem.packageQuantity,
        priceOfOneItem: inventoryItem.pricePerBox! / inventoryItem.quantityPerPackage!,
        requisition: 'available'
      });

      return newInventoryItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create inventory item for ${inventoryItem.vendorName} after ${maxRetries} attempts:`, error);
        return error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
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


export async function addToProductionEstimate(requisitionItem: ProductionEstimate) {
  try {
    const requisition = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.productionestimate,
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



export async function makeStoreRequisition(itemId: string, quantity: number) {
  if (!itemId || !quantity) throw new Error('Invalid itemId or quantity');

  try {
    // Fetch fresh category data each time
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      itemId
    );

    // Validate with current data
    if (quantity > category.totalProducts) {
      throw new Error(
        `Cannot exceed available products limit for ${category.categoryTitle}. ` +
        `Requested: ${quantity}, Available: ${category.totalProducts}`
      );
    }

    const updatedCategory = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      itemId,
      {
        requisitionRequest: category.requisitionRequest + quantity,
        totalProducts: category.totalProducts - quantity,
        status: category.totalProducts - quantity === 0 ? 'unavailable' : 'available'
      }
    );

    if (!updatedCategory) throw new Error('Failed to update category');

    return updatedCategory;
  } catch (error) {
    console.log(error);
    throw error; // Re-throw to handle it in the calling function
  }
}

export async function addToRequisition(itemId: string, quantity: number, creator: string) {
  if (!itemId || !quantity || !creator) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      itemId
    )

    if (!category) throw Error;

    const requisition = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      ID.unique(),
      {
        category: itemId,
        noOfBoxes: quantity,
        requisitionist: creator,
        requisitionEvent: 'pending',
        requisitionType: 'stores',
        description: `Requisition for ${category?.categoryTitle}`
      }
    )

    if (!requisition) throw Error;

    return requisition;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function makeStoreRequisitionList(list: RequisitionDataParams, creator: string) {
  try {
    const requisitionList = list.details;
    const results = [];
    
    // Process items sequentially to prevent race conditions
    for (const item of requisitionList) {
      try {
        // Make the requisition (this will fetch fresh data and validate)
        const updatedCategory = await makeStoreRequisition(
          item.inventoryCategory,
          item.noOfBoxes
        );

        const requisitions = await addToRequisition(
          item.inventoryCategory,
          item.noOfBoxes,
          creator
        );

        // Fetch category for history (fresh data)
        const category = await getInventoryCategoryById(item.inventoryCategory);
        if (!category) {
          throw new Error(`Category not found: ${item.inventoryCategory}`);
        }

        // Add to history
        await addRequisitionHistory({
          noOfBoxes: item.noOfBoxes,
          requisitionist: creator,
          category: category.categoryTitle,
          requisitionType: 'stores',
          requisitionEvent: 'requested',
          description: category.description
        });

        results.push(updatedCategory);
      } catch (error) {
        console.error(`Failed to process requisition for category ${item.inventoryCategory}:`, error);
        // Depending on your requirements, you might want to:
        // 1. Continue processing other items (current behavior)
        // 2. Or throw the error to stop all processing
        throw error;
      }
    }

    return results;
  } catch (error) {
    console.log(error);
    throw error;
  }
}


export async function approveStoreRequisition(itemId: string ,categoryId: string, approvedBy: string) {
  if (!categoryId || !approvedBy || !itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      categoryId
    ) 

    const updatedRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      itemId,
      {
        requisitionEvent: 'approved'
      }
    )

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.requisitionRequest,
      requisitionType: 'stores',
      category: category.categoryTitle,
      description: category.description,
      requisitionist: approvedBy,
      requisitionEvent: 'approved'
    })


    return { requisitionHistory, updatedRequisition };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function issueStoreRequisition(itemId: string ,categoryId: string, issuedBy: string) {
  if (!categoryId || !issuedBy || !itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      categoryId
    ) 

    const requisition = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      itemId
    )

    const productionEstimate = await addToProductionEstimate({
      category: category.categoryTitle,
      pricePerBox: category.pricePerBox,
      qtyPerBox: category.qtyPerBox,
      packageQuantity: requisition.noOfBoxes!,
      totalPrice: category.pricePerBox! * requisition.noOfBoxes
    })


    const updatedItem = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      categoryId,
      {
        requisitionRequest: category.requisitionRequest - requisition.noOfBoxes,
      }
    );

    const updatedRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      itemId,
      {
        requisitionEvent: 'issued'
      }
    )

    if (!updatedItem) throw Error;
    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.requisitionRequest,
      requisitionType: 'stores',
      category: category.categoryTitle,
      description: category.description,
      requisitionist: issuedBy,
      requisitionEvent: 'issued'
    })


    return { updatedItem, requisitionHistory, productionEstimate, updatedRequisition };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function denyStoreRequisition(itemId: string ,categoryId: string, deniedBy: string) {
  if (!categoryId || !deniedBy || !itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      categoryId
    )
    if (!category) throw new Error('Error denying requisition');

    const requisition = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      itemId
    )
    
    const updatedItem = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      categoryId,
      {
        totalProducts: category.totalProducts + requisition.noOfBoxes,
        requisitionRequest: category.requisitionRequest - requisition.noOfBoxes,
        status: 'available'
      }
    );

    if (!updatedItem) throw Error;

    const updatedRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      itemId,
      {
        requisitionEvent: 'rejected'
      }
    )

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.requisitionRequest,
      requisitionType: 'stores',
      category: category.categoryTitle,
      description: category.description,
      requisitionist: deniedBy,
      requisitionEvent: 'denied'
    })
    return {updatedItem, requisitionHistory, updatedRequisition};
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function saveInventoryItemToDB(InventoryItem: ProductDetailsType) {
  try {
    const newInventoryItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.stores,
      ID.unique(),
      InventoryItem
    );
    return newInventoryItem;
  } catch (error) {
    console.log(error);
  }
}


export async function saveInventoryCategoryToDB(InventoryCategory: CategoryType, creator: string) {
    const inventoryImageCollection = InventoryCategory.images ?? []
    try {
      const uploadedImages = await Promise.all(inventoryImageCollection.map(async (file) => {
        const uploadedFile = await storage.createFile(
          appwriteConfig.bucket,
          ID.unique(),
          file as File
        );
        return {
          fileId: uploadedFile.$id,
          fileUrl: `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucket}/files/${uploadedFile.$id}/view?project=${appwriteConfig.project}`
        };
      }));
    const newInventoryCategory = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      ID.unique(),
      {
        categoryTitle: InventoryCategory.categoryTitle,
        description: InventoryCategory.description,
        stockLimit: InventoryCategory.stockLimit,
        images: JSON.stringify(uploadedImages),
        qtyPerBox: InventoryCategory.quantityPerPackage,
        creator: creator,
        pricePerBox: InventoryCategory.pricePerBox * InventoryCategory.usdRate,
        priceOfOneItem: InventoryCategory.pricePerBox / InventoryCategory.quantityPerPackage,
        usdRate: InventoryCategory.usdRate
      }
    );

    addRequisitionHistory({
      noOfBoxes: 0,
      requisitionist: creator,
      category: InventoryCategory.categoryTitle,
      requisitionType: 'inventory category',
      requisitionEvent: 'added',
      description: InventoryCategory.description!
    });
      
    return newInventoryCategory;
  } catch (error) {
    console.log(error);
  }
}

export async function updateInventoryCategoryInDB(
  inventoryCategory: CategoryType & { id: string }
): Promise<any> {
  try {
    let processedImages: ImageType[] = [];
    
    if (inventoryCategory.images && inventoryCategory.images.length > 0) {
      // Explicitly type-guard to separate Files from ImageType objects
      const newImages = inventoryCategory.images.filter((img): img is File => img instanceof File);
      const existingImages = inventoryCategory.images.filter((img): img is ImageType => 
        'fileId' in img && 'fileUrl' in img
      );

      // Upload new images
      const uploadedImages: ImageType[] = await Promise.all(
        newImages.map(async (file) => {
          const uploadedFile = await storage.createFile(
            appwriteConfig.bucket,
            ID.unique(),
            file
          );

          return {
            fileId: uploadedFile.$id,
            fileUrl: `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucket}/files/${uploadedFile.$id}/view?project=${appwriteConfig.project}`
          };
        })
      );

      // Combine existing and new images
      processedImages = [
        ...existingImages,
        ...uploadedImages
      ];
    }

    // Calculate price of one item
    const priceOfOneItem = inventoryCategory.pricePerBox / inventoryCategory.quantityPerPackage;

    // Update the document
    const updatedInventoryCategory = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      inventoryCategory.id,
      {
        categoryTitle: inventoryCategory.categoryTitle,
        description: inventoryCategory.description,
        stockLimit: inventoryCategory.stockLimit,
        images: JSON.stringify(processedImages),
        qtyPerBox: inventoryCategory.quantityPerPackage,
        pricePerBox: inventoryCategory.pricePerBox,
        priceOfOneItem: priceOfOneItem,
        status: 'available'
      }
    );

    if (!updatedInventoryCategory) {
      throw new Error('Failed to update inventory category');
    }

    return updatedInventoryCategory;

  } catch (error) {
    console.error('Error updating inventory category:', error);
    throw error;
  }
}

// Helper function to delete old images if needed
export async function deleteInventoryImage(fileId: string) {
  try {
    await storage.deleteFile(
      appwriteConfig.bucket,
      fileId
    )
    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    throw error
  }
}



export async function createInventoryList(list: InventoryDataParams, creator: string) {
  try {
    const inventoryData = list.details;
    const results = [];
    
    // Process items sequentially to prevent race conditions
    for (const item of inventoryData) {
      try {
        // Fetch fresh category data for validation
        const category = await getInventoryCategoryById(item.inventoryCategory);
        if (!category) {
          throw new Error(`Category not found: ${item.inventoryCategory}`);
        }

        // Validate payment amounts
        const totalPayment = (item.paymentModeCash || 0) + 
                           (item.paymentModeCheque || 0) + 
                           (item.paymentModeBank || 0);
        const expectedPayment = category.pricePerBox * item.packageQuantity;
        
        if (item.paymentStatus === 'paid' && (totalPayment < (expectedPayment - 0.1))) {
          throw new Error(
            `You did not make full payment for ${category.categoryTitle}. ` +
            `Check payment status (${expectedPayment} != ${totalPayment})`
          );
        }

        if (totalPayment > (expectedPayment + 0.1)) {
          throw new Error(
            `You overpaid for ${category.categoryTitle}. ` +
            `Let the numbers tally (${expectedPayment} != ${totalPayment})`
          );
        }

        // Create inventory item (this will update the category's totalProducts)
        const result = await createInventoryItem(item, creator);
        
        // Add to requisition history
        await addRequisitionHistory({
          noOfBoxes: item.packageQuantity,
          requisitionist: creator,
          category: category.categoryTitle,
          requisitionType: 'stores console',
          requisitionEvent: 'added',
          description: item.description!
        });

        results.push(result);
      } catch (error) {
        console.error(`Failed to process inventory item for category ${item.inventoryCategory}:`, error);
        // Depending on your requirements, you might want to:
        // 1. Continue processing other items (current behavior)
        // 2. Or throw the error to stop all processing
        throw error;
      }
    }

    return results;
  } catch (error) {
    console.log(error);
    throw error;
  }
}



export async function getInventoryList() {
  try {
    const inventoryList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.stores,
      [Query.orderDesc('purchaseDate'), Query.limit(400)]
    );

    if (!inventoryList) throw Error;

    return inventoryList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}




export async function getStoreRequisitionList() {
  try {
    const requisitionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      [Query.equal('requisitionEvent', 'pending'), Query.limit(300)]
    );
    
    if (!requisitionList) throw Error;
    
    // Extract unique IDs for batch fetching
    const categoryIds = [...new Set(
      requisitionList.documents
        .map(doc => doc.category)
        .filter(Boolean)
    )];
    

    // Batch fetch categories
    const [categories] = await Promise.all([
      categoryIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.inventorycategory  ,
        [Query.equal('$id', categoryIds)]
      ) : { documents: [] },
    ]);
    
    // Create lookup maps
    const categoryMap = new Map(categories.documents.map(cat => [cat.$id, cat]));
    
    // Populate relationships
    const populatedDocuments = requisitionList.documents.map(doc => ({
      ...doc,
      category: doc.category ? categoryMap.get(doc.category) || doc.category : doc.category,
    }));
    
    return {
      ...requisitionList,
      documents: populatedDocuments
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function updateStoreRequisitionInDB(
  storesRequisition: StoreRequisition & { id: string }
): Promise<any> {
  try {
    const requisition = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      storesRequisition.id
    )
    const categoryId = requisition.category?.$id
    
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      categoryId
    )

    if (!category) throw Error('Category not found');

    if (storesRequisition.noOfBoxes > requisition.noOfBoxes) throw Error('No of boxes cannot be increased');

    // Update the document
    const updatedStoresRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      storesRequisition.id,
      {
        noOfBoxes: storesRequisition.noOfBoxes,
      }
    );

    const categoryUpdated = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      categoryId,
      {
        requisitionRequest: category.requisitionRequest - (requisition.noOfBoxes - storesRequisition.noOfBoxes),
      }
    )

    if (!updatedStoresRequisition) {
      throw new Error('Failed to update stores requisition');
    }

    return updatedStoresRequisition;

  } catch (error) {
    console.error('Error updating stores requisition:', error);
    throw error;
  }
}


export async function getIssuedStoreRequisitionList() {
  try {
    const requisitionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.storesrequisition,
      [Query.equal('requisitionEvent', 'approved'), Query.limit(300)]
    );
    
    if (!requisitionList) throw Error;
    
    // Extract unique IDs for batch fetching
    const categoryIds = [...new Set(
      requisitionList.documents
        .map(doc => doc.category)
        .filter(Boolean)
    )];
    

    // Batch fetch categories
    const [categories] = await Promise.all([
      categoryIds.length > 0 ? databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.inventorycategory  ,
        [Query.equal('$id', categoryIds)]
      ) : { documents: [] },
    ]);
    
    // Create lookup maps
    const categoryMap = new Map(categories.documents.map(cat => [cat.$id, cat]));
    
    // Populate relationships
    const populatedDocuments = requisitionList.documents.map(doc => ({
      ...doc,
      category: doc.category ? categoryMap.get(doc.category) || doc.category : doc.category,
    }));
    
    return {
      ...requisitionList,
      documents: populatedDocuments
    };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getConsoleEstimatesList(month: any) {
  try {
    // Get the target month - use provided month or current month
    const targetDate = month ? new Date(month) : new Date();
    const year = targetDate.getFullYear();
    const monthIndex = targetDate.getMonth();
    
    // Calculate start and end of the month
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    
    // Convert to ISO strings for Appwrite queries
    const startISO = startOfMonth.toISOString();
    const endISO = endOfMonth.toISOString();
    
    // Create date range queries for the month
    const monthQueries = [
      Query.greaterThanEqual('$createdAt', startISO),
      Query.lessThanEqual('$createdAt', endISO),
      Query.orderDesc('$createdAt'),
      Query.limit(500) // Keep limit as safeguard
    ];
    
    // Fetch all collections concurrently for better performance
    const [
      inventoryEstimateList,
      storesRequisitionList,
      machineryEstimateList,
      productionEstimateList,
      warehouseEstimateList,
      salesEstimateList
    ] = await Promise.all([
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.stores,
        // monthQueries
      ),
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.storesrequisition,
        monthQueries
      ),
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.machinery,
      ),
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.production,
        [
          Query.greaterThanEqual('manufactureDate', startISO),
          Query.lessThanEqual('manufactureDate', endISO),
          Query.orderDesc('manufactureDate'),
          Query.limit(500) // Keep limit as safeguard
        ]
      ),
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.warehouseestimate,
        monthQueries
      ),
      databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.salesestimate,
        [
          Query.greaterThanEqual('$createdAt', startISO),
          Query.lessThanEqual('$createdAt', endISO),
          Query.orderDesc('$createdAt'),
          Query.limit(500) // Keep limit as safeguard
        ]
      )
    ]);

    // Validate all responses
    if (!inventoryEstimateList || !machineryEstimateList || !productionEstimateList || 
        !warehouseEstimateList || !salesEstimateList) {
      throw new Error('Failed to fetch one or more estimate collections');
    }

    // Calculate totals and packages efficiently
    const calculateTotals = (documents: any) => ({
      total: documents.reduce((sum: any, item: any) => sum + (item.totalPrice || 0), 0),
      packages: documents.reduce((sum: any, item: any) => sum + (item.packageQuantity || 0), 0)
    });
    const calculateStoreRequisitionTotals = (documents: any) => {
      const issuedDocuments = documents.filter((item: any) => item.requisitionEvent === 'issued');
      return {
        total: issuedDocuments.reduce((sum: any, item: any) => sum + (item.category.pricePerBox * item.noOfBoxes || 0), 0),
        packages: issuedDocuments.reduce((sum: any, item: any) => sum + (item.noOfBoxes || 0), 0)
      };
    };

    const storeData = calculateTotals(inventoryEstimateList.documents);
    const storeRequisitionData = calculateStoreRequisitionTotals(storesRequisitionList.documents);
    const machineryData = calculateTotals(machineryEstimateList.documents);
    const productionData = calculateTotals(productionEstimateList.documents);
    const warehouseData = calculateTotals(warehouseEstimateList.documents);
    const salesData = calculateTotals(salesEstimateList.documents);

    return {
      storeTotal: storeData.total,
      storePackages: storeData.packages,
      storeRequisitionTotal: storeRequisitionData.total,
      storeRequisitionPackages: storeRequisitionData.packages,
      productionTotal: productionData.total,
      productionPackages: productionData.packages,
      warehouseTotal: warehouseData.total,
      warehousePackages: warehouseData.packages,
      salesTotal: salesData.total,
      salesPackages: salesData.packages,
      machineryTotal: machineryData.total,
      machineryPackages: machineryData.packages,
      // Additional metadata
      month: targetDate.toISOString().slice(0, 7), // YYYY-MM format
      totalRecords: inventoryEstimateList.documents.length + 
      machineryEstimateList.documents.length + 
      productionEstimateList.documents.length + 
      warehouseEstimateList.documents.length + 
      salesEstimateList.documents.length
    };
  } catch (error) {
    console.error('Error fetching console estimates:', error);
    return undefined;
  }
}

export async function getInventoryCategoryItemById(itemId: string) {
  try {
    const inventoryList = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      itemId
    );

    if (!inventoryList) throw Error;

    return inventoryList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

// export async function getInventoryCategoryList(requisition: boolean, consoleEstimate: boolean) {
//   try {
//     let requisitionList = null
//     let consoleEstimateList = null
//     const inventoryList = await databases.listDocuments(
//       appwriteConfig.database,
//       appwriteConfig.inventorycategory,
//       [Query.orderDesc('$createdAt'), Query.limit(100)]
//     );

//     if (!inventoryList) throw Error;

//     if (requisition) requisitionList = await getRequisitionHistoryWithUsers() 

//     if (consoleEstimate) consoleEstimateList = await getConsoleEstimatesList('')

//     return { inventoryList, requisitionList, consoleEstimateList };
//   } catch (error) {
//     console.log(error);
//     return undefined;
//   }
// }





// export async function getRequisitionHistoryList(limit = 300) {
//   try {
//     const historyList = await tablesDB.listRows(
//       appwriteConfig.database,
//       appwriteConfig.requisitionhistory,
//       [
//         Query.orderDesc('$createdAt'), 
//         Query.limit(limit), 
//         // Try different approaches for selecting nested data
//         Query.select(['*', 'requisitionist.*', 'requisitionist.role.*'])
//       ]
//     );

//     if (!historyList) throw Error;

//     // Debug: Log the structure to see what we're getting
//     console.log('Requisition History Sample:', JSON.stringify(historyList.rows?.[0], null, 2));
//     console.log('Requisitionist data:', historyList.rows?.[0]?.requisitionist);
    
//     // If the nested selection isn't working, try fetching roles separately
//     if (historyList.rows && historyList.rows.length > 0) {
//       const userIds = [...new Set(
//         historyList.rows
//           .map((row: any) => row.requisitionist?.$id || row.requisitionist)
//           .filter(Boolean)
//       )];

//       // Fetch user details with roles separately if needed
//       if (userIds.length > 0 && typeof historyList.rows[0].requisitionist === 'string') {
//         console.log('Fetching user details separately for IDs:', userIds);
        
//         const users = await tablesDB.listRows(
//           appwriteConfig.database,
//           appwriteConfig.users,
//           [
//             Query.equal('$id', userIds),
//             Query.select(['*', 'role.*'])
//           ]
//         );

//         // Create a lookup map
//         const userMap = new Map();
//         users.rows?.forEach((user: any) => {
//           userMap.set(user.$id, user);
//         });

//         // Populate the requisitionist data
//         historyList.rows = historyList.rows.map((row: any) => ({
//           ...row,
//           requisitionist: userMap.get(row.requisitionist) || row.requisitionist
//         }));
//       }
//     }

//     return historyList;

//   } catch (error) {
//     console.log('Error in getRequisitionHistoryList:', error);
//     return undefined;
//   }
// }


export async function getRequisitionHistoryWithUsers(limit = 300) {
  try {
    // First, get the requisition history
    const historyList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.requisitionhistory,
      [Query.orderDesc('$createdAt'), Query.limit(limit)]
    );

    if (!historyList || !historyList.documents.length) {
      return { rows: [] };
    }

    // Extract unique user IDs
    const userIds = [...new Set(
      historyList.documents
        .map(doc => doc.requisitionist)
        .filter(Boolean)
    )];

    // Fetch users with their roles
    const users = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.users,
      [
        Query.equal('$id', userIds),
        Query.select(['*', 'role.*'])
      ]
    );

    // Create user lookup map
    const userMap = new Map();
    users.rows?.forEach((user: any) => {
      userMap.set(user.$id, user);
    });

    // Merge the data
    const enrichedHistory = historyList.documents.map(item => ({
      ...item,
      requisitionist: userMap.get(item.requisitionist) || item.requisitionist
    }));

    return { rows: enrichedHistory };

  } catch (error) {
    console.error('Error in getRequisitionHistoryWithUsers:', error);
    return { rows: [] };
  }
}

// Update the existing function to use the new approach
export async function getInventoryCategoryList(requisition: boolean, consoleEstimate: boolean) {
  try {
    let requisitionList = null
    let consoleEstimateList = null
    const inventoryList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      [Query.orderDesc('$createdAt'), Query.limit(100)]
    );

    if (!inventoryList) throw Error;

    if (requisition) requisitionList = await getRequisitionHistoryWithUsers() 

    if (consoleEstimate) consoleEstimateList = await getConsoleEstimatesList('')

    return { inventoryList, requisitionList, consoleEstimateList };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}





export async function getRequisitionHistoryList(limit = 300) {
  try {
    // First, get the requisition history without nested selection
    const historyList = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.requisitionhistory,
      [Query.orderDesc('$createdAt'), Query.limit(limit)]
    );

    if (!historyList || !historyList.rows.length) {
      return { rows: [] };
    }

    // Extract unique user IDs and role IDs
    const userIds = [...new Set(
      historyList.rows
        .map((row: any) => row.requisitionist)
        .filter(Boolean)
    )];


    // Fetch users with their roles separately
    const users = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.users,
      [
        Query.equal('$id', userIds),
        Query.select(['*', 'role.*'])
      ]
    );


    // If users still don't have expanded roles, fetch roles separately
    let enrichedUsers = users.rows || [];
    
    if (enrichedUsers.length > 0 && typeof enrichedUsers[0].role === 'string') {

      // Extract unique role IDs
      const roleIds = [...new Set(
        enrichedUsers
          .map((user: any) => user.role)
          .filter(Boolean)
      )];

      // Fetch roles separately
      const roles = await databases.listDocuments(
        appwriteConfig.database,
        appwriteConfig.roles,
        [Query.equal('$id', roleIds)]
      );

      // Create role lookup map
      const roleMap = new Map();
      roles.documents.forEach((role: any) => {
        roleMap.set(role.$id, role);
      });

      // Enrich users with role data
      enrichedUsers = enrichedUsers.map((user: any) => ({
        ...user,
        role: roleMap.get(user.role) || user.role
      }));
    }

    // Create user lookup map
    const userMap = new Map();
    enrichedUsers.forEach((user: any) => {
      userMap.set(user.$id, user);
    });


    // Merge the data
    const enrichedHistory = historyList.rows.map((item: any) => ({
      ...item,
      requisitionist: userMap.get(item.requisitionist) || item.requisitionist
    }));


    return { rows: enrichedHistory };

  } catch (error) {
    console.error('Error in getRequisitionHistoryList:', error);
    return { rows: [] };
  }
}

export async function getInventoryCategoryById(id: string) {
  try {
    const inventoryCategory = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.inventorycategory,
      id
    );

    if (!inventoryCategory) throw Error;

    return inventoryCategory;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getInventoryItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const inventoryItem = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.stores,
      itemId,
      [Query.select(['*', 'category.*', 'creator.*'])]
    );

    if (!inventoryItem) throw Error;

    return inventoryItem
  } catch (error) {
    console.log(error);
  }
}


// Production

export async function saveManufacturedItemToDB(ManufacturedItem: ManufacturedProductDetailsType) {
  try {
    const newInventoryItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.stores,
      ID.unique(),
      ManufacturedItem
    );
    return newInventoryItem;
  } catch (error) {
    console.log(error);
  }
}