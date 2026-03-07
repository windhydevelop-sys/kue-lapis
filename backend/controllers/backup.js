const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { auditLog, securityLog } = require('../utils/audit');

// Get backup status and list
const getBackupStatus = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../backups');

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Get list of backup files
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.gz'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    auditLog('READ', req.userId, 'Backup', 'status', {
      backupCount: files.length
    }, req);

    res.json({
      success: true,
      data: {
        backupDirectory: backupDir,
        totalBackups: files.length,
        backups: files,
        lastBackup: files.length > 0 ? files[0] : null
      }
    });
  } catch (error) {
    securityLog('BACKUP_STATUS_FAILED', 'low', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to get backup status'
    });
  }
};

// Create manual backup
const createBackup = async (req, res) => {
  try {
    const { type = 'full' } = req.body; // 'full' or 'collections'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup-${type}-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    if (type === 'full') {
      // Get all collections and their data
      const collections = mongoose.connection.db.listCollections();
      const backupData = {};

      for await (const collection of collections) {
        const collectionName = collection.name;
        const collectionData = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backupData[collectionName] = collectionData;
      }

      // Write backup to file
      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    } else if (type === 'collections') {
      // Backup specific collections
      const collectionsToBackup = ['products', 'customers', 'fieldstaffs', 'orders', 'cashflows', 'handphones'];
      const backupData = {};

      for (const collectionName of collectionsToBackup) {
        try {
          const collectionData = await mongoose.connection.db.collection(collectionName).find({}).toArray();
          backupData[collectionName] = collectionData;
        } catch (error) {
          console.warn(`Collection ${collectionName} not found, skipping...`);
        }
      }

      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    }

    const stats = fs.statSync(filepath);

    auditLog('CREATE', req.userId, 'Backup', filename, {
      type,
      size: stats.size,
      filepath
    }, req);

    res.json({
      success: true,
      data: {
        filename,
        filepath,
        size: stats.size,
        type,
        createdAt: new Date(),
        message: `Backup ${type} berhasil dibuat`
      }
    });

  } catch (error) {
    securityLog('BACKUP_CREATE_FAILED', 'medium', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to create backup: ' + error.message
    });
  }
};

// Restore from backup
const restoreBackup = async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Filename is required'
      });
    }

    const backupDir = path.join(__dirname, '../backups');
    const filepath = path.join(backupDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }

    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    // Restore each collection
    const results = {};
    for (const [collectionName, documents] of Object.entries(backupData)) {
      try {
        // Clear existing data
        await mongoose.connection.db.collection(collectionName).deleteMany({});

        // Insert backup data
        if (documents.length > 0) {
          await mongoose.connection.db.collection(collectionName).insertMany(documents);
        }

        results[collectionName] = {
          success: true,
          count: documents.length
        };
      } catch (error) {
        results[collectionName] = {
          success: false,
          error: error.message
        };
      }
    }

    auditLog('UPDATE', req.userId, 'Backup', filename, {
      action: 'restore',
      results
    }, req);

    res.json({
      success: true,
      data: {
        filename,
        restoredCollections: results,
        message: 'Backup berhasil direstore'
      }
    });

  } catch (error) {
    securityLog('BACKUP_RESTORE_FAILED', 'high', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to restore backup: ' + error.message
    });
  }
};

// Delete backup file
const deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;

    const backupDir = path.join(__dirname, '../backups');
    const filepath = path.join(backupDir, filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found'
      });
    }

    // Get file info before deletion
    const stats = fs.statSync(filepath);

    // Delete file
    fs.unlinkSync(filepath);

    auditLog('DELETE', req.userId, 'Backup', filename, {
      size: stats.size
    }, req);

    res.json({
      success: true,
      message: 'Backup file berhasil dihapus'
    });

  } catch (error) {
    securityLog('BACKUP_DELETE_FAILED', 'medium', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to delete backup: ' + error.message
    });
  }
};

// Schedule automatic backup (for future use)
const scheduleBackup = async (req, res) => {
  try {
    const { schedule, type = 'collections' } = req.body;

    // This would integrate with a job scheduler like node-cron
    // For now, just return success

    auditLog('CREATE', req.userId, 'Backup', 'schedule', {
      schedule,
      type
    }, req);

    res.json({
      success: true,
      message: 'Backup scheduling configured (feature coming soon)',
      data: {
        schedule,
        type,
        status: 'configured'
      }
    });

  } catch (error) {
    securityLog('BACKUP_SCHEDULE_FAILED', 'low', {
      error: error.message,
      userId: req.userId
    }, req);

    res.status(500).json({
      success: false,
      error: 'Failed to schedule backup: ' + error.message
    });
  }
};

module.exports = {
  getBackupStatus,
  createBackup,
  restoreBackup,
  deleteBackup,
  scheduleBackup
};