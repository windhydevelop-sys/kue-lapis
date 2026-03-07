const mongoose = require('mongoose');

const loginHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Login details
  action: {
    type: String,
    enum: ['login', 'logout', 'failed_login', 'password_reset', 'account_locked'],
    required: true
  },

  success: {
    type: Boolean,
    default: true
  },

  // Location and device info
  ipAddress: {
    type: String,
    required: true
  },

  userAgent: {
    type: String,
    trim: true
  },

  location: {
    country: String,
    region: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  // Device information
  deviceInfo: {
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    device: String,
    deviceType: String
  },

  // Security context
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },

  riskFactors: [{
    type: String,
    enum: [
      'new_device',
      'new_location',
      'unusual_time',
      'suspicious_ip',
      'failed_attempts',
      'account_locked',
      'password_reset'
    ]
  }],

  // Additional context
  failureReason: {
    type: String,
    enum: [
      'invalid_credentials',
      'account_locked',
      'account_inactive',
      'email_not_verified',
      'two_factor_required',
      'two_factor_failed',
      'rate_limited'
    ]
  },

  sessionId: {
    type: String
  },

  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for performance and analytics
loginHistorySchema.index({ user: 1, createdAt: -1 });
loginHistorySchema.index({ ipAddress: 1 });
loginHistorySchema.index({ action: 1, createdAt: -1 });
loginHistorySchema.index({ riskLevel: 1 });
loginHistorySchema.index({ createdAt: -1 });

// Static method to get user's recent login history
loginHistorySchema.statics.getUserHistory = function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'username email');
};

// Static method to detect suspicious activity
loginHistorySchema.statics.detectSuspiciousActivity = function(userId, currentIP, currentUserAgent) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  return this.find({
    user: userId,
    createdAt: { $gte: oneHourAgo },
    success: false,
    failureReason: { $in: ['invalid_credentials', 'account_locked'] }
  }).countDocuments();
};

// Instance method to analyze risk
loginHistorySchema.methods.analyzeRisk = function() {
  let riskScore = 0;
  const riskFactors = [];

  // Check for failed login attempts
  if (this.action === 'failed_login') {
    riskScore += 30;
    riskFactors.push('failed_attempts');
  }

  // Check for account lockouts
  if (this.failureReason === 'account_locked') {
    riskScore += 50;
    riskFactors.push('account_locked');
  }

  // Check for unusual locations (simplified - in production you'd use geo databases)
  // This is a placeholder for more sophisticated location analysis

  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 70) {
    riskLevel = 'critical';
  } else if (riskScore >= 50) {
    riskLevel = 'high';
  } else if (riskScore >= 30) {
    riskLevel = 'medium';
  }

  this.riskLevel = riskLevel;
  this.riskFactors = riskFactors;

  return this.save();
};

module.exports = mongoose.model('LoginHistory', loginHistorySchema);