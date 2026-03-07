const MenuPermission = require('../models/MenuPermission');
const { auditLog, securityLog } = require('../utils/audit');

// Get menu permissions for a specific role
const getMenuPermissions = async (req, res) => {
  try {
    const { role } = req.params;

    if (!role) {
      return res.status(400).json({
        success: false,
        error: 'Role is required'
      });
    }

    const permissions = await MenuPermission.getPermissionsForRole(role);

    auditLog('READ', req.userId, 'MenuPermission', `role_${role}`, {
      role,
      count: permissions.length
    }, req);

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    securityLog('MENU_PERMISSION_READ_FAILED', 'low', {
      error: error.message,
      role: req.params.role,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu permissions'
    });
  }
};

// Get all menu permissions grouped by role
const getAllMenuPermissions = async (req, res) => {
  try {
    const permissions = await MenuPermission.find({})
      .sort({ role: 1, sortOrder: 1 })
      .populate('createdBy', 'username')
      .populate('lastModifiedBy', 'username');

    // Group by role
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.role]) {
        acc[permission.role] = [];
      }
      acc[permission.role].push(permission);
      return acc;
    }, {});

    auditLog('READ', req.userId, 'MenuPermission', 'all', {
      totalPermissions: permissions.length,
      roles: Object.keys(groupedPermissions)
    }, req);

    res.json({
      success: true,
      data: groupedPermissions
    });
  } catch (error) {
    securityLog('MENU_PERMISSION_READ_ALL_FAILED', 'low', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu permissions'
    });
  }
};

// Update menu permission (enable/disable)
const updateMenuPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { isEnabled, sortOrder } = req.body;

    const updateData = {
      lastModifiedBy: req.userId
    };

    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const permission = await MenuPermission.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'username')
     .populate('lastModifiedBy', 'username');

    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Menu permission not found'
      });
    }

    auditLog('UPDATE', req.userId, 'MenuPermission', id, {
      menuKey: permission.menuKey,
      role: permission.role,
      isEnabled: permission.isEnabled,
      sortOrder: permission.sortOrder
    }, req);

    res.json({
      success: true,
      data: permission,
      message: 'Menu permission updated successfully'
    });
  } catch (error) {
    securityLog('MENU_PERMISSION_UPDATE_FAILED', 'medium', {
      error: error.message,
      permissionId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to update menu permission'
    });
  }
};

// Bulk update menu permissions for a role
const bulkUpdateMenuPermissions = async (req, res) => {
  try {
    const { role, permissions } = req.body;

    if (!role || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Role and permissions array are required'
      });
    }

    const results = [];
    for (const perm of permissions) {
      try {
        const updateData = {
          lastModifiedBy: req.userId
        };

        if (perm.isEnabled !== undefined) updateData.isEnabled = perm.isEnabled;
        if (perm.sortOrder !== undefined) updateData.sortOrder = perm.sortOrder;

        const updated = await MenuPermission.findOneAndUpdate(
          { role, menuKey: perm.menuKey },
          updateData,
          { new: true, upsert: true, runValidators: true }
        );

        results.push({
          menuKey: perm.menuKey,
          success: true,
          isEnabled: updated.isEnabled,
          sortOrder: updated.sortOrder
        });
      } catch (error) {
        results.push({
          menuKey: perm.menuKey,
          success: false,
          error: error.message
        });
      }
    }

    auditLog('UPDATE', req.userId, 'MenuPermission', `bulk_${role}`, {
      role,
      totalUpdates: permissions.length,
      successfulUpdates: results.filter(r => r.success).length
    }, req);

    res.json({
      success: true,
      data: results,
      message: `Bulk update completed for role ${role}`
    });
  } catch (error) {
    securityLog('MENU_PERMISSION_BULK_UPDATE_FAILED', 'medium', {
      error: error.message,
      role: req.body.role,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to bulk update menu permissions'
    });
  }
};

// Initialize default permissions (admin only)
const initializeDefaultPermissions = async (req, res) => {
  try {
    await MenuPermission.initializeDefaultPermissions();

    auditLog('CREATE', req.userId, 'MenuPermission', 'initialize_defaults', {
      action: 'initialize_default_permissions'
    }, req);

    res.json({
      success: true,
      message: 'Default menu permissions initialized successfully'
    });
  } catch (error) {
    securityLog('MENU_PERMISSION_INIT_FAILED', 'medium', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to initialize default permissions'
    });
  }
};

// Delete menu permission
const deleteMenuPermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await MenuPermission.findById(id);
    if (!permission) {
      return res.status(404).json({
        success: false,
        error: 'Menu permission not found'
      });
    }

    await MenuPermission.findByIdAndDelete(id);

    auditLog('DELETE', req.userId, 'MenuPermission', id, {
      menuKey: permission.menuKey,
      role: permission.role
    }, req);

    res.json({
      success: true,
      message: 'Menu permission deleted successfully'
    });
  } catch (error) {
    securityLog('MENU_PERMISSION_DELETE_FAILED', 'high', {
      error: error.message,
      permissionId: req.params.id,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to delete menu permission'
    });
  }
};

module.exports = {
  getMenuPermissions,
  getAllMenuPermissions,
  updateMenuPermission,
  bulkUpdateMenuPermissions,
  initializeDefaultPermissions,
  deleteMenuPermission
};