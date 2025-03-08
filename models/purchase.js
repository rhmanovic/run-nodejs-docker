const mongoose = require('mongoose');

// Counter Schema for purchase numbers
const PurchaseCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

const PurchaseCounter = mongoose.model('PurchaseCounter', PurchaseCounterSchema);

const PurchaseSchema = new mongoose.Schema({
  locked: { type: Boolean, default: false },
  purchase_number: { type: Number },
  vendorName: { type: String },
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      productName: { type: String, required: true },
      product_name_en: { type: String },
      product_name_ar: { type: String },
      variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      variantName: { type: String },
      v_name_en: { type: String },
      v_name_ar: { type: String },
      warranty: { type: String },
      brandName: { type: String },
      productImage: { type: String },
      price: { type: Number, required: true },
        purchase_price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      note: { type: String }
    }
  ],
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  totalCost: { type: Number, required: true },
    notes: { type: String },
  status: { type: String, enum: ['new', 'processing', 'completed', 'canceled', 'returned'], default: 'new' },
  paymentStatus: { type: String, enum: ['paid', 'notpaid'], default: 'notpaid' },
  PaymentMethod: { type: String, default: '' },
  receivingStatus: { type: String, enum: ['pending', 'partial', 'received', 'return'], default: 'pending' },
  receivingDate: { type: Date },
  receivingName: { type: String },
  paymentDate: { type: Date },
  paymentName: { type: String },
  time: { type: Date, default: Date.now }
});

// Pre-save middleware to auto-increment purchase_number
PurchaseSchema.pre('save', async function(next) {
  if (this.isNew) {
    const doc = this;
    const counterId = `purchaseNumber_${doc.merchant}`;
    try {
      const cnt = await PurchaseCounter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      doc.purchase_number = cnt.seq;
      next();
    } catch (error) {
      return next(error);
    }
  } else {
    next();
  }
});

const Purchase = mongoose.model('Purchase', PurchaseSchema);
module.exports = Purchase;