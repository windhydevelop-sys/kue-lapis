const mongoose = require('mongoose');

const balanceTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // Auto-assigned based on type
  debit: {
    type: Number,
    default: 0,
    min: 0
  },
  credit: {
    type: Number,
    default: 0,
    min: 0
  },
  // Running balance after this transaction
  runningBalance: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  reference: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'transfer', 'credit_card', 'debit_card', 'other'],
    default: 'cash'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save middleware to auto-assign debit/credit and calculate running balance
balanceTransactionSchema.pre('save', async function(next) {
  // Auto-assign debit/credit based on type
  if (this.type === 'income') {
    // Pemasukan: Debit (menambah saldo)
    this.debit = this.amount;
    this.credit = 0;
  } else if (this.type === 'expense') {
    // Pengeluaran: Credit (mengurangi saldo)
    this.debit = 0;
    this.credit = this.amount;
  }

  // Calculate running balance
  // Find the last transaction before this one
  const lastTransaction = await mongoose.model('BalanceTransaction')
    .findOne({
      createdBy: this.createdBy,
      date: { $lte: this.date },
      _id: { $ne: this._id }
    })
    .sort({ date: -1, createdAt: -1 })
    .select('runningBalance');

  const previousBalance = lastTransaction ? lastTransaction.runningBalance : 0;
  this.runningBalance = previousBalance + this.debit - this.credit;

  next();
});

// Index for better query performance
balanceTransactionSchema.index({ type: 1 });
balanceTransactionSchema.index({ category: 1 });
balanceTransactionSchema.index({ date: -1 });
balanceTransactionSchema.index({ createdBy: 1 });
balanceTransactionSchema.index({ createdAt: -1 });
balanceTransactionSchema.index({ runningBalance: 1 });

// Virtual for formatted amount
balanceTransactionSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(this.amount);
});

// Virtual for formatted debit
balanceTransactionSchema.virtual('formattedDebit').get(function() {
  return this.debit > 0 ? new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(this.debit) : '-';
});

// Virtual for formatted credit
balanceTransactionSchema.virtual('formattedCredit').get(function() {
  return this.credit > 0 ? new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(this.credit) : '-';
});

// Virtual for formatted running balance
balanceTransactionSchema.virtual('formattedRunningBalance').get(function() {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(Math.abs(this.runningBalance));
});

// Virtual for balance status (positive/negative)
balanceTransactionSchema.virtual('balanceStatus').get(function() {
  return this.runningBalance >= 0 ? 'positive' : 'negative';
});

module.exports = mongoose.model('BalanceTransaction', balanceTransactionSchema);