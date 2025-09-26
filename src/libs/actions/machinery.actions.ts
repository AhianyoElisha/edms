import { ImageType, MachineryDetailType, MachineryDetailsType, MachineryDataParams, MachineryCategoryType } from '@/types/apps/ecommerceTypes';
import { ID, Query } from "appwrite";
import { databases, storage, tablesDB } from "../appwrite.config";
import { appwriteConfig } from '../appwrite.config';
import { addRequisitionHistory } from './stores.actions';



export async function createMachineryItem(machineryItem: MachineryDetailType, creator: string, maxRetries = 1) {
if(!creator) throw new Error('creator must be provided')
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const machineryImageCollection = machineryItem.machineryImages ?? []
    const paymentImageCollection = machineryItem.paymentModeImages ?? []
    try {
      // First, fetch the category document to get current totalProducts
      const categoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        machineryItem.machineryCategory);

      if (!categoryList) {
        throw new Error('Category not found');
      }
      
      const category = categoryList;
      const currentTotalProducts = category.totalProducts || 0;
      const newTotalProducts = currentTotalProducts + machineryItem.packageQuantity;
  

      // Upload images
      const uploadedImages = await Promise.all(machineryImageCollection.map(async (file) => {
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
        appwriteConfig.productioncategory,
        category.$id, // Use the actual document ID
        {
          totalProducts: newTotalProducts,
          status: 'available',
        }
      );

      // Create new inventory item
      const newMachineryItem = await saveMachineryItemToDB({
        category: machineryItem.machineryCategory,
        totalPrice: machineryItem.pricePerOne! * machineryItem.packageQuantity,
        status: 'Stores',
        images: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : category.images,
        paymentImages: JSON.stringify(uploadedPaymentImages),
        productBrand: machineryItem.vendorName,
        paymentStatus: machineryItem.paymentStatus ,
        paymentModeCash: machineryItem.paymentModeCash,
        paymentModeCheque: machineryItem.paymentModeCheque,
        paymentModeBank: machineryItem.paymentModeBank,
        description: machineryItem.description!,
        invoiceNumber: machineryItem.invoiceNumber,
        creator: creator,
        packageQuantity: machineryItem.packageQuantity,
        pricePerOne: machineryItem.pricePerOne!,
        usdRate: machineryItem.usdRate,
        purchaseDate: machineryItem.purchaseDate
      });

      return newMachineryItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create inventory item for ${machineryItem.vendorName} after ${maxRetries} attempts:`, error);
        return error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}





export async function saveMachineryItemToDB(MachineryItem: MachineryDetailsType) {
  try {
    const newMachineryItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.machinery,
      ID.unique(),
      MachineryItem
    );
    return newMachineryItem;
  } catch (error) {
    console.log(error);
  }
}


export async function saveMachineryCategoryToDB(MachineryCategory: MachineryCategoryType, creator: string) {
    const machineryImageCollection = MachineryCategory.images ?? []
    try {
      const uploadedImages = await Promise.all(machineryImageCollection.map(async (file) => {
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
    const newMachineryCategory = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      ID.unique(),
      {
        categoryTitle: MachineryCategory.categoryTitle,
        description: MachineryCategory.description,
        images: JSON.stringify(uploadedImages),
        creator: creator,
        pricePerOne: MachineryCategory.pricePerOne * MachineryCategory.usdRate,
        usdRate: MachineryCategory.usdRate
      }
    );
      
    addRequisitionHistory({
      noOfBoxes: 0,
      requisitionist: creator,
      category: MachineryCategory.categoryTitle,
      requisitionType: 'machinery category',
      requisitionEvent: 'added',
      description: MachineryCategory.description!
    });
      
    return newMachineryCategory;
  } catch (error) {
    console.log(error);
  }
}

export async function updateMachineryCategoryInDB(
  machineryCategory: MachineryCategoryType & { id: string }
): Promise<any> {
  try {
    let processedImages: ImageType[] = [];
    
    if (machineryCategory.images && machineryCategory.images.length > 0) {
      // Explicitly type-guard to separate Files from ImageType objects
      const newImages = machineryCategory.images.filter((img): img is File => img instanceof File);
      const existingImages = machineryCategory.images.filter((img): img is ImageType => 
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

    // Update the document
    const updatedMachineryCategory = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      machineryCategory.id,
      {
        categoryTitle: machineryCategory.categoryTitle,
        description: machineryCategory.description,
        images: JSON.stringify(processedImages),
        pricePerOne: machineryCategory.pricePerOne,
        usdRate: machineryCategory.usdRate,
        status: 'available'
      }
    );

    if (!updatedMachineryCategory) {
      throw new Error('Failed to update machinery category');
    }

    return updatedMachineryCategory;

  } catch (error) {
    console.error('Error updating machinery category:', error);
    throw error;
  }
}

// Helper function to delete old images if needed
export async function deleteMachineryImage(fileId: string) {
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



export async function createMachineryList(list: MachineryDataParams, creator: string) {
  try {
    const machineryData = list.details;
    const results = [];
    const errors = [];
    
    // Process items sequentially to prevent race conditions
    for (const item of machineryData) {
      try {
        // Fetch fresh category data for each item
        const category = await getMachineryCategoryById(item.machineryCategory);
        
        if (!category) {
          throw new Error(`Machinery category not found for item: ${item.description}`);
        }

        // Validate payment amounts with fresh data
        const totalPayment = (item.paymentModeCash || 0) + 
                           (item.paymentModeCheque || 0) + 
                           (item.paymentModeBank || 0);
        const expectedPayment = category.pricePerBox * item.packageQuantity;

        if (item.paymentStatus === 'paid' && totalPayment < expectedPayment) {
          throw new Error(
            `You did not make full payment for ${category.categoryTitle}. Check payment status (${expectedPayment})`
          );
        }

        if (totalPayment > expectedPayment) {
          throw new Error(
            `You overpaid for ${category.categoryTitle}. Let the numbers tally (${expectedPayment})`
          );
        }

        // Create the machinery item (this will fetch fresh data and update totals)
        const result = await createMachineryItem(item, creator);
        results.push(result);

        // Add requisition history
        addRequisitionHistory({
          noOfBoxes: item.packageQuantity,
          requisitionist: creator,
          category: category.categoryTitle,
          requisitionType: 'machinery console',
          requisitionEvent: 'added',
          description: item.description!
        });

      } catch (error) {
        console.error(`Error processing machinery item:`, error);
        errors.push({
          item: item.description || 'Unknown item',
          error: typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)
        });
        // Continue processing other items even if one fails
      }
    }

    // If there were any errors, include them in the response
    if (errors.length > 0) {
      console.warn('Some items failed to process:', errors);
      return {
        success: results,
        errors: errors
      };
    }

    return results;
  } catch (error) {
    console.log(error);
    throw error;
  }
}



// Add this function to your machinery.actions.js file

export async function deleteMachineryItem(machineryItemId: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // First, get the machinery item to determine quantity and category
      const machineryItem = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.machinery,
        machineryItemId
      );
      
      if (!machineryItem) {
        throw new Error('Machinery item not found');
      }
      
      // Get the category to update totalProducts
      const category = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        machineryItem.category.$id
      );

      
      if (!category) {
        throw new Error('Category not found');
      }
      
      // Calculate new total products by subtracting the package quantity
      const currentTotalProducts = category.totalProducts;
      const newTotalProducts = currentTotalProducts - machineryItem.packageQuantity;
      
      // Update the category with new total
      const updatedProduct =  await databases.updateDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        category.$id,
        {
          totalProducts: newTotalProducts
        }
      );

      
      // Delete the machinery item
      const deletedItem = await databases.deleteDocument(
        appwriteConfig.database,
        appwriteConfig.machinery,
        machineryItemId
      );
      
      // Optional: Delete associated images from storage
      try {
        const images = JSON.parse(machineryItem.images || '[]');
        const paymentImages = JSON.parse(machineryItem.paymentImages || '[]');
        
        // Delete machinery images
        for (const image of images) {
          if (image.fileId) {
            await storage.deleteFile(appwriteConfig.bucket, image.fileId);
          }
        }
        
        // Delete payment images
        for (const image of paymentImages) {
          if (image.fileId) {
            await storage.deleteFile(appwriteConfig.bucket, image.fileId);
          }
        }
      } catch (imageError) {
        console.error('Error deleting associated images:', imageError);
        // Continue with deletion even if image deletion fails
      }
      
      return deletedItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to delete machinery item ${machineryItemId} after ${maxRetries} attempts:`, error);
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

// Function to handle bulk deletion of machinery items
export async function bulkDeleteMachineryItems(machineryItemIds: any[]) {
  const results = {
    success: [],
    failed: []
  };
  
  for (const itemId of machineryItemIds) {
    try {
      await deleteMachineryItem(itemId);
      // @ts-ignore
      results.success.push(itemId);

    } catch (error) {
      console.error(`Failed to delete machinery item ${itemId}:`, error);
      // @ts-ignore
      results.failed.push(itemId)

    }
  }
  
  return results;
}



export async function getMachineryList() {
  try {
    const machineryList = await tablesDB.listRows(
      appwriteConfig.database,
      appwriteConfig.machinery,
      [Query.select(['*', 'category.*', 'creator.*']), Query.orderDesc('purchaseDate'), Query.limit(500)]
    );

    if (!machineryList) throw Error;

    return machineryList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getMachineryCategoryItemById(itemId: string) {
  try {
    const machineryList = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId
    );

    if (!machineryList) throw Error;

    return machineryList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getMachineryCategoryList(requisition: boolean, consoleEstimate: boolean) {
  try {
    const machineryList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      [Query.orderDesc('$createdAt'), Query.limit(200)]
    );

    if (!machineryList) throw Error;


    return { machineryList };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}



export async function getMachineryCategoryById(id: string) {
  try {
    const machineryCategory = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      id
    );

    if (!machineryCategory) throw Error;

    return machineryCategory;
  } catch (error) {
    console.log(error);
    return null;
  }
}


export async function getMachineryItemById(itemId?: string) {
  if (!itemId) throw Error;

  try {
    const machineryItem = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.machinery,
      itemId
    );

    if (!machineryItem) throw Error;

    return machineryItem
  } catch (error) {
    console.log(error);
  }
}