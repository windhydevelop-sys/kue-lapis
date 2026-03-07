const mongoose = require('mongoose');

const menuPermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['admin', 'user', 'field_staff'],
    index: true
  },
  menuKey: {
    type: String,
    required: true,
    index: true
  },
  menuName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  parentMenu: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
menuPermissionSchema.index({ role: 1, menuKey: 1 }, { unique: true });

// Static method to get permissions for a role
menuPermissionSchema.statics.getPermissionsForRole = async function(role) {
  return await this.find({ role, isEnabled: true })
    .sort({ sortOrder: 1, menuName: 1 })
    .lean();
};

// Static method to initialize default permissions
menuPermissionSchema.statics.initializeDefaultPermissions = async function() {
  const defaultMenus = [
    // Admin menus
    { role: 'admin', menuKey: 'dashboard', menuName: 'Dashboard', path: '/dashboard', icon: 'Dashboard', sortOrder: 1 },
    { role: 'admin', menuKey: 'input_product', menuName: 'Input Product', path: '/dashboard', icon: 'Inventory', sortOrder: 2 },
    { role: 'admin', menuKey: 'customers', menuName: 'Customer', path: '/customers', icon: 'PeopleAlt', sortOrder: 3 },
    { role: 'admin', menuKey: 'field_staff', menuName: 'Orang Lapangan', path: '/field-staff', icon: 'Group', sortOrder: 4 },
    { role: 'admin', menuKey: 'manage_field_staff', menuName: 'Kelola Orlap', path: '/field-staff-management', icon: 'AdminPanelSettings', sortOrder: 5 },
    { role: 'admin', menuKey: 'dashboard_field_staff', menuName: 'Dashboard Orlap', path: '/field-staff-dashboard', icon: 'Dashboard', sortOrder: 6 },
    { role: 'admin', menuKey: 'orders', menuName: 'Order Management', path: '/orders', icon: 'AddShoppingCart', sortOrder: 7 },
    { role: 'admin', menuKey: 'cashflow', menuName: 'Cashflow', path: '/cashflow', icon: 'AccountBalanceWallet', sortOrder: 8 },
    { role: 'admin', menuKey: 'complaints', menuName: 'Komplain', path: '/complaints', icon: 'ReportProblem', sortOrder: 9 },
    { role: 'admin', menuKey: 'handphones', menuName: 'Detail Handphone', path: '/handphones', icon: 'Smartphone', sortOrder: 10 },
    { role: 'admin', menuKey: 'backup', menuName: 'Database Backup', path: '/backup', icon: 'Backup', sortOrder: 11 },
    { role: 'admin', menuKey: 'users', menuName: 'User Management', path: '/users', icon: 'AdminPanelSettings', sortOrder: 12 },

    // Field Staff menus
    { role: 'field_staff', menuKey: 'field_dashboard', menuName: 'Dashboard', path: '/field-staff-dashboard', icon: 'Dashboard', sortOrder: 1 },
    { role: 'field_staff', menuKey: 'assigned_products', menuName: 'Produk Saya', path: '/dashboard', icon: 'Inventory', sortOrder: 2 },

    // Regular User menus
    { role: 'user', menuKey: 'user_dashboard', menuName: 'Dashboard', path: '/dashboard', icon: 'Dashboard', sortOrder: 1 },
    { role: 'user', menuKey: 'my_products', menuName: 'Produk Saya', path: '/dashboard', icon: 'Inventory', sortOrder: 2 }
  ];

  for (const menu of defaultMenus) {
    try {
      await this.findOneAndUpdate(
        { role: menu.role, menuKey: menu.menuKey },
        { ...menu, isEnabled: true },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.warn(`Failed to initialize menu ${menu.menuKey} for role ${menu.role}:`, error.message);
    }
  }

  console.log('Default menu permissions initialized');
};

module.exports = mongoose.model('MenuPermission', menuPermissionSchema);