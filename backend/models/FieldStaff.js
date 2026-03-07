const mongoose = require('mongoose');

const fieldStaffSchema = new mongoose.Schema({
  kodeOrlap: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  namaOrlap: {
    type: String,
    required: true,
    trim: true
  },
  noHandphone: {
    type: String,
    required: false,
    trim: true
  },
  handphones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Handphone' }]
}, {
  timestamps: true
});

// Index for better query performance
fieldStaffSchema.index({ kodeOrlap: 1 });
fieldStaffSchema.index({ namaOrlap: 1 });

module.exports = mongoose.model('FieldStaff', fieldStaffSchema);