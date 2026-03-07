const mongoose = require('mongoose');

const handphoneSchema = new mongoose.Schema({
  merek: { type: String, required: true },
  tipe: { type: String, required: true },
  imei: { type: String, unique: true, sparse: true }, // optional but unique if provided
  spesifikasi: { type: String, required: true },
  kepemilikan: { type: String, required: true },
  harga: { type: Number, required: true, min: 0 }, // harga handphone
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'FieldStaff' }, // optional
  status: { type: String, enum: ['available', 'assigned', 'in_use', 'maintenance'], default: 'available' },
  assignedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // multiple products
  currentProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // optional - for backward compatibility
  assignmentHistory: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // Reference to order
    assignedAt: { type: Date, required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    returnedAt: { type: Date },
    status: { type: String, enum: ['active', 'completed', 'returned'], default: 'active' }
  }]
}, { timestamps: true });

// Indexes for performance
handphoneSchema.index({ assignedTo: 1 });
handphoneSchema.index({ status: 1 });
handphoneSchema.index({ imei: 1 }); // already indexed due to unique, but explicit

module.exports = mongoose.model('Handphone', handphoneSchema);