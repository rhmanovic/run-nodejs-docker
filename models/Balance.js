const mongoose = require('mongoose');

const BalanceSchema = new mongoose.Schema({
  merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', unique: true, required: true },
  shopBalance: { type: Number, default: 0 },  // Shop cash balance
  bankBalance: { type: Number, default: 0 },   // Bank cash balance
  balances: [{
    _id: mongoose.Schema.Types.ObjectId, // Unique identifier for each balance
    name: { type: String, required: true },  // Custom name for the balance (e.g., "Cash Box", "Bank Account", etc.)
    balance: { type: Number, default: 0 },   // The amount in that balance
  }],
});

const Balance = mongoose.model('Balance', BalanceSchema);
module.exports = Balance;
