const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { Merchant, Category, Order, Product, Branch, Customer, Offer, CashTransaction, Balance, Subuser, Purchase } = require("./models");



router.get('/', async (req, res) => {
  try {
    const { mobile, invoice } = req.query;

     // console.log("mobile");

    if (!mobile || !invoice) {
      return res.status(400).json({ error: 'Mobile and Invoice are required' });
    }

    const order = await Order.findOne({ phone: mobile, order_number: invoice });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:merchantId', async (req, res) => {
  const { merchantId } = req.params;

  try {
    // ✅ Fetch orders for the merchant
    const orders = await Order.find({ merchant: merchantId }).sort({ _id: -1 });

    // ✅ Fetch the merchant to retrieve balances
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant not found" });
    }

    // ✅ Extract balances (shop balance and others)
    const shopBalance = merchant.shopBalance ?? 0;
    const balances = merchant.balances ?? [];

    res.status(200).json({ 
      success: true, 
      orders,
      shopBalance,   // ✅ Include shop balance
      balances       // ✅ Include dynamic balances
    });

  } catch (error) {
    console.error('Error fetching orders and balances:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});





router.post('/search', async (req, res) => {
  const { phone, merchantId } = req.body;

  if (!phone || !merchantId) {
    return res.status(400).json({ success: false, message: 'Phone number and merchant ID are required' });
  }

  try {
    const orders = await Order.find({ phone, merchant: merchantId }).exec();

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found for this phone number and merchant ID' });
    }

    return res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ success: false, message: 'Error fetching orders' });
  }
});


// In your server-side routes file
router.post("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = req.body;

    const order = await Order.findByIdAndUpdate(id, updatedOrder, { new: true });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.status(200).json({ success: true, message: "Order updated successfully", order });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ success: false, message: "Error updating order" });
  }
});


router.post('/:orderId/status', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let order;

  try {
    const { orderId } = req.params;
    const { status, paymentMethod, merchant_id } = req.body;

    console.log(req.body)

    // 1️⃣ Lock the order
    order = await lockOrder(orderId, session);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found or currently being processed' });

    // 2️⃣ Validate status transition
    if (!isValidStatusTransition(order.status, status)) {
      return res.status(401).json({ success: false, message: `Invalid status transition from ${order.status} to ${status}` });
    }

    // ⏭️ If canceling, only update the order status and skip further processing
    if (status === 'canceled') {
      const updatedOrder = await updateOrderStatus(orderId, order.version, status, session);
      if (!updatedOrder) return res.status(409).json({ success: false, message: 'Order was modified by another request. Please try again.' });

      await session.commitTransaction();
      return res.status(200).json({ success: true, message: 'Order canceled successfully', order: updatedOrder });
    }

    // 3️⃣ Get merchant balance & payment method
    const { success, message, balance, paymentMethodData } = await getMerchantPaymentDetails(merchant_id, paymentMethod, session);
    if (!success) return res.status(400).json({ success: false, message });

    // 4️⃣ Update merchant balance
    const updatedMerchant = await updateMerchantBalance(merchant_id, balance, order.total, status, session);
    if (!updatedMerchant) return res.status(400).json({ success: false, message: "Balance update failed" });

    // 5️⃣ Update stock quantities
    await updateStockQuantities(order.items, status, order, session);

    // 6️⃣ Update order status
    const updatedOrder = await updateOrderStatus(orderId, order.version, status, session);
    if (!updatedOrder) return res.status(409).json({ success: false, message: 'Order was modified by another request. Please try again.' });

    // 7️⃣ Create cash transaction record
    await recordCashTransaction(order, paymentMethod, paymentMethodData, balance, status, session);

    await session.commitTransaction();
    return res.status(200).json({ success: true, message: 'Order status updated successfully', order: updatedOrder });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating order status:', error);
    return res.status(500).json({ success: false, message: 'Error updating order status', error: error.message });
  } finally {
    session.endSession();
  }
});

async function lockOrder(orderId, session) {
  return await Order.findOneAndUpdate(
    { _id: orderId, locked: false },
    { $set: { locked: true } },
    { new: true, session }
  ).select('status items total merchant order_number version locked');
}

function isValidStatusTransition(currentStatus, newStatus) {
  const validTransitions = {
    canceled: ['new', 'processing'],
    returned: ['new', 'processing'],
    completed: ['new', 'processing']
  };
  return validTransitions[newStatus] && validTransitions[newStatus].includes(currentStatus);
}

async function getMerchantPaymentDetails(merchant_id, paymentMethod, session) {
  const merchant = await Merchant.findOne({ _id: merchant_id, "paymentMethods._id": paymentMethod }).session(session);
  if (!merchant) return { success: false, message: 'Merchant not found' };

  const paymentMethodData = merchant.paymentMethods.find(pm => pm._id.toString() === paymentMethod);
  if (!paymentMethodData) return { success: false, message: 'Payment method not found' };

  const balance = merchant.balances.find(b => b._id.toString() === paymentMethodData.balance.toString());
  if (!balance) return { success: false, message: 'Balance not found' };

  return { success: true, balance, paymentMethodData };
}

async function updateMerchantBalance(merchant_id, balance, orderTotal, status, session) {
  return await Merchant.findOneAndUpdate(
    { _id: merchant_id, "balances._id": balance._id },
    { $inc: { "balances.$.balance": status === 'completed' ? orderTotal : -orderTotal } },
    { new: true, session }
  );
}

async function updateStockQuantities(items, status, order, session) {
  const changeSource = status === 'completed' ? 'Sell Order Completed / إتمام طلب بيع' : 'Sell Order Return / ارجاع طلب بيع';

  for (const item of items) {
    // Get product document

    // todo delete
    const changeSource = status === 'completed' ? 'Sell Order Completed / إتمام طلب بيع' : 'Sell Order Return / ارجاع طلب بيع';

    const product = await Product.findById(item.productId).session(session);
    if (!product) continue;

    // Get previous stock
    const previousStock = product.Stock;

    // Calculate new stock
    const newStock = status === 'completed' ? previousStock - item.quantity : previousStock + item.quantity;

    // Update stock quantity and log the transaction
    await Product.findByIdAndUpdate(
      item.productId,
      { 
        $set: {
          Stock: newStock,
          tempLog: { changeSource } // todo delete
        },

        
       
        
        $push: {
          productLogs: {
            date: new Date(),
            orderNumber: order.order_number,
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



async function updateOrderStatus(orderId, orderVersion, status, session) {
  return await Order.findOneAndUpdate(
    { _id: orderId, version: orderVersion },
    { $set: { status, locked: false }, $inc: { version: 1 } },
    { new: true, session }
  );
}

async function recordCashTransaction(order, paymentMethod, paymentMethodData, balance, status, session) {
  const cashTransaction = new CashTransaction({
    merchant: order.merchant,
    order: order._id,
    order_number: order.order_number,
    amount: order.total,
    method_id: paymentMethod,
    method_name: paymentMethodData.name,
    balance_id: balance._id,
    balance_name: balance.name,
    type: status === 'completed' ? 'inflow' : 'outflow',
    status: 'completed',
    balanceBefore: balance.balance,
    balanceAfter: status === 'completed' ? balance.balance + order.total : balance.balance - order.total,
    description: `Order #${order.order_number} ${status}`
  });

  await cashTransaction.save({ session });
}

async function logTransaction(productId, orderNumber, quantity, stockBefore, stockAfter, price, cost, status) {
  try {
    const reason = status === 'completed' 
      ? "Order Completed / إتمام الطلب" 
      : "Order Returned / إرجاع الطلب";

    await Product.findByIdAndUpdate(
      productId,
      {
        $push: {
          transactionLogs: {
            orderNumber,
            quantity,
            stockBefore,
            stockAfter,
            price,
            cost,
            status,
            reason,
          },
        },
      }
    );
    console.log(`Transaction logged for Product ${productId}, Order #${orderNumber} (${status})`);
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
}



module.exports = router;