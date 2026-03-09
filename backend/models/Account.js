const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    accountKey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        default: 'Rekening A' // e.g., 'Rekening A', 'Rekening B'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    bank: {
        type: String,
        required: true,
        trim: true
    },
    number: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    initialBalance: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Account', accountSchema);
