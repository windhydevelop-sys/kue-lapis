const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  noOrder: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  customer: {
    type: String,
    required: true,
    trim: true
  },
  fieldStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FieldStaff',
    required: false
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  harga: {
    type: Number,
    default: 0,
    min: 0
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

// Index for better query performance
orderSchema.index({ noOrder: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ fieldStaff: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save middleware to ensure noOrder uniqueness
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    try {
      const existingOrder = await mongoose.model('Order').findOne({
        noOrder: this.noOrder,
        _id: { $ne: this._id }
      });
      if (existingOrder) {
        const error = new Error('No Order already exists');
        error.statusCode = 400;
        return next(error);
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);