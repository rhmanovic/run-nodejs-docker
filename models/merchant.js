const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const merchantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  projectName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  subscription: {
    posEndDate: { type: Date, required: true, default: () => new Date(+new Date() + 30*24*60*60*1000) }, // Default 30 days from creation
    websiteEndDate: { type: Date, required: true, default: () => new Date(+new Date() + 30*24*60*60*1000) }, // Default 30 days from creation
  },
  password: { type: String, required: true },
  cashEnabled: { type: Boolean, default: false },
  knetEnabled: { type: Boolean, default: false },
  tapSettings: {
    liveAuthorization: { type: String, default: '' },
    testAuthorization: { type: String, default: '' },
    status: { type: Boolean, default: false }, // Status of the payment gateway (enabled/disabled)
    mode: { type: String, enum: ['live', 'test'], default: 'test' },
  },
  notifications: {
    newOrder: {
      merchantNotification: {
        enabled: { type: Boolean, default: false },
        text: {
          en: { type: String, default: 'Thank you for ordering from [[store_name]], your order number is: [[order_code]]' },
          ar: { type: String, default: 'شكراً لطلبك من [[store_name]]، كود الطلب هو [[order_code]]' },
        },
      },
      customerNotification: {
        enabled: { type: Boolean, default: false },
        text: {
          en: { type: String, default: 'Thank you for ordering from [[store_name]], your order number is: [[order_code]]' },
          ar: { type: String, default: 'شكراً لطلبك من [[store_name]]، كود الطلب هو [[order_code]]' },
        },
      },
      subUserNotification: {
        enabled: { type: Boolean, default: false },
        text: {
          en: { type: String, default: '' },
          ar: { type: String, default: '' },
        },
      },
    },
    orderStatusUpdate: {
      customerNotification: {
        enabled: { type: Boolean, default: false },
        text: {
          en: { type: String, default: 'Your order [[order_code]] has been updated with a new status. Current Status: [[current_order_status]]' },
          ar: { type: String, default: 'تم تحديث طلبك [[order_code]] بحالة جديدة. الوضع الحالي: [[current_order_status]]' },
        },
      },
    },
  },
  emailRecipients: [{ type: String, lowercase: true }],
  images: {
    ico: { type: String, default: '' },
    logo: { type: String, default: '' },
    logoAdditional: { type: String, default: '' },
    background: { type: String, default: '' },
    icoSecondary: { type: String, default: '' },
  },
  companyName: {
    ar: { type: String, default: '' }, // Arabic company name
    en: { type: String, default: '' }, // English company name
  },

  invoiceText: {
    en: { type: String, default: '' }, // Invoice text in English
    ar: { type: String, default: '' }, // Invoice text in Arabic
  },
  invoiceOptions: {
    showBrand: { type: Boolean, default: false },
    showWarranty: { type: Boolean, default: false },
    showVariantName: { type: Boolean, default: false },
  },

  // Balances field: unique identifier for each balance and its value
  balances: [{
    name: { type: String, required: true },  // Custom name for the balance (e.g., "Cash Box", "Bank Account", etc.)
    balance: { type: Number, default: 0 },   // The amount in that balance
  }],

  // Payment methods linked to balances
  paymentMethods: [{
    name: { type: String, required: true },  // Custom name for the payment method (e.g., "Cash", "Knet", etc.)
    fee: { type: Number, default: 0 },       // The value of the fee (can be fixed or percentage)
    feeType: { 
      type: String, 
      enum: ['fixed', 'percentage', 'no_fee'],  // 'fixed' for fixed amount, 'percentage' for ratio, 'no_fee' for no fees
      default: 'fixed'                       // Default to 'fixed'
    },
    balance: {
      type: mongoose.Schema.Types.ObjectId,  // Reference to a balance
      ref: 'balances',                       // Link to the balances array in the merchant schema
    },
    enabled: { type: Boolean, default: true }, // Enable/disable the payment method
    enableFeeCalculation: { type: Boolean, default: true },
  }],

  



});

// Hash password before saving the document
merchantSchema.pre('save', async function (next) {
  if (this.isModified('password') || this.isNew) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

const Merchant = mongoose.model('Merchant', merchantSchema);

module.exports = Merchant;
