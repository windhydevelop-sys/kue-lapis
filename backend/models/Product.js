const mongoose = require('mongoose');
const { encrypt, decrypt, hashSensitive } = require('../utils/encryption');

const productSchema = new mongoose.Schema({
  noOrder: { type: String, required: false },
  jenisRekening: { type: String, required: false }, // New field for BRI Account Type
  codeAgen: { type: String, required: false },
  bank: { type: String, required: false },
  grade: { type: String, required: false },
  kcp: { type: String, required: false },
  nik: { type: String, required: false },
  nama: { type: String, required: false },
  namaIbuKandung: { type: String, required: false },
  tempatTanggalLahir: { type: String, required: false },
  noRek: { type: String, required: false },
  sisaSaldo: { type: String }, // New optional field for remaining balance
  noAtm: { type: String, required: false },
  validThru: { type: String, required: false },
  noHp: { type: String, required: false },
  handphone: { type: String }, // New field for handphone
  imeiHandphone: { type: String }, // New field for IMEI handphone
  handphoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Handphone' }, // Optional reference to Handphone
  handphoneAssignmentDate: { type: Date, default: Date.now }, // When handphone was assigned
  handphoneReturnDate: { type: Date }, // When handphone was returned
  // Encrypted sensitive fields
  pinAtm: { type: String, required: false },
  pinWondr: { type: String },
  passWondr: { type: String },
  email: { type: String, required: false },
  passEmail: { type: String, required: false },
  expired: { type: Date }, // Optional
  uploadFotoId: { type: String }, // path to file
  uploadFotoSelfie: { type: String }, // path to file
  // Security fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: String },
  fieldStaff: { type: String }, // New field for field staff
  orderNumber: { type: String }, // New field for order number
  complaint: { type: String }, // New field for complaints
  complaintDate: { type: Date }, // Date when complaint was filed
  complaintResolvedDate: { type: Date }, // Date when complaint was resolved
  complaintStatus: {
    type: String,
    enum: ['pending', 'dalam proses', 'Rusak', 'selesai', ''],
    default: ''
  },
  complaintType: { type: String },
  myBCAUser: { type: String },
  myBCAPassword: { type: String },
  myBCAPin: { type: String },
  brimoUser: { type: String },
  brimoPassword: { type: String },
  brimoPin: { type: String },
  briMerchantUser: { type: String },
  briMerchantPassword: { type: String },
  // Specific for BCA
  kodeAkses: { type: String },
  pinMBca: { type: String },
  pinKeyBCA: { type: String },
  // Generic bank credential fields
  mobileUser: { type: String },
  mobilePassword: { type: String },
  mobilePin: { type: String },
  ibUser: { type: String }, // Internet Banking user
  ibPassword: { type: String }, // Internet Banking password
  ibPin: { type: String }, // Internet Banking PIN (New Field)
  merchantUser: { type: String },
  merchantPassword: { type: String },
  ocbcNyalaUser: { type: String },
  ocbcNyalaPassword: { type: String },
  ocbcNyalaPin: { type: String },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  }, // New field for product status
  source: {
    type: String,
    enum: ['web', 'telegram', 'import'],
    default: 'web'
  }
}, { timestamps: true });

// Pre-save middleware to encrypt sensitive data
productSchema.pre('save', function (next) {
  try {
    // Encrypt sensitive fields before saving
    if (this.isModified('pinAtm') && this.pinAtm && !String(this.pinAtm).startsWith('U2FsdGVkX1')) {
      this.pinAtm = encrypt(this.pinAtm);
    }
    if (this.isModified('pinWondr') && this.pinWondr && !String(this.pinWondr).startsWith('U2FsdGVkX1')) {
      this.pinWondr = encrypt(this.pinWondr);
    }
    if (this.isModified('passWondr') && this.passWondr && !String(this.passWondr).startsWith('U2FsdGVkX1')) {
      this.passWondr = encrypt(this.passWondr);
    }
    if (this.isModified('passEmail') && this.passEmail && !String(this.passEmail).startsWith('U2FsdGVkX1')) {
      this.passEmail = encrypt(this.passEmail);
    }
    if (this.isModified('myBCAUser') && this.myBCAUser && !String(this.myBCAUser).startsWith('U2FsdGVkX1')) {
      this.myBCAUser = encrypt(this.myBCAUser);
    }
    if (this.isModified('myBCAPassword') && this.myBCAPassword && !String(this.myBCAPassword).startsWith('U2FsdGVkX1')) {
      this.myBCAPassword = encrypt(this.myBCAPassword);
    }
    if (this.isModified('myBCAPin') && this.myBCAPin && !String(this.myBCAPin).startsWith('U2FsdGVkX1')) {
      this.myBCAPin = encrypt(this.myBCAPin);
    }
    if (this.isModified('brimoUser') && this.brimoUser && !String(this.brimoUser).startsWith('U2FsdGVkX1')) {
      this.brimoUser = encrypt(this.brimoUser);
    }
    if (this.isModified('brimoPassword') && this.brimoPassword && !String(this.brimoPassword).startsWith('U2FsdGVkX1')) {
      this.brimoPassword = encrypt(this.brimoPassword);
    }
    if (this.isModified('brimoPin') && this.brimoPin && !String(this.brimoPin).startsWith('U2FsdGVkX1')) {
      this.brimoPin = encrypt(this.brimoPin);
    }
    if (this.isModified('briMerchantUser') && this.briMerchantUser && !String(this.briMerchantUser).startsWith('U2FsdGVkX1')) {
      this.briMerchantUser = encrypt(this.briMerchantUser);
    }
    if (this.isModified('briMerchantPassword') && this.briMerchantPassword && !String(this.briMerchantPassword).startsWith('U2FsdGVkX1')) {
      this.briMerchantPassword = encrypt(this.briMerchantPassword);
    }
    if (this.isModified('kodeAkses') && this.kodeAkses && !String(this.kodeAkses).startsWith('U2FsdGVkX1')) {
      this.kodeAkses = encrypt(this.kodeAkses);
    }
    if (this.isModified('pinMBca') && this.pinMBca && !String(this.pinMBca).startsWith('U2FsdGVkX1')) {
      this.pinMBca = encrypt(this.pinMBca);
    }
    if (this.isModified('pinKeyBCA') && this.pinKeyBCA && !String(this.pinKeyBCA).startsWith('U2FsdGVkX1')) {
      this.pinKeyBCA = encrypt(this.pinKeyBCA);
    }
    // Mobile Banking Generic
    if (this.isModified('mobileUser') && this.mobileUser && !String(this.mobileUser).startsWith('U2FsdGVkX1')) {
      this.mobileUser = encrypt(this.mobileUser);
    }
    if (this.isModified('mobilePassword') && this.mobilePassword && !String(this.mobilePassword).startsWith('U2FsdGVkX1')) {
      this.mobilePassword = encrypt(this.mobilePassword);
    }
    if (this.isModified('mobilePin') && this.mobilePin && !String(this.mobilePin).startsWith('U2FsdGVkX1')) {
      this.mobilePin = encrypt(this.mobilePin);
    }
    if (this.isModified('ibUser') && this.ibUser && !String(this.ibUser).startsWith('U2FsdGVkX1')) {
      this.ibUser = encrypt(this.ibUser);
    }
    if (this.isModified('ibPassword') && this.ibPassword && !String(this.ibPassword).startsWith('U2FsdGVkX1')) {
      this.ibPassword = encrypt(this.ibPassword);
    }
    if (this.isModified('ibPin') && this.ibPin && !String(this.ibPin).startsWith('U2FsdGVkX1')) {
      this.ibPin = encrypt(this.ibPin);
    }
    if (this.isModified('merchantUser') && this.merchantUser && !String(this.merchantUser).startsWith('U2FsdGVkX1')) {
      this.merchantUser = encrypt(this.merchantUser);
    }
    if (this.isModified('merchantPassword') && this.merchantPassword && !String(this.merchantPassword).startsWith('U2FsdGVkX1')) {
      this.merchantPassword = encrypt(this.merchantPassword);
    }
    if (this.isModified('ocbcNyalaUser') && this.ocbcNyalaUser && !String(this.ocbcNyalaUser).startsWith('U2FsdGVkX1')) {
      this.ocbcNyalaUser = encrypt(this.ocbcNyalaUser);
    }
    if (this.isModified('ocbcNyalaPassword') && this.ocbcNyalaPassword && !String(this.ocbcNyalaPassword).startsWith('U2FsdGVkX1')) {
      this.ocbcNyalaPassword = encrypt(this.ocbcNyalaPassword);
    }
    if (this.isModified('ocbcNyalaPin') && this.ocbcNyalaPin && !String(this.ocbcNyalaPin).startsWith('U2FsdGVkX1')) {
      this.ocbcNyalaPin = encrypt(this.ocbcNyalaPin);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-update middleware for findOneAndUpdate operations
productSchema.pre('findOneAndUpdate', function (next) {
  try {
    const update = this.getUpdate();
    if (update.pinAtm && !String(update.pinAtm).startsWith('U2FsdGVkX1')) {
      update.pinAtm = encrypt(update.pinAtm);
    }
    if (update.pinWondr && !String(update.pinWondr).startsWith('U2FsdGVkX1')) {
      update.pinWondr = encrypt(update.pinWondr);
    }
    if (update.passWondr && !String(update.passWondr).startsWith('U2FsdGVkX1')) {
      update.passWondr = encrypt(update.passWondr);
    }
    if (update.passEmail && !String(update.passEmail).startsWith('U2FsdGVkX1')) {
      update.passEmail = encrypt(update.passEmail);
    }
    if (update.myBCAUser && !String(update.myBCAUser).startsWith('U2FsdGVkX1')) {
      update.myBCAUser = encrypt(update.myBCAUser);
    }
    if (update.myBCAPassword && !String(update.myBCAPassword).startsWith('U2FsdGVkX1')) {
      update.myBCAPassword = encrypt(update.myBCAPassword);
    }
    if (update.myBCAPin && !String(update.myBCAPin).startsWith('U2FsdGVkX1')) {
      update.myBCAPin = encrypt(update.myBCAPin);
    }
    if (update.brimoUser && !String(update.brimoUser).startsWith('U2FsdGVkX1')) {
      update.brimoUser = encrypt(update.brimoUser);
    }
    if (update.brimoPassword && !String(update.brimoPassword).startsWith('U2FsdGVkX1')) {
      update.brimoPassword = encrypt(update.brimoPassword);
    }
    if (update.briMerchantUser && !String(update.briMerchantUser).startsWith('U2FsdGVkX1')) {
      update.briMerchantUser = encrypt(update.briMerchantUser);
    }
    if (update.briMerchantPassword && !String(update.briMerchantPassword).startsWith('U2FsdGVkX1')) {
      update.briMerchantPassword = encrypt(update.briMerchantPassword);
    }
    if (update.kodeAkses && !String(update.kodeAkses).startsWith('U2FsdGVkX1')) {
      update.kodeAkses = encrypt(update.kodeAkses);
    }
    if (update.pinMBca && !String(update.pinMBca).startsWith('U2FsdGVkX1')) {
      update.pinMBca = encrypt(update.pinMBca);
    }
    if (update.pinKeyBCA && !String(update.pinKeyBCA).startsWith('U2FsdGVkX1')) {
      update.pinKeyBCA = encrypt(update.pinKeyBCA);
    }
    if (update.mobileUser && !String(update.mobileUser).startsWith('U2FsdGVkX1')) {
      update.mobileUser = encrypt(update.mobileUser);
    }
    if (update.mobilePassword && !String(update.mobilePassword).startsWith('U2FsdGVkX1')) {
      update.mobilePassword = encrypt(update.mobilePassword);
    }
    if (update.mobilePin && !String(update.mobilePin).startsWith('U2FsdGVkX1')) {
      update.mobilePin = encrypt(update.mobilePin);
    }
    // IB
    if (update.ibUser && !String(update.ibUser).startsWith('U2FsdGVkX1')) {
      update.ibUser = encrypt(update.ibUser);
    }
    if (update.ibPassword && !String(update.ibPassword).startsWith('U2FsdGVkX1')) {
      update.ibPassword = encrypt(update.ibPassword);
    }
    if (update.ibPin && !String(update.ibPin).startsWith('U2FsdGVkX1')) {
      update.ibPin = encrypt(update.ibPin);
    }
    // OCBC
    if (update.ocbcNyalaUser && !String(update.ocbcNyalaUser).startsWith('U2FsdGVkX1')) {
      update.ocbcNyalaUser = encrypt(update.ocbcNyalaUser);
    }
    if (update.ocbcNyalaPassword && !String(update.ocbcNyalaPassword).startsWith('U2FsdGVkX1')) {
      update.ocbcNyalaPassword = encrypt(update.ocbcNyalaPassword);
    }
    if (update.ocbcNyalaPin && !String(update.ocbcNyalaPin).startsWith('U2FsdGVkX1')) {
      update.ocbcNyalaPin = encrypt(update.ocbcNyalaPin);
    }
    if (update.ibUser && !String(update.ibUser).startsWith('U2FsdGVkX1')) {
      update.ibUser = encrypt(update.ibUser);
    }
    if (update.ibPassword && !String(update.ibPassword).startsWith('U2FsdGVkX1')) {
      update.ibPassword = encrypt(update.ibPassword);
    }
    if (update.ibPin && !String(update.ibPin).startsWith('U2FsdGVkX1')) {
      update.ibPin = encrypt(update.ibPin);
    }
    if (update.merchantUser && !String(update.merchantUser).startsWith('U2FsdGVkX1')) {
      update.merchantUser = encrypt(update.merchantUser);
    }
    if (update.merchantPassword && !String(update.merchantPassword).startsWith('U2FsdGVkX1')) {
      update.merchantPassword = encrypt(update.merchantPassword);
    }
    if (update.ocbcNyalaUser && !String(update.ocbcNyalaUser).startsWith('U2FsdGVkX1')) {
      update.ocbcNyalaUser = encrypt(update.ocbcNyalaUser);
    }
    if (update.ocbcNyalaPassword && !String(update.ocbcNyalaPassword).startsWith('U2FsdGVkX1')) {
      update.ocbcNyalaPassword = encrypt(update.ocbcNyalaPassword);
    }
    if (update.ocbcNyalaPin && !String(update.ocbcNyalaPin).startsWith('U2FsdGVkX1')) {
      update.ocbcNyalaPin = encrypt(update.ocbcNyalaPin);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to get decrypted data
productSchema.methods.getDecryptedData = function () {
  // Use toObject with virtuals and populated fields
  const decrypted = this.toObject({ virtuals: true, getters: true });

  const fieldsToDecrypt = [
    'pinAtm', 'pinWondr', 'passWondr', 'passEmail',
    'myBCAUser', 'myBCAPassword', 'myBCAPin',
    'brimoUser', 'brimoPassword', 'brimoPin', 'briMerchantUser', 'briMerchantPassword',
    'kodeAkses', 'pinMBca', 'pinKeyBCA',
    'mobileUser', 'mobilePassword', 'mobilePin',
    'ibUser', 'ibPassword', 'ibPin',
    'merchantUser', 'merchantPassword',
    'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'
  ];

  fieldsToDecrypt.forEach(field => {
    if (this[field]) {
      try {
        const decryptedValue = decrypt(this[field]);
        // Verify decryption was successful (not the same as input)
        if (decryptedValue !== this[field] || !decryptedValue.startsWith('U2FsdGVkX1')) {
          decrypted[field] = decryptedValue;
        } else {
          // Decryption failed silently, log it
          console.warn(`[DECRYPT FAIL] Field "${field}" could not be decrypted. Value starts with U2FsdGVkX1.`);
          decrypted[field] = this[field];
        }
      } catch (e) {
        console.error(`[DECRYPT ERROR] Field "${field}": ${e.message}`);
        decrypted[field] = this[field]; // Fallback to raw value
      }
    }
  });

  return decrypted;
};

// Static method to find and decrypt
productSchema.statics.findDecrypted = async function (query) {
  const products = await this.find(query);
  return products.map(product => product.getDecryptedData());
};

// Static method to find one and decrypt
productSchema.statics.findOneDecrypted = async function (query) {
  const product = await this.findOne(query);
  return product ? product.getDecryptedData() : null;
};

productSchema.index({ noOrder: 1 });
productSchema.index({ noHp: 1 });
productSchema.index({ bank: 1 });
productSchema.index({ status: 1 });
productSchema.index({ customer: 1 });
productSchema.index({ codeAgen: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
