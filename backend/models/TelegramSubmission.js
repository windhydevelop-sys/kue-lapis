const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const TelegramSubmissionSchema = new mongoose.Schema({
    telegramUserId: { type: String, required: true },
    codeAgen: { type: String, required: true },
    noOrder: { type: String },
    bank: { type: String },
    grade: { type: String },
    kcp: { type: String },
    nik: { type: String },
    nama: { type: String },
    namaIbuKandung: { type: String },
    tempatTanggalLahir: { type: String },
    noRek: { type: String },
    noAtm: { type: String },
    validThru: { type: String },
    noHp: { type: String },
    pinAtm: { type: String },
    pinWondr: { type: String },
    passWondr: { type: String },
    email: { type: String },
    passEmail: { type: String },
    expired: { type: String },
    myBCAUser: { type: String },
    myBCAPassword: { type: String },
    myBCAPin: { type: String },
    kodeAkses: { type: String },
    pinMBca: { type: String },
    brimoUser: { type: String },
    brimoPassword: { type: String },
    briMerchantUser: { type: String },
    briMerchantPassword: { type: String },
    jenisRekening: { type: String },
    mobileUser: { type: String },
    mobilePassword: { type: String },
    mobilePin: { type: String },
    ibUser: { type: String },
    ibPassword: { type: String },
    ibPin: { type: String },
    ocbcNyalaUser: { type: String },
    uploadFotoId: { type: String },
    uploadFotoSelfie: { type: String },
    status: {
        type: String,
        enum: ['pending', 'processed', 'archived'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Pre-save encryption
TelegramSubmissionSchema.pre('save', function (next) {
    const fieldsToEncrypt = [
        'nik', 'noRek', 'noAtm', 'pinAtm', 'pinWondr', 'passWondr', 'passEmail',
        'myBCAUser', 'myBCAPassword', 'myBCAPin', 'brimoUser', 'brimoPassword', 'briMerchantUser', 'briMerchantPassword',
        'kodeAkses', 'pinMBca', 'mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin',
        'merchantUser', 'merchantPassword', 'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'
    ];

    fieldsToEncrypt.forEach(field => {
        if (this[field] && this.isModified(field) && !String(this[field]).startsWith('U2FsdGVkX1')) {
            this[field] = encrypt(this[field]);
        }
    });

    next();
});

// Decryption method
TelegramSubmissionSchema.methods.getDecryptedData = function () {
    const data = this.toObject();
    const fieldsToDecrypt = [
        'nik', 'noRek', 'noAtm', 'pinAtm', 'pinWondr', 'passWondr', 'passEmail',
        'myBCAUser', 'myBCAPassword', 'myBCAPin', 'brimoUser', 'brimoPassword', 'briMerchantUser', 'briMerchantPassword',
        'kodeAkses', 'pinMBca', 'mobileUser', 'mobilePassword', 'mobilePin', 'ibUser', 'ibPassword', 'ibPin',
        'merchantUser', 'merchantPassword', 'ocbcNyalaUser', 'ocbcNyalaPassword', 'ocbcNyalaPin'
    ];

    fieldsToDecrypt.forEach(field => {
        if (data[field]) {
            try {
                data[field] = decrypt(data[field]);
            } catch (e) {
                console.error(`Decryption failed for field ${field}:`, e.message);
            }
        }
    });

    return data;
};

// Static method for decrypted find
TelegramSubmissionSchema.statics.findDecrypted = async function (query) {
    const docs = await this.find(query);
    return docs.map(doc => doc.getDecryptedData());
};

module.exports = mongoose.model('TelegramSubmission', TelegramSubmissionSchema);
