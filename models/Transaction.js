const mongoose = require('mongoose');

// Transaction Schema
const TransactionSchema = new mongoose.Schema({
  transaction_sr_number: { type: Number },  // Sequential number for each merchant
  transaction_ref: { type: String, unique: true },  // Unique transaction reference generated globally
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  order_number: { type: Number },  // Order number
  amount: { type: Number, required: true },  // Transaction amount
  fee: { type: Number, default: 0 },  // Fee associated with the transaction
  paymentMethod: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant.paymentMethods', required: true },
  balance: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant.balances', required: true },
  type: { type: String, enum: ['inflow', 'outflow'], required: true },  // Inflow or outflow
  status: { type: String, enum: ['pending', 'completed', 'canceled'], default: 'pending' },
  date: { type: Date, default: Date.now },
  description: { type: String, default: '' },
  purchase: { type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' },  // Link to the Purchase document
  purchase_number: { type: Number }  // Store the purchase_number in the transaction schema
});

// Pre-save hook to generate `transaction_ref`, `transaction_sr_number`, and set `purchase_number`
TransactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    const doc = this;

    try {
      // Fetch the associated Purchase document
      const purchase = await mongoose.model('Purchase').findById(doc.purchase);

      if (purchase) {
        // Set the purchase_number in the transaction
        doc.purchase_number = purchase.purchase_number;

        // Generate the `transaction_ref` using global counter
        const globalCounter = await GlobalTransactionCounter.findOneAndUpdate(
          {},
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        doc.transaction_ref = `TXN-${String(globalCounter.seq).padStart(8, '0')}`;  // Globally incremented reference (TXN-00000001)

        // Generate the `transaction_sr_number` based on the merchant's counter
        const merchantCounter = await MerchantTransactionCounter.findOneAndUpdate(
          { _id: doc.merchant },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        doc.transaction_sr_number = merchantCounter.seq;  // Merchant-specific sequential number

        next();  // Proceed with saving the document
      } else {
        return next(new Error('Purchase not found'));
      }
    } catch (error) {
      return next(error);  // Handle any errors during the save process
    }
  } else {
    next();  // If not a new document, skip the increment
  }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
module.exports = Transaction;
