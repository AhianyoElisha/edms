// Appwrite Imports
import { databases, storage } from '@/libs/appwrite.config'
import { appwriteConfig } from '@/libs/appwrite.config'
import { ID, Query } from 'appwrite'

// Type Imports
import type { 
  ExpenseType, 
  ExpenseInput, 
  ExpenseFilters,
  ExpenseTypeCategory,
  PaymentMethodType,
  PaymentStatusType
} from '@/types/apps/deliveryTypes'

/**
 * Get all expenses with optional filtering
 */
export async function getAllExpenses(filters?: ExpenseFilters): Promise<ExpenseType[]> {
  try {
    const queries: string[] = []

    if (filters) {
      if (filters.expenseType) {
        queries.push(Query.equal('expenseType', filters.expenseType))
      }
      if (filters.paymentStatus) {
        queries.push(Query.equal('paymentStatus', filters.paymentStatus))
      }
      if (filters.vehicleId) {
        queries.push(Query.equal('vehicleId', filters.vehicleId))
      }
      if (filters.tripId) {
        queries.push(Query.equal('tripId', filters.tripId))
      }
      if (filters.dateRange) {
        if (filters.dateRange.start) {
          queries.push(Query.greaterThanEqual('expenseDate', filters.dateRange.start))
        }
        if (filters.dateRange.end) {
          queries.push(Query.lessThanEqual('expenseDate', filters.dateRange.end))
        }
      }
      if (filters.search) {
        queries.push(Query.search('description', filters.search))
      }
    }

    queries.push(Query.orderDesc('expenseDate'))
    queries.push(Query.limit(600))

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      queries
    )

    // Parse additionalImages if stored as JSON string
    const expenses = response.documents.map((doc: any) => ({
      ...doc,
      additionalImages: doc.additionalImages 
        ? (typeof doc.additionalImages === 'string' ? JSON.parse(doc.additionalImages) : doc.additionalImages)
        : []
    }))

    return expenses as ExpenseType[]
  } catch (error) {
    console.error('Error fetching expenses:', error)
    throw new Error('Failed to fetch expenses')
  }
}

/**
 * Get a specific expense by ID
 */
export async function getExpenseById(expenseId: string): Promise<ExpenseType> {
  try {
    const expense = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId
    )

    // Parse additionalImages if stored as JSON string
    const parsedExpense = {
      ...expense,
      additionalImages: expense.additionalImages 
        ? (typeof expense.additionalImages === 'string' ? JSON.parse(expense.additionalImages) : expense.additionalImages)
        : []
    }

    return parsedExpense as unknown as ExpenseType
  } catch (error) {
    console.error('Error fetching expense:', error)
    throw new Error('Failed to fetch expense')
  }
}

/**
 * Get expenses for a specific vehicle
 */
export async function getExpensesByVehicle(vehicleId: string): Promise<ExpenseType[]> {
  try {
    const queries = [
      Query.equal('vehicleId', vehicleId),
      Query.orderDesc('expenseDate'),
      Query.limit(500)
    ]

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      queries
    )

    const expenses = response.documents.map((doc: any) => ({
      ...doc,
      additionalImages: doc.additionalImages 
        ? (typeof doc.additionalImages === 'string' ? JSON.parse(doc.additionalImages) : doc.additionalImages)
        : []
    }))

    return expenses as ExpenseType[]
  } catch (error) {
    console.error('Error fetching expenses by vehicle:', error)
    throw new Error('Failed to fetch expenses by vehicle')
  }
}

/**
 * Get expenses for a specific trip
 */
export async function getExpensesByTrip(tripId: string): Promise<ExpenseType[]> {
  try {
    const queries = [
      Query.equal('tripId', tripId),
      Query.orderDesc('expenseDate'),
      Query.limit(100)
    ]

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      queries
    )

    const expenses = response.documents.map((doc: any) => ({
      ...doc,
      additionalImages: doc.additionalImages 
        ? (typeof doc.additionalImages === 'string' ? JSON.parse(doc.additionalImages) : doc.additionalImages)
        : []
    }))

    return expenses as ExpenseType[]
  } catch (error) {
    console.error('Error fetching expenses by trip:', error)
    throw new Error('Failed to fetch expenses by trip')
  }
}

/**
 * Get pending expenses (not yet paid)
 */
export async function getPendingExpenses(): Promise<ExpenseType[]> {
  try {
    const queries = [
      Query.equal('paymentStatus', 'pending'),
      Query.orderAsc('expenseDate'), // Oldest first
      Query.limit(500)
    ]

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      queries
    )

    return response.documents as unknown as ExpenseType[]
  } catch (error) {
    console.error('Error fetching pending expenses:', error)
    throw new Error('Failed to fetch pending expenses')
  }
}

/**
 * Create a new expense
 */
export async function createExpense(
  expenseData: ExpenseInput,
  creator: string
): Promise<ExpenseType> {
  try {
    const expense = await databases.createDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      ID.unique(),
      {
        amount: expenseData.amount,
        totalAmount: expenseData.amount, // Keep both for compatibility
        expenseDate: expenseData.expenseDate,
        description: expenseData.description,
        expenseType: expenseData.expenseType,
        subCategory: expenseData.subCategory || null,
        vendor: expenseData.vendor || null,
        receiptNumber: expenseData.receiptNumber || null,
        vehicleId: expenseData.vehicleId || null,
        tripId: expenseData.tripId || null,
        paymentMethod: expenseData.paymentMethod || 'cash',
        paymentStatus: expenseData.paymentStatus || 'pending',
        isRecurring: expenseData.isRecurring || false,
        recurringFrequency: expenseData.recurringFrequency || null,
        creator
      }
    )

    return expense as unknown as ExpenseType
  } catch (error) {
    console.error('Error creating expense:', error)
    throw new Error('Failed to create expense')
  }
}

/**
 * Create expense with receipt image
 */
export async function createExpenseWithReceipt(
  expenseData: ExpenseInput,
  creator: string,
  receiptFile?: File,
  additionalFiles?: File[]
): Promise<ExpenseType> {
  try {
    // First create the expense
    const expense = await createExpense(expenseData, creator)

    // Upload receipt if provided
    if (receiptFile) {
      await uploadReceiptImage(expense.$id, receiptFile)
    }

    // Upload additional images if provided
    if (additionalFiles && additionalFiles.length > 0) {
      await uploadAdditionalImages(expense.$id, additionalFiles)
    }

    // Return updated expense
    return await getExpenseById(expense.$id)
  } catch (error) {
    console.error('Error creating expense with receipt:', error)
    throw new Error('Failed to create expense with receipt')
  }
}

/**
 * Update an expense
 */
export async function updateExpense(
  expenseId: string,
  updateData: Partial<ExpenseInput>
): Promise<ExpenseType> {
  try {
    const dataToUpdate: any = { ...updateData }

    // Keep totalAmount in sync with amount
    if (dataToUpdate.amount !== undefined) {
      dataToUpdate.totalAmount = dataToUpdate.amount
    }

    const expense = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId,
      dataToUpdate
    )

    return expense as unknown as ExpenseType
  } catch (error) {
    console.error('Error updating expense:', error)
    throw new Error('Failed to update expense')
  }
}

/**
 * Upload receipt image for an expense
 */
export async function uploadReceiptImage(
  expenseId: string,
  file: File
): Promise<string> {
  try {
    // Upload file to storage
    const uploadedFile = await storage.createFile(
      appwriteConfig.bucket,
      ID.unique(),
      file
    )

    // Update expense with file reference
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId,
      { receiptImage: uploadedFile.$id }
    )

    return uploadedFile.$id
  } catch (error) {
    console.error('Error uploading receipt image:', error)
    throw new Error('Failed to upload receipt image')
  }
}

/**
 * Upload additional images for an expense (multiple images)
 */
export async function uploadAdditionalImages(
  expenseId: string,
  files: File[]
): Promise<string[]> {
  try {
    const fileIds: string[] = []

    // Get existing additional images
    const expense = await getExpenseById(expenseId)
    const existingImages = Array.isArray(expense.additionalImages) 
      ? expense.additionalImages 
      : []

    // Upload each file
    for (const file of files) {
      const uploadedFile = await storage.createFile(
        appwriteConfig.bucket,
        ID.unique(),
        file
      )
      fileIds.push(uploadedFile.$id)
    }

    // Combine existing and new image IDs
    const allImageIds = [...existingImages, ...fileIds]

    // Update expense with all image references
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId,
      { additionalImages: JSON.stringify(allImageIds) }
    )

    return fileIds
  } catch (error) {
    console.error('Error uploading additional images:', error)
    throw new Error('Failed to upload additional images')
  }
}

/**
 * Remove a specific additional image from an expense
 */
export async function removeAdditionalImage(
  expenseId: string,
  fileId: string
): Promise<void> {
  try {
    // Get current expense
    const expense = await getExpenseById(expenseId)
    const currentImages = Array.isArray(expense.additionalImages) 
      ? expense.additionalImages 
      : []

    // Filter out the image to remove
    const updatedImages = currentImages.filter((id: string) => id !== fileId)

    // Delete file from storage
    try {
      await storage.deleteFile(appwriteConfig.bucket, fileId)
    } catch (fileError) {
      console.warn(`Failed to delete file ${fileId}:`, fileError)
    }

    // Update expense
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId,
      { additionalImages: JSON.stringify(updatedImages) }
    )
  } catch (error) {
    console.error('Error removing additional image:', error)
    throw new Error('Failed to remove additional image')
  }
}

/**
 * Remove receipt image from an expense
 */
export async function removeReceiptImage(expenseId: string): Promise<void> {
  try {
    // Get current expense
    const expense = await getExpenseById(expenseId)

    // Delete file from storage if exists
    if (expense.receiptImage) {
      try {
        await storage.deleteFile(appwriteConfig.bucket, expense.receiptImage)
      } catch (fileError) {
        console.warn(`Failed to delete receipt file:`, fileError)
      }
    }

    // Update expense
    await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId,
      { receiptImage: null }
    )
  } catch (error) {
    console.error('Error removing receipt image:', error)
    throw new Error('Failed to remove receipt image')
  }
}

/**
 * Mark expense as paid
 */
export async function markExpenseAsPaid(
  expenseId: string,
  paymentMethod?: PaymentMethodType
): Promise<ExpenseType> {
  try {
    const updateData: any = { paymentStatus: 'paid' }
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod
    }

    const expense = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId,
      updateData
    )

    return expense as unknown as ExpenseType
  } catch (error) {
    console.error('Error marking expense as paid:', error)
    throw new Error('Failed to mark expense as paid')
  }
}

/**
 * Approve an expense
 */
export async function approveExpense(
  expenseId: string,
  approverId: string
): Promise<ExpenseType> {
  try {
    const expense = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId,
      {
        approvedBy: approverId,
        approvalDate: new Date().toISOString()
      }
    )

    return expense as unknown as ExpenseType
  } catch (error) {
    console.error('Error approving expense:', error)
    throw new Error('Failed to approve expense')
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    // Get the expense first to check for associated files
    const expense = await getExpenseById(expenseId)

    // Collect all file IDs to delete
    const fileIds: string[] = []
    if (expense.receiptImage) fileIds.push(expense.receiptImage)
    if (Array.isArray(expense.additionalImages)) {
      fileIds.push(...expense.additionalImages)
    }

    // Delete associated files
    for (const fileId of fileIds) {
      try {
        await storage.deleteFile(appwriteConfig.bucket, fileId)
      } catch (fileError) {
        console.warn(`Failed to delete file ${fileId}:`, fileError)
      }
    }

    // Delete the expense document
    await databases.deleteDocument(
      appwriteConfig.database,
      appwriteConfig.expenses,
      expenseId
    )
  } catch (error) {
    console.error('Error deleting expense:', error)
    throw new Error('Failed to delete expense')
  }
}

/**
 * Get expense statistics for a date range
 */
export async function getExpenseStats(dateRange?: {
  start: string
  end: string
}): Promise<{
  totalExpenses: number
  expenseCount: number
  byType: Record<ExpenseTypeCategory, number>
  byStatus: Record<PaymentStatusType, number>
  avgExpense: number
}> {
  try {
    const queries: string[] = []

    if (dateRange) {
      if (dateRange.start) {
        queries.push(Query.greaterThanEqual('expenseDate', dateRange.start))
      }
      if (dateRange.end) {
        queries.push(Query.lessThanEqual('expenseDate', dateRange.end))
      }
    }

    queries.push(Query.limit(1000))

    const response = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.expenses,
      queries
    )

    const expenses = response.documents

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp: any) => sum + (exp.amount || exp.totalAmount || 0), 0)
    const expenseCount = expenses.length
    const avgExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0

    // Group by type
    const byType: Record<string, number> = {}
    expenses.forEach((exp: any) => {
      const type = exp.expenseType || 'other'
      byType[type] = (byType[type] || 0) + (exp.amount || exp.totalAmount || 0)
    })

    // Group by status
    const byStatus: Record<string, number> = {
      pending: 0,
      paid: 0,
      partial: 0
    }
    expenses.forEach((exp: any) => {
      const status = exp.paymentStatus || 'pending'
      byStatus[status] = (byStatus[status] || 0) + (exp.amount || exp.totalAmount || 0)
    })

    return {
      totalExpenses,
      expenseCount,
      byType: byType as Record<ExpenseTypeCategory, number>,
      byStatus: byStatus as Record<PaymentStatusType, number>,
      avgExpense
    }
  } catch (error) {
    console.error('Error getting expense stats:', error)
    throw new Error('Failed to get expense stats')
  }
}

/**
 * Get file URL for receipt or additional images
 */
export async function getExpenseImageUrl(fileId: string): Promise<string> {
  return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucket}/files/${fileId}/view?project=${appwriteConfig.project}`
}

/**
 * Get expense types list (for dropdowns)
 */
export async function getExpenseTypesList(): Promise<{ value: ExpenseTypeCategory; label: string }[]> {
  return [
    { value: 'fuel', label: 'Fuel' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'tools', label: 'Tools' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'vehicle_purchase', label: 'Vehicle Purchase' },
    { value: 'office', label: 'Office Supplies' },
    { value: 'salary', label: 'Salary/Wages' },
    { value: 'communication', label: 'Communication' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'trip_related', label: 'Trip Related' },
    { value: 'other', label: 'Other' }
  ]
}

/**
 * Get payment method list (for dropdowns)
 */
export async function getPaymentMethodsList(): Promise<{ value: PaymentMethodType; label: string }[]> {
  return [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit', label: 'Credit' }
  ]
}
