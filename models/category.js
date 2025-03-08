const mongoose = require('mongoose');

// Define the schema for a category counter
const CategoryCounterSchema = new mongoose.Schema({
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true }, // Merchant-specific counter
  seq: { type: Number, default: 0 } // Sequence number for the merchant
});

// Define the schema for a category
const categorySchema = new mongoose.Schema({
  category_number: { type: Number }, // Auto-incremented or explicitly provided
  ArabicName: { type: String, required: true },
  EnglishName: { type: String, required: true },
  imgsrc: { type: String }, // URL or path to the image
  status: { type: Boolean, default: true },
  merchant: {
    type: mongoose.Schema.Types.ObjectId, // Use ObjectId to reference another document
    ref: 'Merchant', // Reference the Merchant model
    required: true
  },
  discountPerc: { type: Number, default: 0 }, // Default discount percentage
  sort: { type: Number, default: 0 } // Default sort value
});

// Embed the category counter model as a static function
categorySchema.statics.incrementCounter = async function (merchantId) {
  const CategoryCounter = mongoose.model('CategoryCounter', CategoryCounterSchema);

  // Find or create a counter for the specific merchant
  const counter = await CategoryCounter.findOneAndUpdate(
    { merchant: merchantId }, // Search by merchant ID
    { $inc: { seq: 1 } }, // Increment the sequence
    { new: true, upsert: true } // Create a new counter if not found
  );

  return counter.seq; // Return the new sequence number
};

// Pre-save hook to handle category_number logic
categorySchema.pre('save', async function (next) {
  if (this.isNew && !this.category_number) { // Only increment if category_number is not provided
    try {
      // Increment the counter for the specific merchant
      this.category_number = await this.constructor.incrementCounter(this.merchant);
    } catch (error) {
      return next(error);
    }
  } else if (this.isNew && this.category_number) {
    // Check for uniqueness of the provided category_number
    const existingCategory = await this.constructor.findOne({
      category_number: this.category_number,
      merchant: this.merchant
    });
    if (existingCategory) {
      return next(new Error('Category number already exists for this merchant'));
    }
  }

  next();
});

// Create a unique index to prevent duplicate category numbers per merchant
categorySchema.index({ category_number: 1, merchant: 1 }, { unique: true });

// Create the Category model
const Category = mongoose.model('Category', categorySchema);

module.exports = Category;