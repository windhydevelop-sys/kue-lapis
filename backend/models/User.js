const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // Basic user information
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  // Two-Factor Authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorBackupCodes: [{
    type: String
  }],


  // Password Reset
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },

  // Login Tracking
  lastLogin: {
    type: Date,
    default: null
  },
  loginCount: {
    type: Number,
    default: 0
  },
  currentLoginIP: {
    type: String,
    default: null
  },
  lastLoginIP: {
    type: String,
    default: null
  },

  // Remember Me functionality
  rememberToken: {
    type: String,
    default: null
  },
  rememberTokenExpires: {
    type: Date,
    default: null
  },

  // Security monitoring
  suspiciousActivityCount: {
    type: Number,
    default: 0
  },
  lastSuspiciousActivity: {
    type: Date,
    default: null
  },

  // Profile information
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },

  // Menu Permissions
  menuPermissions: {
    dashboard: { type: Boolean, default: true },
    inputProduct: { type: Boolean, default: false },
    customers: { type: Boolean, default: false },
    fieldStaff: { type: Boolean, default: false },
    complaints: { type: Boolean, default: false },
    handphone: { type: Boolean, default: false }
  },

  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
});


// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};


// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Instance method to update login info
userSchema.methods.updateLoginInfo = function(ipAddress) {
  this.lastLoginIP = this.currentLoginIP;
  this.currentLoginIP = ipAddress;
  this.lastLogin = new Date();
  this.loginCount += 1;
  return this.save();
};

// Static method to find user for authentication
userSchema.statics.findForAuth = function(email) {
  return this.findOne({ email, isActive: true });
};

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ passwordResetToken: 1 });
userSchema.index({ passwordResetExpires: 1 });
userSchema.index({ rememberToken: 1 });

module.exports = mongoose.model('User', userSchema);