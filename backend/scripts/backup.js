const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { logger } = require('../utils/audit');

require('dotenv').config();

// Ensure backup directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Database backup function
const createDatabaseBackup = async () => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

  try {
    logger.info('Starting database backup', { timestamp, backupFile });

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    // Get all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    const backupData = {
      timestamp: new Date().toISOString(),
      database: db.databaseName,
      collections: {}
    };

    // Backup each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      const collectionData = await db.collection(collectionName).find({}).toArray();

      // Don't backup audit logs or temporary data
      if (collectionName !== 'auditlogs' && collectionName !== 'tempdata') {
        backupData.collections[collectionName] = collectionData;
        logger.info(`Backed up collection: ${collectionName}`, { count: collectionData.length });
      }
    }

    // Write backup file
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    // Create compressed archive
    const archiveName = `backup-${timestamp}.tar.gz`;
    const archivePath = path.join(backupDir, archiveName);

    exec(`tar -czf ${archivePath} -C ${backupDir} ${path.basename(backupFile)}`, (error) => {
      if (error) {
        logger.error('Compression failed', { error: error.message });
      } else {
        // Remove uncompressed file
        fs.unlinkSync(backupFile);
        logger.info('Backup compressed successfully', { archivePath });
      }
    });

    // Clean up old backups (keep last 30 days)
    cleanupOldBackups();

    logger.info('Database backup completed successfully', { backupFile: archivePath });

  } catch (error) {
    logger.error('Database backup failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

// Clean up old backup files
const cleanupOldBackups = () => {
  try {
    const files = fs.readdirSync(backupDir);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime < thirtyDaysAgo) {
        fs.unlinkSync(filePath);
        logger.info('Cleaned up old backup file', { file });
      }
    });
  } catch (error) {
    logger.error('Cleanup failed', { error: error.message });
  }
};

// Restore from backup
const restoreFromBackup = async (backupFilePath) => {
  try {
    logger.info('Starting database restore', { backupFilePath });

    if (!fs.existsSync(backupFilePath)) {
      throw new Error('Backup file not found');
    }

    // Read backup file
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Clear existing data (optional - be careful!)
    // await db.dropDatabase();

    // Restore collections
    for (const [collectionName, documents] of Object.entries(backupData.collections)) {
      const collection = db.collection(collectionName);

      if (documents.length > 0) {
        await collection.insertMany(documents);
        logger.info(`Restored collection: ${collectionName}`, { count: documents.length });
      }
    }

    logger.info('Database restore completed successfully');

  } catch (error) {
    logger.error('Database restore failed', { error: error.message, stack: error.stack });
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

// List available backups
const listBackups = () => {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.tar.gz'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created);

    return files;
  } catch (error) {
    logger.error('Failed to list backups', { error: error.message });
    return [];
  }
};

// Command line interface
const main = async () => {
  const command = process.argv[2];

  switch (command) {
    case 'backup':
      await createDatabaseBackup();
      console.log('Backup completed successfully');
      break;

    case 'restore':
      const backupFile = process.argv[3];
      if (!backupFile) {
        console.error('Please provide backup file path');
        process.exit(1);
      }
      await restoreFromBackup(backupFile);
      console.log('Restore completed successfully');
      break;

    case 'list':
      const backups = listBackups();
      console.log('Available backups:');
      backups.forEach(backup => {
        console.log(`${backup.filename} - ${backup.created.toISOString()} - ${(backup.size / 1024 / 1024).toFixed(2)}MB`);
      });
      break;

    default:
      console.log('Usage:');
      console.log('  node backup.js backup    - Create new backup');
      console.log('  node backup.js restore <file> - Restore from backup file');
      console.log('  node backup.js list      - List available backups');
      break;
  }
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createDatabaseBackup,
  restoreFromBackup,
  listBackups,
  cleanupOldBackups
};