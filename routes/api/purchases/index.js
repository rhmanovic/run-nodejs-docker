const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { Merchant, Category, Order, Product, Branch, Customer, Offer, CashTransaction, Balance, Subuser, Purchase } = require("./models");

router.post('/:purchaseId/receiving-status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("=== Purchase Receiving Status Update ===");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);

    const { purchaseId } = req.params;
    const { newStatus } = req.body;

    // 1️⃣ Fetch the purchase BEFORE checking the status transition ✅
    console.log("🔍 Fetching purchase with ID:", purchaseId);
    let purchase = await Purchase.findById(purchaseId).populate('items.productId'); // Ensure items are loaded

    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    console.log("Current purchase status:", purchase.receivingStatus);

    // 2️⃣ Validate the status transition ✅
    console.log("🔍 Validating status transition:", newStatus);
    if (!isValidPurchaseStatusTransition(purchase.receivingStatus, newStatus)) {
      await session.abortTransaction();
      return res.status(403).json({ 
        success: false, 
        message: `Invalid status transition from ${purchase.receivingStatus} to ${newStatus}` 
      });
    }

    // 3️⃣ Lock the purchase order ✅
    console.log("🔒 Locking purchase order with ID:", purchaseId);
    const lockedPurchase = await lockPurchase(purchaseId, session);
    if (!lockedPurchase) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Purchase order not found or already processed' });
    }

    // 4️⃣ Update stock and inventory ✅
    console.log("📦 Updating stock and inventory for status:", newStatus);
    await updatePurchaseStock(purchase.items, newStatus, purchase, session);

    // 5️⃣ Update purchase status ✅
    const updatedPurchase = await updatePurchaseStatus(purchaseId, newStatus, session);
    if (!updatedPurchase) {
      console.error('⚠️ Error: Purchase was modified by another request.');
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Purchase modified by another request. Try again.' });
    }

    // ✅ Commit transaction
    await session.commitTransaction();
    console.log(`✅ Purchase ${newStatus} processed successfully!`);

    return res.status(200).json({ 
      success: true, 
      message: `Purchase ${newStatus} updated successfully`, 
      purchase: updatedPurchase 
    });

  } catch (error) {
    await session.abortTransaction();

    console.error("❌ Error updating purchase status:", error);
    console.error("🔍 Error Details:", {
      message: error.message,
      stack: error.stack, // Full error stack trace
    });

    return res.status(500).json({ 
      success: false, 
      message: 'Error updating purchase status', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
});

// ✅ Lock purchase before modification
async function lockPurchase(purchaseId, session) {
  return await Purchase.findOneAndUpdate(
    { _id: purchaseId, locked: false },
    { $set: { locked: true } },
    { new: true, session }
  ).select('receivingStatus items purchaseNumber version locked');
}

// ✅ Validate status transition
function isValidPurchaseStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    pending: ['received', 'return'], // Can move from 'pending' to either 'received' or 'return'
    received: ['return'], // Can return after being received
    return: [] // Cannot be changed once returned
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// ✅ Update stock and inventory
async function updatePurchaseStock(items, status, purchase, session) {
  const changeSource = status === 'received' ? 'Purchase Received / استلام مبيعات' : 'Purchase Returned / ارجاع مبيعات';

  for (const item of items) {
    const product = await Product.findById(item.productId).session(session);
    if (!product) continue;

    const previousStock = product.Stock;
    let newStock;

    if (status === 'received') {
      // ✅ Increase stock
      newStock = previousStock + item.quantity;

      // ✅ Add inventory entry (RECEIVED)
      const newInventoryEntry = {
        batchId: new mongoose.Types.ObjectId(),
        purchasePrice: item.purchase_price,
        quantity: item.quantity,
        addedDate: new Date(),
      };

      product.inventory.push(newInventoryEntry);

    } else if (status === 'return') {
      // ✅ Decrease stock
      newStock = previousStock - item.quantity;

      // ✅ Remove inventory entry (RETURN)
      const removedInventoryEntry = {
        batchId: new mongoose.Types.ObjectId(),
        purchasePrice: item.purchase_price,
        quantity: -item.quantity, // Negative quantity for return
        addedDate: new Date(),
      };

      product.inventory.push(removedInventoryEntry);
    }

    // ✅ Update product stock & logs
    await Product.findByIdAndUpdate(
      item.productId,
      {
        $set: { Stock: newStock },
        $push: {
          productLogs: {
            date: new Date(),
            purchaseNumber: purchase.purchase_number,
            quantity: item.quantity,
            stockBefore: previousStock,
            stockAfter: newStock,
            salePrice: item.sale_price,
            cost: item.purchase_price,
            status: status
          }
        }
      },
      { session }
    );
  }
}


// ✅ Update purchase status
async function updatePurchaseStatus(purchaseId, status, session) {
  return await Purchase.findOneAndUpdate(
    { _id: purchaseId },
    { $set: { receivingStatus: status, locked: false } },
    { new: true, session }
  );
}







router.post('/:purchaseId/payment-status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("=== Purchase Payment Update ===");
    console.log("Request params:", req.params);
    console.log("Request body:", req.body);

    const { purchaseId } = req.params;
    const { paymentStatus, paymentMethod } = req.body;

    // 1️⃣ Fetch the purchase ✅
    console.log("🔍 Fetching purchase with ID:", purchaseId);
    const purchase = await Purchase.findById(purchaseId).session(session);

    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    console.log("Current receiving status:", purchase.receivingStatus);
    console.log("Current payment status:", purchase.paymentStatus);

    // 2️⃣ Validate payment status transition including receivingStatus ✅
    const validation = isValidPaymentStatusTransition(purchase.paymentStatus, paymentStatus, purchase.receivingStatus);
    if (!validation.valid) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: validation.message });
    }

    // 3️⃣ Get merchant & payment method details ✅
    const { success, message, balance, paymentMethodData } = await getMerchantPaymentDetails(purchase.merchant, paymentMethod, session);
    if (!success) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message });
    }

    console.log("💵 Payment method details:", paymentMethodData);

    // 4️⃣ Update balance ✅
    const updatedMerchant = await updateMerchantBalance(purchase.merchant, balance, purchase.totalCost, purchase.receivingStatus, session);
    if (!updatedMerchant) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Balance update failed" });
    }

    // 5️⃣ Record cash transaction ✅
    await recordCashTransaction(purchase, paymentMethod, paymentMethodData, balance, session);

    // 6️⃣ Update purchase payment status ✅
    const updatedPurchase = await updatePurchasePaymentStatus(purchaseId, paymentStatus, paymentMethodData, session);
    if (!updatedPurchase) {
      console.error('⚠️ Error: Purchase was modified by another request.');
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Purchase modified by another request. Try again.' });
    }

    // ✅ Commit transaction
    await session.commitTransaction();
    console.log(`✅ Purchase Payment Updated Successfully!`);

    return res.status(200).json({ 
      success: true, 
      message: `Purchase payment status updated successfully`, 
      purchase: updatedPurchase 
    });

  } catch (error) {
    await session.abortTransaction();

    console.error("❌ Error updating purchase payment status:", error);
    console.error("🔍 Error Details:", {
      message: error.message,
      stack: error.stack, // Full error stack trace
    });

    return res.status(500).json({ 
      success: false, 
      message: 'Error updating purchase payment status', 
      error: error.message 
    });
  } finally {
    session.endSession();
  }
});


// ✅ Validate Payment Status Transition with receivingStatus check
function isValidPaymentStatusTransition(currentStatus, newStatus, receivingStatus) {
  const validTransitions = {
    notpaid: ['paid'],
    paid: [] // Cannot go back to notpaid
  };

  // 🚨 Block payment updates if receivingStatus is not 'received' or 'return'
  if (!['received', 'return'].includes(receivingStatus)) {
    return { valid: false, message: `Payment update is only allowed if receivingStatus is 'received' or 'return'. Current status: ${receivingStatus}` };
  }

  // ✅ Check if payment status transition is valid
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    return { valid: false, message: `Invalid payment status transition from ${currentStatus} to ${newStatus}` };
  }

  return { valid: true };
}


// ✅ Get Merchant & Payment Details
async function getMerchantPaymentDetails(merchantId, paymentMethod, session) {
  const merchant = await Merchant.findOne({ _id: merchantId, "paymentMethods._id": paymentMethod }, null, { session });
  if (!merchant) return { success: false, message: 'Merchant not found' };

  const paymentMethodData = merchant.paymentMethods.find(pm => pm._id.toString() === paymentMethod);
  if (!paymentMethodData) return { success: false, message: 'Payment method not found' };

  const balance = merchant.balances.find(b => b._id.toString() === paymentMethodData.balance.toString());
  if (!balance) return { success: false, message: 'Balance not found' };

  return { success: true, balance, paymentMethodData };
}

// ✅ Update Merchant Balance (Corrected Logic)
async function updateMerchantBalance(merchantId, balance, amount, receivingStatus, session) {
  return await Merchant.findOneAndUpdate(
    { _id: merchantId, "balances._id": balance._id },
    { $inc: { "balances.$.balance": receivingStatus === 'received' ? -amount : amount } }, // ✅ Based on receivingStatus
    { new: true, session }
  );
}

// ✅ Record Cash Transaction (Updated Logic)
async function recordCashTransaction(purchase, paymentMethod, paymentMethodData, balance, session) {
  const transactionType = purchase.receivingStatus === 'received' ? 'outflow' : 'inflow';

  const updatedBalanceAfter = transactionType === 'outflow' 
    ? balance.balance - purchase.totalCost  // Deduct for received purchase
    : balance.balance + purchase.totalCost; // Add for returned purchase

  const cashTransaction = new CashTransaction({
    merchant: purchase.merchant,
    purchase: purchase._id, 
    purchase_number: purchase.purchase_number, 
    amount: purchase.totalCost,
    method_id: paymentMethod,
    method_name: paymentMethodData.name,
    balance_id: balance._id,
    balance_name: balance.name,
    type: transactionType,  // ✅ Based on purchase.receivingStatus
    status: 'completed',
    balanceBefore: balance.balance,
    balanceAfter: updatedBalanceAfter, // ✅ Corrected Balance Calculation
    description: `Purchase #${purchase.purchase_number} - ${purchase.receivingStatus}`
  });

  await cashTransaction.save({ session });
}


// ✅ Update Purchase Payment Status & Store Payment Method Name
async function updatePurchasePaymentStatus(purchaseId, paymentStatus, paymentMethodData, session) {
  console.log("paymentMethodData.name", paymentMethodData.name)
  return await Purchase.findOneAndUpdate(
    { _id: purchaseId },
    { 
      $set: { 
        paymentStatus, 
        PaymentMethod: paymentMethodData.name // ✅ Store the payment method name, not just ID
      } 
    },
    { new: true, session }
  );
}






module.exports = router;
