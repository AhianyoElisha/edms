import { databases } from "../appwrite.config";
import { appwriteConfig } from './../appwrite.config';

type PaymentData = {
  orderId: string;
  customerId: string;
  paymentAmount: number;
  paymentBreakdown: {
    cash: number;
    bank: number;
    momo: number;
    cheque: number;
  };
  currentOrderTotal: number;
  existingPayments: {
    cash: number;
    bank: number;
    momo: number;
    cheque: number;
  };
}

export async function processCustomerPayment(paymentData: PaymentData) {
  try {
    // Calculate new payment totals
    const newCashTotal = paymentData.existingPayments.cash + paymentData.paymentBreakdown.cash;
    const newBankTotal = paymentData.existingPayments.bank + paymentData.paymentBreakdown.bank;
    const newMomoTotal = paymentData.existingPayments.momo + paymentData.paymentBreakdown.momo;
    const newChequeTotal = paymentData.existingPayments.cheque + paymentData.paymentBreakdown.cheque;
    
    const totalPaymentsReceived = newCashTotal + newBankTotal + newMomoTotal + newChequeTotal;
    const remainingBalance = paymentData.currentOrderTotal - totalPaymentsReceived;
    
    // Determine new payment status
    let newPaymentStatus = 'credit';
    if (remainingBalance <= 0) {
      newPaymentStatus = 'paid';
    } else if (totalPaymentsReceived > 0) {
      newPaymentStatus = 'partial';
    }

    // Update the transaction/order with new payment details - using the correct collection name
    const updatedOrder = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.orders, // Changed from orders to transactions
      paymentData.orderId,
      {
        cash: newCashTotal,
        bank: newBankTotal,
        momo: newMomoTotal,
        cheque: newChequeTotal,
        paymentStatus: newPaymentStatus
      }
    );

    // Update customer debt if customer exists
    if (paymentData.customerId) {
      try {
        // Get current customer data
        const customer = await databases.getDocument(
          appwriteConfig.database,
          appwriteConfig.customers,
          paymentData.customerId
        );

        // Calculate new debt amount - only reduce debt by the new payment amount
        const currentDebt = customer.debt || 0;
        const newDebt = Math.max(0, currentDebt - paymentData.paymentAmount);

        // Calculate new total spent - add the new payment amount
        const currentTotalSpent = customer.totalSpent || 0;
        const newTotalSpent = currentTotalSpent + paymentData.paymentAmount;

        // Update customer debt and totalSpent
        const updatedCustomer = await databases.updateDocument(
          appwriteConfig.database,
          appwriteConfig.customers,
          paymentData.customerId,
          {
            debt: newDebt,
            totalSpent: newTotalSpent
          }
        );

        console.log(`Customer debt updated: ${currentDebt} -> ${newDebt}`);
        console.log(`Customer total spent updated: ${currentTotalSpent} -> ${newTotalSpent}`);
        console.log(`Payment amount processed: ${paymentData.paymentAmount}`);

        return {
          success: true,
          order: updatedOrder,
          customer: updatedCustomer,
          paymentAmount: paymentData.paymentAmount,
          newPaymentStatus,
          remainingBalance: Math.max(0, remainingBalance),
          customerDebtReduction: currentDebt - newDebt
        };

      } catch (customerError) {
        console.error('Error updating customer debt:', customerError);
        // Throw here since customer debt update is critical for the payment process
        throw new Error('Failed to update customer debt after payment processing');
      }
    }

    return {
      success: true,
      order: updatedOrder,
      paymentAmount: paymentData.paymentAmount,
      newPaymentStatus,
      remainingBalance: Math.max(0, remainingBalance)
    };

  } catch (error) {
    console.error('Error processing customer payment:', error);
    throw error;
  }
}

export async function getCustomerPaymentHistory(customerId: string) {
  try {
    // Get all transactions for this customer using the correct collection name
    const orders = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.orders, // Changed from orders to transactions
      [
        // Add query to filter by customer ID if your transactions have a customers relationship
        // Query.equal('customers', customerId)
      ]
    );

    return orders;
  } catch (error) {
    console.error('Error fetching customer payment history:', error);
    throw error;
  }
}

export async function getCustomerDebtSummary(customerId: string) {
  try {
    // Get customer data
    const customer = await databases.getDocument(
      appwriteConfig.database,
      appwriteConfig.customers,
      customerId
    );

    // Get all unpaid/partial transactions for this customer
    const unpaidOrders = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.orders, // Changed from orders to transactions
      [
        // Add queries to filter unpaid transactions for this customer if relationship exists
        // Query.equal('customers', customerId),
        // Query.notEqual('paymentStatus', 'paid')
      ]
    );

    return {
      customer,
      totalDebt: customer.debt || 0,
      totalSpent: customer.totalSpent || 0,
      unpaidOrders: unpaidOrders.documents
    };
  } catch (error) {
    console.error('Error fetching customer debt summary:', error);
    throw error;
  }
}

// Helper function to manually calculate and update customer debt based on all their transactions
export async function recalculateCustomerDebt(customerId: string) {
  try {
    // Get all transactions for this customer
    const transactions = await databases.listDocuments(
      appwriteConfig.database,
      appwriteConfig.orders,
      [
        // Query.equal('customers', customerId) // Uncomment if you have this relationship
      ]
    );

    // Calculate total debt from unpaid/partial transactions
    let totalDebt = 0;
    let totalSpent = 0;

    transactions.documents.forEach((transaction: any) => {
      if (transaction.customers === customerId) { // Check if transaction belongs to customer
        const totalPrice = transaction.totalPrice || 0;
        const cashPaid = transaction.cash || 0;
        const bankPaid = transaction.bank || 0;
        const momoPaid = transaction.momo || 0;
        const chequePaid = transaction.cheque || 0;
        
        const totalPaid = cashPaid + bankPaid + momoPaid + chequePaid;
        const outstandingAmount = totalPrice - totalPaid;
        
        // Add to debt if there's an outstanding amount
        if (outstandingAmount > 0) {
          totalDebt += outstandingAmount;
        }
        
        // Add paid amount to total spent
        totalSpent += totalPaid;
      }
    });

    // Update customer with calculated values
    const updatedCustomer = await databases.updateDocument(
      appwriteConfig.database,
      appwriteConfig.customers,
      customerId,
      {
        debt: totalDebt,
        totalSpent: totalSpent
      }
    );

    return {
      customerId,
      oldDebt: 0, // We don't have the old value here
      newDebt: totalDebt,
      totalSpent: totalSpent,
      transactionsProcessed: transactions.documents.length
    };

  } catch (error) {
    console.error('Error recalculating customer debt:', error);
    throw error;
  }
}
