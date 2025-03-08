
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const subuserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String, 
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  phone: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v) {
        return /^\d{8}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number. It must be 8 digits.`
    }
  },
  permissions: {
    cash: { type: Boolean, default: false },
    knet: { type: Boolean, default: false },
    orders: {
      edit: { type: Boolean, default: false },
      create: { type: Boolean, default: false }
    },
    categories: {
      edit: { type: Boolean, default: false },
      create: { type: Boolean, default: false }
    },
    products: {
      edit: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      seeCostPrice: { type: Boolean, default: false }
    },
    purchaseOrders: {
      manage: { type: Boolean, default: false }
    }
  },
  role: {
    type: String,
    default: "viewer",
    enum: ["viewer", "editor", "admin"]
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for unique constraints per merchant
subuserSchema.index({ email: 1, merchant: 1 }, { unique: true });
subuserSchema.index({ phone: 1, merchant: 1 }, { unique: true });
subuserSchema.index({ username: 1, merchant: 1 }, { unique: true });

// Hash password before saving or updating
subuserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Hash password before updating
subuserSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  if (update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
  next();
});

const Subuser = mongoose.model('Subuser', subuserSchema);

module.exports = Subuser;
