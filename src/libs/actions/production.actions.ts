import { ID, Query } from "appwrite";
import { account, databases, storage, tablesDB } from "../appwrite.config";
import { appwriteConfig } from '../appwrite.config';
import { ImageType, ManufacturedItemDetailType, ManufacturedProductDataParams, ManufacturedProductDetailsType, ProductionCategoryType, Worker, WorkerDataParams, WorkerDetailType } from "@/types/apps/ecommerceTypes";
import { addRequisitionHistory, getConsoleEstimatesList, getRequisitionHistoryList } from "./stores.actions";


// Production

export async function saveManufacturedItemToDB(ManufacturedItem: ManufacturedProductDetailsType) {
  console.log(ManufacturedItem)
  try {
    const newInventoryItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.production,
      ID.unique(),
      ManufacturedItem
    );
    return newInventoryItem;
  } catch (error) {
    console.log(error);
  }
}

export async function createProductItem(productionItem: ManufacturedItemDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const productionImageCollection = productionItem.productImages ?? []
    try {

      const productionCategoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        productionItem.productCategory);
      
      if (!productionCategoryList) {
        throw new Error('Production category not found');
      }

      const category = productionCategoryList;
      const currentTotalProducts = category.totalProducts;
      const newTotalProducts = currentTotalProducts + productionItem.packageQuantity;

      const uploadedImages = await Promise.all(productionImageCollection.map(async (file) => {
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
      const updatedProductionCategory = await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        category.$id, // Use the actual document ID
        {
          totalProducts: newTotalProducts,
          status: 'available',
        }
      );

      if (!updatedProductionCategory) throw new Error('Failed to process production item')

      const newManufacturedItem = await saveManufacturedItemToDB({
        productCategory: productionItem.productCategory,
        totalPrice: productionItem.pricePerBox! * productionItem.packageQuantity,
        pricePerBox: productionItem.pricePerBox!,
        qtyPerPackage: productionItem.qtyPerPackage!,
        manufactureDate: productionItem.manufactureDate!,
        status: 'Production',
        // @ts-ignore
        images: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : category.images,
        description: productionItem.description!,
        batchNumber: productionItem.batchNumber!,
        creator: creator,
        packageQuantity: productionItem.packageQuantity,
        priceOfOneItem: productionItem.pricePerBox! / productionItem.qtyPerPackage!,
        // requisition: 'available'
      });

        const productcategory = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        productionItem.productCategory
        )

      addRequisitionHistory({
        noOfBoxes: productionItem.packageQuantity,
        requisitionist: creator,
        category: productcategory.title,
        requisitionType: 'production console',
        requisitionEvent: 'added',
        description: productionItem.description!
      });
    
      return newManufacturedItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create inventory item for ${productionItem.productCategory} after ${maxRetries} attempts:`, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}


export async function getProductionRequisitionList() {
  try {
    const requisitionList = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.productionrequisition,
      [Query.select(['*', 'category.*', 'requisitionist.*']),Query.equal('requisitionEvent', 'pending')]
    );

    if (!requisitionList) throw Error;

    return requisitionList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}



export async function getIssuedProductionRequisitionList() {
  try {
    const requisitionList = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.productionrequisition,
      [Query.equal('requisitionEvent', 'approved'), Query.select(['*', 'category.*', 'requisitionist.*'])]
    );

    if (!requisitionList) throw Error;

    return requisitionList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getManufacturedProductList() {
  try {
    const productionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.production,
      [Query.orderDesc('manufactureDate'), Query.limit(300)]
    );

    if (!productionList) throw Error;

    return productionList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

// FIXED: Changed from parallel to sequential processing
export async function createManufacturedProductList(list: ManufacturedProductDataParams, creator: string) {
  try {
    const productData = list.details;
    console.log(productData)
    
    const successfulProduct = [];
    const errors = [];
    
    // Process items sequentially instead of in parallel
    for (const productionDataItem of productData) {
      try {
        const createdProduct = await createProductItem(productionDataItem, creator);
        if (createdProduct !== null) {
          successfulProduct.push(createdProduct);
        } else {
          errors.push(`Failed to create product for category: ${productionDataItem.productCategory}`);
        }
      } catch (error) {
        console.error(`Error processing item for category ${productionDataItem.productCategory}:`, error);
        errors.push(`Error processing category ${productionDataItem.productCategory}: ${error}`);
      }
    }
    
    // Log errors if any
    if (errors.length > 0) {
      console.warn('Some items failed to process:', errors);
    }
    
    return successfulProduct;

  } catch (error) {
    console.log(error);
    throw error;
  }
}



export async function getProductionCategoryList( requisition: boolean, consoleEstimate: boolean){
  try {
    let requisitionList = null
    let consoleEstimateList = null
    
    const productionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      [Query.orderDesc('$createdAt')]
    );

    if (!productionList) throw Error;

    if (requisition) requisitionList = await getRequisitionHistoryList()

    if (consoleEstimate) consoleEstimateList = await getConsoleEstimatesList('')

    return { productionList, requisitionList, consoleEstimateList };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getProductionItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const manufacturedItems = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.production,
      itemId,
      [Query.select(['*', 'productCategory.*', 'creator.*'])]
    );

    if (!manufacturedItems) throw Error;

    return manufacturedItems
  } catch (error) {
    console.log(error);
  }
}



export async function updateProductionCategoryInDB(
  productionCategory: ProductionCategoryType & { id: string }
): Promise<any> {
  try {
    let processedImages: ImageType[] = [];
    
    if (productionCategory.images && productionCategory.images.length > 0) {
      // Explicitly type-guard to separate Files from ImageType objects
      const newImages = productionCategory.images.filter((img): img is File => img instanceof File);
      const existingImages = productionCategory.images.filter((img): img is ImageType => 
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
    const priceOfOneItem = productionCategory.pricePerBox / productionCategory.qtyPerPackage;

    // Update the document
    const updatedProductionCategory = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      productionCategory.id,
      {
        title: productionCategory.title,
        description: productionCategory.description,
        images: JSON.stringify(processedImages),
        qtyPerPackage: productionCategory.qtyPerPackage,
        pricePerBox: productionCategory.pricePerBox,
        salesPrice: productionCategory.pricePerBox,
        priceOfOneItem: priceOfOneItem
      }
    );

    if (!updatedProductionCategory) {
      throw new Error('Failed to update manufacture category');
    }

    return updatedProductionCategory;

  } catch (error) {
    console.error('Error updating manufacture category:', error);
    throw error;
  }
}

// Helper function to delete old images if needed
export async function deleteProductionImage(fileId: string) {
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

export async function saveProductionCategoryToDB(productionCategory: ProductionCategoryType, creator: string) {
    const productionImageCollection = productionCategory.images ?? []
    try {
      const uploadedImages = await Promise.all(productionImageCollection.map(async (file) => {
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
    const newProductionCategory = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      ID.unique(),
      {
        title: productionCategory.title,
        description: productionCategory.description,
        images: JSON.stringify(uploadedImages),
        qtyPerPackage: productionCategory.qtyPerPackage,
        pricePerBox: productionCategory.pricePerBox,
        salesPrice: productionCategory.pricePerBox,
        priceOfOneItem: productionCategory.pricePerBox / productionCategory.qtyPerPackage,
        creator: creator
      }
    );
      
    addRequisitionHistory({
      noOfBoxes: 0,
      requisitionist: creator,
      category: productionCategory.title,
      requisitionType: 'production category',
      requisitionEvent: 'added',
      description: productionCategory.description!
    });
      
    return newProductionCategory;
  } catch (error) {
    console.log(error);
  }
}


export async function getProductionCategoryItemById(itemId: string) {
  try {
    const productionList = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId
    );

    if (!productionList) throw Error;

    return productionList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function saveWorkersProductionToDB(workersProduction: WorkerDetailType) {
  try {
    const newWorkersProduction = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.workersproduction,
      ID.unique(),
      workersProduction
    );
    return newWorkersProduction;
  } catch (error) {
    console.log(error);
  }
}


export async function createWorkersProduction(workersProduction: WorkerDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const categoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        workersProduction.category
      );

      if (!categoryList) {
        throw new Error('Production category not found');
      }
      const newWorkersProduction = await saveWorkersProductionToDB({
        category: workersProduction.category,
        creator: creator,
        productionDate: workersProduction.productionDate!,
        quantity: workersProduction.quantity,
        worker: workersProduction.worker,
      });

        addRequisitionHistory({
          noOfBoxes: workersProduction.quantity,
          requisitionist: creator,
          category: categoryList.title,
          requisitionType: `worker's production`,
          requisitionEvent: 'added',
          description: categoryList.description!
        });


      return newWorkersProduction;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create transaction item for ${workersProduction.category} `, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}


// FIXED: Changed from parallel to sequential processing
export async function createWorkersProductionList(list: WorkerDataParams, creator: string) {
  try {
    const transactionData = list.details;
    
    const successfulProduct = [];
    const errors = [];
    
    // Process items sequentially instead of in parallel
    for (const transactionDataItem of transactionData) {
      try {
        const transactionProduct = await createWorkersProduction(transactionDataItem, creator);
        if (transactionProduct !== null) {
          successfulProduct.push(transactionProduct);
        } else {
          errors.push(`Failed to create worker production for category: ${transactionDataItem.category}`);
        }
      } catch (error) {
        console.error(`Error processing worker production for category ${transactionDataItem.category}:`, error);
        errors.push(`Error processing category ${transactionDataItem.category}: ${error}`);
      }
    }
    
    // Log errors if any
    if (errors.length > 0) {
      console.warn('Some worker production items failed to process:', errors);
    }
    
    return successfulProduct;

  } catch (error) {
    console.log(error);
    throw error;
  }
}



export async function getWorkersProductionList() {
  try {
    // Step 1: Fetch the main documents
    const workersProductionList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.workersproduction,
      [Query.orderDesc('$createdAt'), Query.limit(100)]
    );

    if (!workersProductionList || !workersProductionList.documents) {
      throw new Error('No production data found');
    }

    // Step 2: Extract unique IDs for batch fetching
    const categoryIds = [...new Set(
      workersProductionList.documents
        .map(doc => doc.category)
        .filter(id => id) // Remove null/undefined
    )];
    
    const workerIds = [...new Set(
      workersProductionList.documents
        .map(doc => doc.worker)
        .filter(id => id)
    )];
    
    const creatorIds = [...new Set(
      workersProductionList.documents
        .map(doc => doc.creator)
        .filter(id => id)
    )];

    // Step 3: Fetch all relationships in parallel batches
    const [categories, workers, creators] = await Promise.all([
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.productioncategory, categoryIds),
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.workers, workerIds),
      fetchDocumentsBatch(appwriteConfig.database, appwriteConfig.users, creatorIds) // assuming creators are from users collection
    ]);

    // Step 4: Create lookup maps for O(1) access
    const categoryMap = new Map(categories.map(cat => [cat.$id, cat]));
    const workerMap = new Map(workers.map(worker => [worker.$id, worker]));
    const creatorMap = new Map(creators.map(creator => [creator.$id, creator]));

    // Step 5: Populate relationships in the original documents
    const enrichedDocuments = workersProductionList.documents.map(doc => ({
      ...doc,
      category: categoryMap.get(doc.category) || doc.category,
      worker: workerMap.get(doc.worker) || doc.worker,
      creator: creatorMap.get(doc.creator) || doc.creator
    }));

    return {
      ...workersProductionList,
      documents: enrichedDocuments
    };

  } catch (error) {
    console.log('Error fetching workers production list:', error);
    return undefined;
  }
}


// Helper function to fetch documents in batches (Appwrite has query limits)
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