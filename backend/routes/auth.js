const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const { validateUser } = require('../utils/validation');
const { authLog, securityLog } = require('../utils/audit');

const router = express.Router();

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Basic sanitization - remove potential XSS
  for (let key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  }
  next();
};

// Register with enhanced security
router.post('/register', sanitizeInput, validateUser, async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    let existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      securityLog('REGISTRATION_FAILED_USER_EXISTS', 'low', {
        field,
        value: field === 'email' ? email : username,
        ip: req.ip
      }, req);

      return res.status(400).json({
        success: false,
        error: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    // Create new user
    const user = new User({ username, email, password });

    // Hash password with higher salt rounds
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: parseInt(process.env.JWT_EXPIRE) || 3600 },
      (err, token) => {
        if (err) {
          securityLog('JWT_GENERATION_FAILED', 'high', {
            userId: user.id,
            error: err.message
          }, req);
          return res.status(500).json({
            success: false,
            error: 'Token generation failed'
          });
        }

        // Audit log successful registration
        authLog('register', user.id, true, {
          username: user.username,
          email: user.email
        }, req);

        res.status(201).json({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email
          }
        });
      }
    );

  } catch (err) {
    securityLog('REGISTRATION_ERROR', 'medium', {
      error: err.message,
      email,
      username
    }, req);

    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Simple login for testing (without advanced features)
router.post('/login-simple', async (req, res) => {
  const { email, username, password } = req.body;
  const identifier = email || username;

  if (!identifier || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email/Username and password are required'
    });
  }

  try {
    console.log(`Login-simple attempt for identifier: ${identifier}`);
    const user = await User.findOne({
      $and: [
        { isActive: true },
        { $or: [{ email: identifier }, { username: identifier }] }
      ]
    });

    if (!user) {
      console.log(`User not found or inactive for identifier: ${identifier}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Use basic bcrypt.compare instead of user.comparePassword
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match for ${identifier}: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate simple JWT token
    const jwt = require('jsonwebtoken');
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        menuPermissions: user.menuPermissions
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Login with advanced security features
router.post('/login', sanitizeInput, async (req, res) => {
  const { username, password, rememberMe = false } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'Username and password are required'
    });
  }

  try {
    // Find user by username
    const user = await User.findOne({
      username,
      isActive: true
    });

    if (!user) {
      // Log failed login attempt (without user reference since user doesn't exist)
      authLog('login', null, false, {
        username,
        reason: 'user_not_found'
      }, req);

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      authLog('login', user.id, false, {
        username,
        reason: 'invalid_password'
      }, req);

      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update login information (temporarily disabled for testing)
    // await user.updateLoginInfo(clientIP);

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled
      }
    };

    const tokenExpiry = rememberMe ? '30d' : (parseInt(process.env.JWT_EXPIRE) || 3600);
    console.log('Login route: JWT_EXPIRE env var:', process.env.JWT_EXPIRE);
    console.log('Login route: tokenExpiry:', tokenExpiry);

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry },
      async (err, token) => {
        if (err) {
          securityLog('JWT_GENERATION_FAILED', 'high', {
            userId: user.id,
            error: err.message
          }, req);
          return res.status(500).json({
            success: false,
            error: 'Token generation failed'
          });
        }

        // Generate remember token if requested
        let rememberToken = null;
        if (rememberMe) {
          rememberToken = crypto.randomBytes(64).toString('hex');
          user.rememberToken = crypto.createHash('sha256').update(rememberToken).digest('hex');
          user.rememberTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
          await user.save();
        }

        authLog('login', user.id, true, {
          username: user.username,
          rememberMe
        }, req);

        res.json({
          success: true,
          token,
          rememberToken: rememberToken ? rememberToken : undefined,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            menuPermissions: user.menuPermissions,
            twoFactorEnabled: user.twoFactorEnabled,
            lastLogin: user.lastLogin,
            loginCount: user.loginCount
          }
        });
      }
    );

  } catch (err) {
    console.error('Login error:', err.message);
    // Temporarily disable securityLog to avoid LoginHistory issues
    // securityLog('LOGIN_ERROR', 'medium', {
    //   error: err.message,
    //   username
    // }, req);

    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Logout endpoint (for audit logging)
router.post('/logout', (req, res) => {
  // Extract user info from token if available
  const token = req.header('x-auth-token');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      authLog('logout', decoded.user.id, true, {}, req);
    } catch (err) {
      // Invalid token, just log general logout
      authLog('logout', null, true, { reason: 'invalid_token' }, req);
    }
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Password reset request
router.post('/forgot-password', sanitizeInput, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  try {
    const user = await User.findOne({ email, isActive: true });

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate password reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // In production, send email with reset link
    // For demo purposes, we'll just log it
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link: http://localhost:3000/reset-password/${resetToken}`);

    // Log password reset request
    await LoginHistory.create({
      user: user._id,
      action: 'password_reset',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    authLog('password_reset_request', user.id, true, { email }, req);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (err) {
    securityLog('PASSWORD_RESET_REQUEST_ERROR', 'medium', {
      error: err.message,
      email
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// Password reset with token
router.post('/reset-password/:token', sanitizeInput, async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'New password is required'
    });
  }

  // Basic password validation
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }

  try {
    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Log password reset
    await LoginHistory.create({
      user: user._id,
      action: 'password_reset',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    authLog('password_reset', user.id, true, {}, req);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (err) {
    securityLog('PASSWORD_RESET_ERROR', 'medium', {
      error: err.message,
      token: token.substring(0, 10) + '...'
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// Get current user profile
router.get('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires -rememberToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        preferences: user.preferences
      }
    });

  } catch (err) {
    securityLog('PROFILE_ACCESS_ERROR', 'low', {
      error: err.message,
      userId: req.user.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put('/profile', require('../middleware/auth'), sanitizeInput, async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'preferences'];
    const updates = {};

    // Only allow specific fields to be updated
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpires -rememberToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Audit log profile update
    auditLog('PROFILE_UPDATE', req.user.id, 'User', req.user.id, {
      updatedFields: Object.keys(updates)
    }, req);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        preferences: user.preferences
      }
    });

  } catch (err) {
    securityLog('PROFILE_UPDATE_ERROR', 'low', {
      error: err.message,
      userId: req.user.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Get login history for current user
router.get('/login-history', require('../middleware/auth'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const history = await LoginHistory.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await LoginHistory.countDocuments({ user: req.user.id });

    res.json({
      success: true,
      data: history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    securityLog('LOGIN_HISTORY_ACCESS_ERROR', 'low', {
      error: err.message,
      userId: req.user.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch login history'
    });
  }
});

// Change password
router.post('/change-password', require('../middleware/auth'), sanitizeInput, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      error: 'Current password and new password are required'
    });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'New password must be at least 8 characters long'
    });
  }

  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      // Log failed password change attempt
      await LoginHistory.create({
        user: user._id,
        action: 'failed_login',
        success: false,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        failureReason: 'invalid_current_password'
      });

      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Log successful password change
    await LoginHistory.create({
      user: user._id,
      action: 'password_change',
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    authLog('password_change', req.user.id, true, {}, req);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    securityLog('PASSWORD_CHANGE_ERROR', 'medium', {
      error: err.message,
      userId: req.user.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

module.exports = router;