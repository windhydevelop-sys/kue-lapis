const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireRole } = auth;
const {
  getBackupStatus,
  createBackup,
  restoreBackup,
  deleteBackup,
  scheduleBackup
} = require('../controllers/backup');

// All backup routes require admin role
const adminOnly = requireRole('admin');

// Get backup status and list
router.get('/status', auth, adminOnly, getBackupStatus);

// Create new backup
router.post('/create', auth, adminOnly, createBackup);

// Restore from backup
router.post('/restore', auth, adminOnly, restoreBackup);

// Delete backup file
router.delete('/:filename', auth, adminOnly, deleteBackup);

// Schedule automatic backup
router.post('/schedule', auth, adminOnly, scheduleBackup);

module.exports = router;