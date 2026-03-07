const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  kodeCustomer: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  namaCustomer: {
    type: String,
    required: true,
    trim: true
  },
  noHandphone: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);