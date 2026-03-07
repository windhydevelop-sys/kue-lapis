const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { securityLog, auditLog } = require('../utils/audit');

const router = express.Router();

// Middleware to check if user has admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin role required.'
    });
  }
  next();
};

// Middleware to check if user has admin or moderator role
const requireModerator = (req, res, next) => {
  if (!['admin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Moderator or Admin role required.'
    });
  }
  next();
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  for (let key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  }
  next();
};

// Get all users (Admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find({})
      .select('-password -passwordResetToken -passwordResetExpires -rememberToken -twoFactorSecret -twoFactorBackupCodes')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    securityLog('USER_LIST_ACCESS_ERROR', 'medium', {
      error: err.message,
      userId: req.user.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get user by ID (Admin or Moderator)
router.get('/:id', auth, requireModerator, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -passwordResetExpires -rememberToken -twoFactorSecret -twoFactorBackupCodes');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (err) {
    securityLog('USER_DETAIL_ACCESS_ERROR', 'low', {
      error: err.message,
      userId: req.user.id,
      targetUserId: req.params.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// Create new user (Admin only)
router.post('/', auth, requireAdmin, sanitizeInput, async (req, res) => {
  const { username, email, password, role, firstName, lastName, phoneNumber, menuPermissions } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // Validate role
    const validRoles = ['user', 'moderator', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role specified'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      role: role || 'user',
      firstName,
      lastName,
      phoneNumber,
      menuPermissions: menuPermissions || {
        dashboard: true,
        inputProduct: false,
        customers: false,
        fieldStaff: false,
        complaints: false,
        handphone: false
      }
    });

    await user.save();

    // Audit log
    auditLog('USER_CREATE', req.user.id, 'User', user._id, {
      username: user.username,
      email: user.email,
      role: user.role
    }, req);

    // Return user without sensitive data
    const userResponse = await User.findById(user._id)
      .select('-password -passwordResetToken -passwordResetExpires -rememberToken -twoFactorSecret -twoFactorBackupCodes');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });

  } catch (err) {
    securityLog('USER_CREATE_ERROR', 'medium', {
      error: err.message,
      userId: req.user.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// Update user (Admin only, or self for profile updates)
router.put('/:id', auth, sanitizeInput, async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Check permissions
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Can only update own profile or requires admin role.'
      });
    }

    // Define allowed fields based on permissions
    let allowedFields = ['firstName', 'lastName', 'phoneNumber', 'preferences'];

    if (req.user.role === 'admin') {
      allowedFields = ['username', 'email', 'role', 'isActive', 'firstName', 'lastName', 'phoneNumber', 'preferences', 'menuPermissions'];
    }

    // Filter updates to only allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Validate role if being updated
    if (filteredUpdates.role) {
      const validRoles = ['user', 'moderator', 'admin'];
      if (!validRoles.includes(filteredUpdates.role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role specified'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpires -rememberToken -twoFactorSecret -twoFactorBackupCodes');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Audit log
    auditLog('USER_UPDATE', req.user.id, 'User', user._id, {
      updatedFields: Object.keys(filteredUpdates),
      targetUserId: userId
    }, req);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });

  } catch (err) {
    securityLog('USER_UPDATE_ERROR', 'medium', {
      error: err.message,
      userId: req.user.id,
      targetUserId: req.params.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// Change user password (Admin only, or self)
router.post('/:id/change-password', auth, sanitizeInput, async (req, res) => {
  const { newPassword } = req.body;
  const targetUserId = req.params.id;

  // Check permissions
  if (req.user.id !== targetUserId && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Can only change own password or requires admin role.'
    });
  }

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters long'
    });
  }

  try {
    const user = await User.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.password = newPassword;
    await user.save();

    // Audit log
    auditLog('USER_PASSWORD_CHANGE', req.user.id, 'User', user._id, {
      targetUserId,
      changedByAdmin: req.user.role === 'admin'
    }, req);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (err) {
    securityLog('USER_PASSWORD_CHANGE_ERROR', 'medium', {
      error: err.message,
      userId: req.user.id,
      targetUserId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Deactivate/Activate user (Admin only)
router.post('/:id/toggle-status', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    // Audit log
    auditLog('USER_STATUS_TOGGLE', req.user.id, 'User', user._id, {
      newStatus: user.isActive,
      targetUserId: req.params.id
    }, req);

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user._id,
        isActive: user.isActive
      }
    });

  } catch (err) {
    securityLog('USER_STATUS_TOGGLE_ERROR', 'medium', {
      error: err.message,
      userId: req.user.id,
      targetUserId: req.params.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to toggle user status'
    });
  }
});

// Delete user (Admin only)
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    // Audit log
    auditLog('USER_DELETE', req.user.id, 'User', req.params.id, {
      deletedUser: {
        username: user.username,
        email: user.email,
        role: user.role
      }
    }, req);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (err) {
    securityLog('USER_DELETE_ERROR', 'high', {
      error: err.message,
      userId: req.user.id,
      targetUserId: req.params.id
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

module.exports = router;