const mongoose = require('mongoose');
const Balance = require('./Balance'); // Import the Balance model
const Merchant = require('./merchant'); // ✅ Import Merchant model properly

// ✅ Transaction Counter Schema
const TransactionCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

// ✅ Define or reuse existing TransactionCounter model
const TransactionCounter = mongoose.models.TransactionCounter || mongoose.model('TransactionCounter', TransactionCounterSchema);

// ✅ Cash Transaction Schema
const CashTransactionSchema = new mongoose.Schema({
  transaction_number: { type: Number, default: Date.now },
  transaction_sr_number: { type: Number },
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  order_number: { type: Number },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },
  purchase_number: { type: Number },
  amount: { type: Number, required: true },

  method_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant.paymentMethods'}, // ✅ Store _id reference
  method_name: { type: String, required: true }, // ✅ Store method name explicitly


  balance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant.balances', required: true }, // ✅ Store affected balance ID
  balance_name: { type: String, required: true }, // ✅ Store affected balance name


  type: { type: String, enum: ['inflow', 'outflow'], required: true },
  source: { type: String, enum: ['shop', 'bank'] },
  status: { type: String, enum: ['pending', 'completed', 'canceled'], default: 'pending' },

  balanceBefore: { type: Number }, // ✅ Balance before transaction
  balanceAfter: { type: Number },  // ✅ Balance after transaction

  date: { type: Date, default: Date.now },
  description: { type: String, default: '' }
});

CashTransactionSchema.pre('save', async function (next) {
  if (this.isNew) {
    const doc = this;

    try {

      // ✅ If method_id is missing, set "يدوي" (Manual) and skip validation
      if (!doc.method_id) {
        doc.method_name = "يدوي"; // ✅ Manually set transaction
        return next();
      }
      
      // ✅ Fetch the merchant and ensure the payment method exists
      const merchant = await Merchant.findOne(
        { _id: doc.merchant, "paymentMethods._id": doc.method_id },
        { "paymentMethods.$": 1, balances: 1 }
      );

      if (!merchant || !merchant.paymentMethods.length) {
        return next(new Error("Invalid payment method ID for this merchant"));
      }

      // ✅ Get selected payment method
      const selectedPaymentMethod = merchant.paymentMethods[0];

      // ✅ Find the corresponding balance
      const matchingBalance = merchant.balances.find(
        (b) => b._id.toString() === selectedPaymentMethod.balance.toString()
      );

      if (!matchingBalance) {
        return next(new Error("No matching balance found for the payment method"));
      }

      // ✅ Store correct balance ID & method name
      doc.source = matchingBalance._id;
      doc.method_name = selectedPaymentMethod.name;  // ✅ Store payment method name

      next();
    } catch (error) {
      return next(error);
    }
  } else {
    next();
  }
});



// ✅ Post-save middleware to update balance in `balances`
CashTransactionSchema.post('save', async function (transaction) {
  if (transaction.status === 'completed') {
    try {
      // ✅ Find the merchant and correct balance using `method_id`
      const merchant = await mongoose.model('Merchant').findById(transaction.merchant).select('balances');
      if (!merchant || !merchant.balances.length) {
        console.error('Merchant balances not found');
        return;
      }

      const balanceIndex = merchant.balances.findIndex(b => b._id.equals(transaction.method_id));
      if (balanceIndex === -1) {
        console.error('Matching balance entry not found for method_id:', transaction.method_id);
        return;
      }

      // ✅ Update balance
      merchant.balances[balanceIndex].balance = transaction.balanceAfter;
      await merchant.save();
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }
});

// ✅ Define or reuse existing CashTransaction model
const CashTransaction = mongoose.models.CashTransaction || mongoose.model('CashTransaction', CashTransactionSchema);

module.exports = CashTransaction;
