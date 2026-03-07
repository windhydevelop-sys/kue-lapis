const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = auth;
const {
  getMenuPermissions,
  getAllMenuPermissions,
  updateMenuPermission,
  bulkUpdateMenuPermissions,
  initializeDefaultPermissions,
  deleteMenuPermission
} = require('../controllers/menuPermissions');

// All menu permission routes require admin role
const adminOnly = requireRole('admin');

// Get menu permissions for a specific role
router.get('/role/:role', auth, adminOnly, getMenuPermissions);

// Get all menu permissions grouped by role
router.get('/', auth, adminOnly, getAllMenuPermissions);

// Update single menu permission
router.put('/:id', auth, adminOnly, updateMenuPermission);

// Bulk update menu permissions for a role
router.put('/bulk/role/:role', auth, adminOnly, bulkUpdateMenuPermissions);

// Initialize default permissions
router.post('/initialize', auth, adminOnly, initializeDefaultPermissions);

// Delete menu permission
router.delete('/:id', auth, adminOnly, deleteMenuPermission);

module.exports = router;