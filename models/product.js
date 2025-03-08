var mongoose = require("mongoose");
var bcrypt = require("bcryptjs");

// Counter Schema to keep track of the last number used for product IDs
var CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

var Counter = mongoose.model('Counter', CounterSchema);

var productLogsSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now }, // When the transaction happened
  orderNumber: { type: String}, // Order reference
  purchaseNumber: { type: String}, // Order reference
  quantity: { type: Number }, // Change in stock
  stockBefore: { type: Number}, // Stock before change
  stockAfter: { type: Number }, // Stock after change
  salePrice: { type: Number }, // Sale price of the item
  cost: { type: Number }, // Cost at the time of transaction
  status: { type: String, enum: ["completed", "returned", "manual", "received", "return"]}, // Type of transaction
  note: { type: String }


});


// Variation Schema as a sub-document
var VariationSchema = new mongoose.Schema({
  v_name_ar: { type: String, required: true },
  v_name_en: { type: String, required: true },
  v_sale_price: { type: Number, required: true },
  v_purchase_price: { type: Number },
  v_available_quantity: { type: Number, default: 0 },
  v_warehouse_stock: { type: Number, default: 0 },
  v_barcode: { type: String },
  v_purchase_limit: { type: Number, default: null },
  v_brand: { type: String, default: '' },
  v_original_id: { type: mongoose.Schema.Types.ObjectId, default: null },
  v_show: { type: Boolean, default: true },
  v_warranty: { type: String, default: '' },
  variantLogs: [productLogsSchema] // ✅ Added logs for variations
});

// Inventory Schema for managing product inventory in batches
var InventorySchema = new mongoose.Schema({
  batchId: { type: mongoose.Types.ObjectId, required: true },
  purchasePrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  addedDate: { type: Date, default: Date.now }
});




// Main Product Schema
var ProductSchema = new mongoose.Schema({
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant' },
  product_number: { type: Number },
  category_number: { type: Number, required: true },
  product_name_en: { type: String, required: true },
  product_name_ar: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String, default: '' },
  warranty: { type: String, default: '' },
  order_command: { type: Number, default: 0 },
  weight: { type: String, default: 0 },
  keywords: { type: String, default: '' },
  product_image: { type: String, default: '' },
  product_images: [{ type: String }],
  youtube_video_id: { type: String, default: '' },
  description_ar: { type: String, default: '' },
  description_en: { type: String, default: '' },
  sale_price: { type: Number },
  purchase_price: { type: Number },
  purchase_limit: { type: Number, default: null },
  barcode: { type: String, default: '' },
  barcodes: [{ type: String }],
  pdt_discount_type: { type: String, enum: ['percentage', 'quantity', 'nodiscount'] },
  pdt_discount: { type: Number, min: 0, max: 99 },
  variations: [VariationSchema],
  Stock: { type: Number, default: 0 },
  warehouse_stock: { type: Number, default: 0 },
  latest_COGS: { type: Number, default: 0 },
  latest_FIFO: { type: Number, default: 0 }, // Stores the latest FIFO-based cost
  inventory: [InventorySchema], // Added inventory field
  options: { type: Boolean, default: false },
  standard_sizes: { type: Boolean, default: false },
  status: {
    type: Boolean,
    required: true,
    default: true
  },
  product_type: { type: String, enum: ['Simple', 'Complex'], default: 'Simple' },
  logs: [
    {
      date: { type: Date, default: Date.now }, // Timestamp of the stock change
      stockBefore: { type: String }, // Previous stock value as a string
      stockAfter: { type: String }, // Updated stock value as a string
      changeSource: { type: String }, // Log the source of the change
      
      context: { type: Object }, // Additional metadata (e.g., { orderNumber, userId })

    },
    
  ],
  tempLog: {
    changeSource: { type: String, default: '' }, // Source of the change

    context: { type: Object, default: '' }, // Additional metadata (e.g., { orderNumber, userId })
  },
    productLogs: [productLogsSchema] // ✅ Corrected definition

});




ProductSchema.pre('save', async function (next) {
  if (this.isNew) {
    console.log("Pre-save middleware triggered for new product.");

    const doc = this;
    const counterId = `productNumber_${doc.merchant}`;

    try {
      // Auto-increment the product_number
      const cnt = await Counter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      doc.product_number = cnt.seq;

      // Create an initial log for the new product
      const initialLog = {
        date: new Date(),
        stockBefore: "0", // Default initial stock
        stockAfter: doc.Stock.toString(), // Initial stock value after creation
        changeSource: "Product Creation / إنشاء المنتج", // Indicate this is a creation event
        context: {
          merchantId: doc.merchant,
          productNumber: doc.product_number,
          reason: "New product created / تم إنشاء منتج جديد",
        },
      };

      // Push the initial log to the logs array
      if (!doc.logs) {
        doc.logs = []; // Ensure logs array exists
      }
      doc.logs.push(initialLog);

      console.log(
        `Product created with product_number: ${doc.product_number}, initial log added. Categore no: ${doc.category_number}`
      );
      next();
    } catch (error) {
      console.error("Error in pre-save middleware:", error);
      return next(error);
    }
  } else {
    next();
  }
});


// Static method to update latest COGS
ProductSchema.statics.updateLatestCOGS = async function (productId, cogsValue) {
  try {
    await this.findByIdAndUpdate(productId, { latest_COGS: cogsValue });
  } catch (error) {
    throw new Error('Failed to update latest COGS: ' + error.message);
  }
};

// Static method to insert products with auto-increment
ProductSchema.statics.insertManyWithAutoIncrement = async function (docs, merchantId) {
  const counterId = `productNumber_${merchantId}`;

  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: docs.length } },
      { new: true, upsert: true }
    );

    let currentSeq = counter.seq - docs.length + 1;

    docs.forEach((doc) => {
      doc.product_number = currentSeq++;
    });

    return await this.insertMany(docs);
  } catch (error) {
    throw new Error('Failed to increment product numbers: ' + error.message);
  }
};











const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
