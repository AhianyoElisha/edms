import { ID, Query } from "appwrite";
import { account, databases, storage } from "../appwrite.config";
import { appwriteConfig } from '../appwrite.config';
import { DailySalesItemDetailType, ExpensesDataParams, ExpensesDetailType, ReturnItemDetailType, ReturnProductDataParams, TransactionItemDetailType, TransactionProductDataParams, Users } from "@/types/apps/ecommerceTypes";
import { getLogisticsDetailsById } from "./customer.action";
import { getProductionCategoryItemById } from "./production.actions";
import { addRequisitionHistory } from "./stores.actions";


// Production

export async function saveDailySalesItemToDB(dailySalesItem: DailySalesItemDetailType) {
  console.log(dailySalesItem)
  try {
    const newDailySalesItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.orders,
      ID.unique(),
      dailySalesItem
    );
    return newDailySalesItem;
  } catch (error) {
    console.log(error);
  }
}

export async function saveReturnedProductsItemToDB(returnedProductsItem: ReturnItemDetailType) {
  try {
    const newReturnedProductsItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.returns,
      ID.unique(),
      returnedProductsItem
    );
    return newReturnedProductsItem;
  } catch (error) {
    console.log(error);
  }
}


export async function saveExpenseItemToDB(expenseItem: ExpensesDetailType) {
  try {
    const newExpenseItem = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      ID.unique(),
      expenseItem
    );
    return newExpenseItem;
  } catch (error) {
    console.log(error);
  }
}



export async function createDailySalesItem(dailySalesItem: DailySalesItemDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Fetch fresh data each time to avoid stale data issues
      const dailySalesCategoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        dailySalesItem.category
      );

      if (!dailySalesCategoryList) {
        throw new Error('Daily sales category not found');
      }

      const dailySalesVehicle = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.vehicles,
        dailySalesItem.vehicle || ''
      );

      const totalPrice = dailySalesCategoryList.pricePerBox * dailySalesItem.quantity;

      // If vehicle is specified, validate distributed products availability
      if (dailySalesItem.vehicle) {
        const existingDistributedProduct = await databases.listDocuments(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          [
            Query.equal('category', dailySalesItem.category),
            Query.equal('vehicles', dailySalesItem.vehicle!)
          ]
        );

        if (existingDistributedProduct.documents.length === 0) {
          throw new Error(`No distributed products found for this category and vehicle`);
        }

        const currentDistributedProduct = existingDistributedProduct.documents[0];
        if (dailySalesItem.quantity > currentDistributedProduct.totalProducts) {
          throw new Error(
            `Cannot exceed available distributed products limit. ` +
            `Requested: ${dailySalesItem.quantity}, Available: ${currentDistributedProduct.totalProducts}`
          );
        }
      } else {
        // Validate warehouse products availability
        if (dailySalesItem.quantity > dailySalesCategoryList.totalWarehouseProducts) {
          throw new Error(
            `Cannot exceed available warehouse products limit for ${dailySalesCategoryList.title}. ` +
            `Requested: ${dailySalesItem.quantity}, Available: ${dailySalesCategoryList.totalWarehouseProducts}`
          );
        }
      }

      console.log(dailySalesItem)

      const newDailySalesItem = await saveDailySalesItemToDB({
        category: dailySalesItem.category,
        creator: creator,
        quantity: dailySalesItem.quantity,
        salesCategory: dailySalesItem.salesCategory,
        paymentStatus: dailySalesItem.paymentStatus,
        cash: dailySalesItem.cash,
        cheque: dailySalesItem.cheque,
        vehicle: dailySalesItem.vehicle,
        salesDate: dailySalesItem.salesDate,
        bank: dailySalesItem.bank,
        momo: dailySalesItem.momo,
        chequematurity: dailySalesItem.chequematurity,
        totalPrice: totalPrice,
      });

      if (dailySalesItem.vehicle) {
        // Search for existing distributed product
        const existingDistributedProduct = await databases.listDocuments(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          [
          // @ts-ignore
            Query.equal('category', dailySalesItem.category),
            Query.equal('vehicles', dailySalesItem.vehicle!)
          ]
        );

        let soldProductId: string;

        const existingSoldProduct = await databases.listDocuments(
          appwriteConfig.database,
          appwriteConfig.soldproducts,
          [
            Query.equal('category', dailySalesItem.category),
            Query.equal('vehicles', dailySalesItem.vehicle!),
          ]
        );

        if (existingSoldProduct.documents.length > 0) {
          console.log(existingSoldProduct)
          // Update existing distributed product
          const currentProduct = existingSoldProduct.documents[0];
          const updatedSoldProduct = await databases.updateDocument(
            appwriteConfig.database,
            appwriteConfig.soldproducts,
            currentProduct.$id,
            {
              totalProducts: currentProduct.totalProducts + dailySalesItem.quantity,
              totalPrice: currentProduct.totalPrice + totalPrice,
              status: 'available'
            }
          );
          soldProductId = currentProduct.$id;
        } else {
          // Create new distributed product
          const newSoldProduct = await databases.createDocument(
            appwriteConfig.database,
            appwriteConfig.soldproducts,
            ID.unique(),
            {
              category: dailySalesItem.category,
              vehicles: dailySalesItem.vehicle,
              totalProducts: dailySalesItem.quantity,
              totalPrice: totalPrice,
              status: 'available'
            }
          );
          soldProductId = newSoldProduct.$id;
        }

          const currentDistributedProduct = existingDistributedProduct.documents[0];
          const updatedDistributedProduct = await databases.updateDocument(
            appwriteConfig.database,
            appwriteConfig.distributedproducts,
            currentDistributedProduct.$id,
            {
              totalProducts: currentDistributedProduct.totalProducts - dailySalesItem.quantity,
              totalPrice: currentDistributedProduct.totalPrice - totalPrice,
              status: currentDistributedProduct.totalProducts - dailySalesItem.quantity == 0 ? ' unavailable' : 'available'
            }
          );

        // Update vehicle's distributedProducts array
        const currentSoldProducts = dailySalesVehicle.distributedProducts || [];
        if (!currentSoldProducts.includes(soldProductId)) {
          const updatedVehicleTransaction = await databases.updateDocument(
            appwriteConfig.database,
            appwriteConfig.vehicles,
            dailySalesVehicle.$id,
            {
              soldproducts: [...currentSoldProducts, soldProductId]
            }
          );
        }

      } else {
        // Search for existing distributed product
        const existingWarehouseProduct = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.productioncategory,
          dailySalesItem.category
        );

          const updatedWarehouseProduct = await databases.updateDocument(
            appwriteConfig.database,
            appwriteConfig.productioncategory,
            existingWarehouseProduct.$id,
            {
              totalWarehouseProducts: existingWarehouseProduct.totalWarehouseProducts - dailySalesItem.quantity,}
          );

      }

        addRequisitionHistory({
          noOfBoxes: dailySalesItem.quantity,
          requisitionist: creator,
          category: dailySalesCategoryList.title,
          requisitionType: 'sales',
          requisitionEvent: 'sold',
          description: dailySalesCategoryList.description!
        });


      return newDailySalesItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create transaction item for ${dailySalesItem.category} `, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}


export async function createReturnProductsItem(returnProductsItem: ReturnItemDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Fetch fresh data each time
      const dailySalesCategoryList = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.productioncategory,
        returnProductsItem.category
      );

      if (!dailySalesCategoryList) {
        throw new Error('Daily sales category not found');
      }

      const dailySalesVehicle = await databases.getDocument(
        appwriteConfig.database,
        appwriteConfig.vehicles,
        returnProductsItem.vehicle || ''
      );

      const totalPrice = dailySalesCategoryList.pricePerBox * returnProductsItem.quantity;

      // Validate distributed products availability
      if (returnProductsItem.vehicle) {
        const existingDistributedProduct = await databases.listDocuments(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          [
            Query.equal('category', returnProductsItem.category),
            Query.equal('vehicles', returnProductsItem.vehicle!)
          ]
        );

        if (existingDistributedProduct.documents.length === 0) {
          throw new Error(`No distributed products found for this category and vehicle`);
        }

        const currentDistributedProduct = existingDistributedProduct.documents[0];
        if (returnProductsItem.quantity > currentDistributedProduct.totalProducts) {
          throw new Error(
            `Cannot exceed available distributed products limit. ` +
            `Requested: ${returnProductsItem.quantity}, Available: ${currentDistributedProduct.totalProducts}`
          );
        }
      }

      const newReturnProductsItem = await saveReturnedProductsItemToDB({
        category: returnProductsItem.category,
        creator: creator,
        returnDate: returnProductsItem.returnDate,
        quantity: returnProductsItem.quantity,
        vehicle: returnProductsItem.vehicle,
      });

      if (returnProductsItem.vehicle) {
        // Search for existing distributed product
        const existingDistributedProduct = await databases.listDocuments(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          [
            Query.equal('category', returnProductsItem.category),
            Query.equal('vehicles', returnProductsItem.vehicle!)
          ]
        );

        const currentDistributedProduct = existingDistributedProduct.documents[0];
        console.log('current distribution totalPrice',currentDistributedProduct.totalPrice)
        const updatedDistributedProduct = await databases.updateDocument(
          appwriteConfig.database,
          appwriteConfig.distributedproducts,
          currentDistributedProduct.$id,
          {
            totalProducts: currentDistributedProduct.totalProducts - returnProductsItem.quantity,
            totalPrice:(currentDistributedProduct.totalProducts - returnProductsItem.quantity == 0) ? 0 : (currentDistributedProduct.totalPrice - totalPrice) < 0 ? 0 : currentDistributedProduct.totalPrice - totalPrice,
            status: currentDistributedProduct.totalProducts - returnProductsItem.quantity == 0 ? ' unavailable' : 'available'
          }
        );

        // Search for existing distributed product
        const existingWarehouseProduct = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.productioncategory,
          returnProductsItem.category
        );

        const updatedWarehouseProduct = await databases.updateDocument(
          appwriteConfig.database,
          appwriteConfig.productioncategory,
          existingWarehouseProduct.$id,
          {
            totalWarehouseProducts: existingWarehouseProduct.totalWarehouseProducts + returnProductsItem.quantity,
          }
        );

        addRequisitionHistory({
          noOfBoxes: returnProductsItem.quantity,
          requisitionist: creator,
          category: dailySalesCategoryList.title,
          requisitionType: 'sales',
          requisitionEvent: 'returned',
          description: dailySalesCategoryList.description!
        });

      }
      return newReturnProductsItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create goods returned item for ${returnProductsItem.category} `, error);
        return null;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}



export async function createExpenseItem(expenseItem: ExpensesDetailType, creator: string, maxRetries = 1) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {

      const newExpenseItem = await saveExpenseItemToDB({
        creator: creator,
        paymentMode: expenseItem.paymentMode,
        amount: expenseItem.amount,
        cash: expenseItem.cash,
        expenseDate: expenseItem.expenseDate,
        expenseType: expenseItem.expenseType,
        cheque: expenseItem.cheque,
        description: expenseItem.description,
        momo: expenseItem.momo,
        vehicle: expenseItem.vehicle,
        bank: expenseItem.bank,
      });

        addRequisitionHistory({
          noOfBoxes: expenseItem.amount,
          requisitionist: creator,
          category: 'expense',
          requisitionType: expenseItem.expenseType,
          requisitionEvent: 'spent',
          description: expenseItem.description
        });


      return newExpenseItem;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.error(`Failed to create expense item for ${expenseItem.expenseType} `, error);
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

    return transactionList;
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

export async function createDailySalesProductList(list: TransactionProductDataParams, creator: string) {
  try {
    const transactionData = list.details;
    const successfulProducts: any[] = [];
    const failedProducts: { item: any; error: string }[] = [];

    // Process items sequentially to avoid race conditions
    for (const transactionDataItem of transactionData) {
      try {
        const result = await createDailySalesItem(transactionDataItem, creator);
        if (result) {
          successfulProducts.push(result);
        } else {
          failedProducts.push({
            item: transactionDataItem,
            error: 'Unknown error occurred'
          });
        }
      } catch (error) {
        console.error(`Failed to process item for category ${transactionDataItem.category}:`, error);
        failedProducts.push({
          item: transactionDataItem,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // If there were failures, you might want to handle them
    if (failedProducts.length > 0) {
      console.warn(`${failedProducts.length} items failed to process:`, failedProducts);
    }

    return successfulProducts;

  } catch (error) {
    console.log(error);
    throw error;
  }
}


export async function createOfficeSalesProductList(list: TransactionProductDataParams, creator: string) {
  try {
    const transactionData = list.details;
    const successfulProducts: any[] = [];
    const failedProducts: { item: any; error: string }[] = [];

    // Process items sequentially to avoid race conditions
    for (const transactionDataItem of transactionData) {
      try {
        // Fetch fresh category data for validation
        const category = await getProductionCategoryItemById(transactionDataItem.category!);
        
        if (!category) {
          throw new Error(`Category not found for ${transactionDataItem.category}`);
        }

        // Validate quantity against current warehouse stock
        if (transactionDataItem.quantity > category.totalWarehouseProducts) {
          throw new Error(
            `Cannot exceed available products limit for ${category.title}. ` +
            `Requested: ${transactionDataItem.quantity}, Available: ${category.totalWarehouseProducts}`
          );
        }

        const result = await createDailySalesItem(transactionDataItem, creator);
        if (result) {
          successfulProducts.push(result);
        } else {
          failedProducts.push({
            item: transactionDataItem,
            error: 'Unknown error occurred'
          });
        }
      } catch (error) {
        console.error(`Failed to process item for category ${transactionDataItem.category}:`, error);
        failedProducts.push({
          item: transactionDataItem,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // If there were failures, you might want to handle them
    if (failedProducts.length > 0) {
      console.warn(`${failedProducts.length} items failed to process:`, failedProducts);
    }

    return successfulProducts;

  } catch (error) {
    console.log(error);
    throw error;
  }
}



export async function createReturnedProductList(list: ReturnProductDataParams, creator: string) {
  try {
    const returnedProductsData = list.details;
    const successfulProducts: any[] = [];
    const failedProducts: { item: any; error: string }[] = [];
    
    // Process items sequentially to avoid race conditions
    for (const returnedDataItem of returnedProductsData) {
      try {
        const result = await createReturnProductsItem(returnedDataItem, creator);
        if (result) {
          successfulProducts.push(result);
        } else {
          failedProducts.push({
            item: returnedDataItem,
            error: 'Unknown error occurred'
          });
        }
      } catch (error) {
        console.error(`Failed to process returned item for category ${returnedDataItem.category}:`, error);
        failedProducts.push({
          item: returnedDataItem,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // If there were failures, you might want to handle them
    if (failedProducts.length > 0) {
      console.warn(`${failedProducts.length} items failed to process:`, failedProducts);
    }

    return successfulProducts;

  } catch (error) {
    console.log(error);
    throw error;
  }
}


export async function createExpenseList(list: ExpensesDataParams, creator: string) {
  try {
    const expenseData = list.details;
    const successfulExpenses: any[] = [];
    const failedExpenses: { item: any; error: string }[] = [];
    
    // Process items sequentially (though expenses don't have stock conflicts, keeping consistent pattern)
    for (const expenseDataItem of expenseData) {
      try {
        const result = await createExpenseItem(expenseDataItem, creator);
        if (result) {
          successfulExpenses.push(result);
        } else {
          failedExpenses.push({
            item: expenseDataItem,
            error: 'Unknown error occurred'
          });
        }
      } catch (error) {
        console.error(`Failed to process expense item for ${expenseDataItem.expenseType}:`, error);
        failedExpenses.push({
          item: expenseDataItem,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // If there were failures, you might want to handle them
    if (failedExpenses.length > 0) {
      console.warn(`${failedExpenses.length} items failed to process:`, failedExpenses);
    }

    return successfulExpenses;

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