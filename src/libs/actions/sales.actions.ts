import { ProductionEstimate, ProductionRequisitionDataParams, RequisitionHistory, SalesCategoryType } from '@/types/apps/ecommerceTypes';
import { ID, Query } from "appwrite";
import { databases, tablesDB } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';
import { getProductionCategoryItemById } from './production.actions';





export async function addToSalesEstimate(requisitionItem: ProductionEstimate) {
  try {
    const requisition = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.salesestimate,
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


export async function makeSalesRequisition(itemId: string, quantity: number) {
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
        warehouseRequisitionRequest: category.warehouseRequisitionRequest + quantity,
        totalWarehouseProducts: category.totalWarehouseProducts - quantity,
        warehouseStatus: category.totalWarehouseProducts - quantity == 0 ? ' unavailable' : 'available'
      }
    );

    if (!updatedCategory) throw Error;

    return updatedCategory;
  } catch (error) {
    console.log(error);
    return error;
  }
}

export async function getSalesItemById(itemId: string) {
  try {
    const salesList = await tablesDB.getRow(
      appwriteConfig.database,
      appwriteConfig.orders,
      itemId,
      [Query.select(['*', 'creator.*', 'vehicle.*', 'customers.*'])] // Select all fields including relationships
    );

    if (!salesList) throw Error;

    return salesList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function addToWarehouseRequisition(itemId: string, quantity: number, creator: string) {
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
      appwriteConfig.warehouserequisition,
      ID.unique(),
      {
        category: itemId,
        noOfBoxes: quantity,
        requisitionist: creator,
        requisitionEvent: 'pending',
        requisitionType: 'warehouse',
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


export async function makeWarehouseRequisitionList(list: ProductionRequisitionDataParams, creator: string) {
  try {
    const requisitionList = list.details;
    
    // First, fetch all product categories and validate quantities
    const productionCategories = await Promise.all(
      requisitionList.map(item => getProductionCategoryItemById(item.productionCategory))
    );
    
    // Check if any product categories weren't found
    if (productionCategories.some(cat => !cat)) {
      throw new Error('One or more production categories not found');
    }

    // Validate all quantities before making any changes
    requisitionList.forEach((item, index) => {
      const category = productionCategories[index];
      if (item.noOfBoxes > category!.totalWarehouseProducts) {
        throw new Error(
          `Cannot exceed available products limit for ${category!.categoryTitle}. ` +
          `Requested: ${item.noOfBoxes}, Available: ${category!.totalWarehouseProducts}`
        );
      }
    });

    // If validation passes, process all requisitions
    const results = await Promise.all(
      requisitionList.map(async (item, index) => {
        const category = productionCategories[index]!;
        
        // Make the requisition
        const updatedCategory = await makeSalesRequisition(
          item.productionCategory,
          item.noOfBoxes
        )

        const requisitions = await addToWarehouseRequisition(
          item.productionCategory,
          item.noOfBoxes,
          creator
        )

        // Add to history
        await addRequisitionHistory({
          noOfBoxes: item.noOfBoxes,
          requisitionist: creator,
          category: category.title,
          requisitionType: 'warehouse',
          requisitionEvent: 'requested',
          description: category.description
        });

        return updatedCategory;
      })
    );

    return results;
  } catch (error) {
    console.log(error);
    throw error;
  }
}


export async function pushWarehouseToSales(itemId: string, quantity: number, approvedBy: string) {
  if (!itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      itemId
    ) 

    if (category.totalProducts < quantity) throw new Error('Not enough products to push to warehouse');

    const warehouseEstimate = await addToSalesEstimate({
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
        totalWarehouseProducts: category.totalWarehouseProducts - quantity,
        status: category.totalWarehouseProducts - quantity == 0 ? ' unavailable' : 'available'
      }
    );

    const salesItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.sales,
      ID.unique(),
      {
        productCategory: category.$id,
        description: category.description,
        pricePerBox: category.pricePerBox,
        qtyPerPackage: category.qtyPerPackage,
        packageQuantity: quantity,
        images: category.images,
        totalPrice: category.pricePerBox! * quantity,
        status: 'Sales',
        creator: approvedBy,
        priceOfOneItem: category.priceOfOneItem,
      }
    )

    if (!salesItem) throw Error;

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.requisitionRequest,
      requisitionType: 'warehouse',
      category: category.title,
      description: category.description,
      requisitionist: approvedBy,
      requisitionEvent: 'pushed'
    })


    return { salesItem, requisitionHistory, warehouseEstimate };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}



export async function approveWarehouseRequisition(itemId: string ,categoryId: string, approvedBy: string) {
  if (!categoryId || !approvedBy || !itemId) throw Error;

  try {
    const category = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId
    ) 

    console.log(category)

    const salesEstimate = await addToSalesEstimate({
      category: category.title,
      pricePerBox: category.pricePerBox,
      qtyPerBox: category.qtyPerPackage,
      packageQuantity: category.warehouseRequisitionRequest!,
      totalPrice: category.pricePerBox! * category.warehouseRequisitionRequest
    })

    const requisition = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.warehouserequisition,
      itemId
    )

    const updatedItem = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId,
      {
        totalSalesProducts: category.totalSalesProducts + requisition.noOfBoxes,
        warehouseRequisitionRequest: category.warehouseRequisitionRequest! - requisition.noOfBoxes!,
        salesStatus: 'available'
      }
    );
    
    if (!updatedItem) throw Error;



    const updatedRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.warehouserequisition,
      itemId,
      {
        requisitionEvent: 'approved'
      }
    )

    console.log(updatedRequisition)


    const salesItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.sales,
      ID.unique(),
      {
        productCategory: category.$id,
        description: category.description,
        pricePerBox: category.pricePerBox,
        qtyPerPackage: category.qtyPerPackage,
        packageQuantity: category.warehouseRequisitionRequest,
        images: category.images,
        totalPrice: category.pricePerBox! * category.warehouseRequisitionRequest,
        status: 'Sales',
        creator: approvedBy,
        priceOfOneItem: category.priceOfOneItem,
      }
    )

    if (!salesItem) throw Error;

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.warehouseRequisitionRequest,
      requisitionType: 'warehouse',
      category: category.title,
      description: category.description,
      requisitionist: approvedBy,
      requisitionEvent: 'approved'
    })


    return { updatedItem, salesItem, requisitionHistory, salesEstimate };
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function denyWarehouseRequisition(itemId: string, categoryId: string, deniedBy: string) {
  
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
      appwriteConfig.warehouserequisition,
      itemId
    )
    
    const updatedItem = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.productioncategory,
      categoryId,
      {
        totalWarehouseProducts: category.totalWarehouseProducts + category.warehouseRequisitionRequest,
        warehouseRequisitionRequest: category.warehouseRequisitionRequest - requisition.noOfBoxes,
        warehouseStatus: 'available'
      }
    );

    const updatedRequisition = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.warehouserequisition,
      itemId,
      {
        requisitionEvent: 'denied'
      }
    )

    console.log(updatedRequisition)


    if (!updatedItem) throw Error;

    const requisitionHistory = await addRequisitionHistory({
      noOfBoxes: category.warehouseRequisitionRequest,
      requisitionType: 'warehouse',
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

export async function getSalesProductList() {
  try {
    const salesList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.sales,
      [Query.orderDesc('$createdAt')]
    );

    if (!salesList) throw Error;

    return salesList;
  } catch (error) {
    console.log(error);
    return undefined;
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


export async function saveSalesCategoryToDB(SalesCategory: SalesCategoryType, creator: string) {
    try {
    const newSalesCategory = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.salescategory,
      ID.unique(),
      {
        categoryTitle: SalesCategory.categoryTitle,
        description: SalesCategory.description,
      }
    );

    addRequisitionHistory({
      noOfBoxes: 0,
      requisitionist: creator,
      category: SalesCategory.categoryTitle,
      requisitionType: 'sales category',
      requisitionEvent: 'added',
      description: SalesCategory.description!
    });
      
    return newSalesCategory;
  } catch (error) {
    console.log(error);
  }
}

export async function updateSalesCategoryInDB(
  salesCategory: SalesCategoryType & { id: string }
): Promise<any> {
  try {
    // Update the document
    const updatedSalesCategory = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.salescategory,
      salesCategory.id,
      {
        categoryTitle: salesCategory.categoryTitle,
        description: salesCategory.description,
      }
    );

    if (!updatedSalesCategory) {
      throw new Error('Failed to update sales category');
    }

    return updatedSalesCategory;

  } catch (error) {
    console.error('Error updating sales category:', error);
    throw error;
  }
}

export async function getSalesCategoryItemById(itemId: string) {
  try {
    const salesList = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.salescategory,
      itemId
    );

    if (!salesList) throw Error;

    return salesList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}

export async function getSalesCategoryList() {
  try {
    const salesList = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.salescategory,
      [Query.orderDesc('$createdAt'), Query.limit(100)]
    );

    if (!salesList) throw Error;

    // if (requisition) requisitionList = await getRequisitionHistoryList() 

    // if (consoleEstimate) consoleEstimateList = await getConsoleEstimatesList()

    return salesList;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


export async function getSalesCategoryById(id: string) {
  try {
    const salesCategory = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.salescategory,
      id
    );

    if (!salesCategory) throw Error;

    return salesCategory;
  } catch (error) {
    console.log(error);
    return undefined;
  }
}


