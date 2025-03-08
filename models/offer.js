const mongoose = require('mongoose');

// Define OfferCounter Schema
const OfferCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Unique identifier for the counter
  seq: { type: Number, default: 0 }       // Sequence number
});

// Create the OfferCounter model
const OfferCounter = mongoose.model('OfferCounter', OfferCounterSchema);

// Define Offer Schema
const OfferSchema = new mongoose.Schema({
  offer_number: { type: Number }, // Auto-incrementing offer number
  offer_name_ar: {
    type: String,
    required: true,
    trim: true
  },
  offer_name_en: {
    type: String,
    required: true,
    trim: true
  },
  offer_image: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',  // Reference to the Product model
    required: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'  // Reference to the Category model
  }], // Updated to support multiple categories
  original_price: {
    type: Number,
    required: true
  },
  discounted_price: {
    type: Number,
    required: true
  },
  offer_quantity: {
    type: Number,
    required: true
  },
  status: {
    type: Boolean,
    default: true // true for active offers, false for inactive
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  description_ar: {
    type: String,
    required: false,
    trim: true
  },
  description_en: {
    type: String,
    required: false,
    trim: true
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId, // Use ObjectId to reference another document
    ref: 'Merchant', // Reference the Merchant model
    required: true
  }
});

// Pre-save hook to auto-increment offer_number
OfferSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const counterId = 'offer_number';  // ID for the Offer counter
      const cnt = await OfferCounter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.offer_number = cnt.seq;  // Assign the incremented offer_number
    } catch (error) {
      return next(error);
    }
  }

  // Update the updated_at field
  this.updated_at = Date.now();
  next();
});

// Create and export the Offer model
const Offer = mongoose.model('Offer', OfferSchema);
module.exports = Offer;
