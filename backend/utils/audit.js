const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'website-aksesoris-backend' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error'
    }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log')
    }),
  ],
});

// If we're not in production then log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Audit log function
const auditLog = (action, userId, resource, resourceId, details = {}, req = null) => {
  const logEntry = {
    action,
    userId: userId || 'system',
    resource,
    resourceId: resourceId || null,
    details,
    timestamp: new Date().toISOString(),
    ip: req ? req.ip : null,
    userAgent: req ? req.get('User-Agent') : null,
    method: req ? req.method : null,
    url: req ? req.originalUrl : null
  };

  logger.info('AUDIT_LOG', logEntry);
  return logEntry;
};

// Security event logging
const securityLog = (event, severity, details, req = null) => {
  const logEntry = {
    event,
    severity, // 'low', 'medium', 'high', 'critical'
    details,
    timestamp: new Date().toISOString(),
    ip: req ? req.ip : null,
    userAgent: req ? req.get('User-Agent') : null,
    url: req ? req.originalUrl : null
  };

  logger.warn('SECURITY_EVENT', logEntry);
  return logEntry;
};

// Authentication logging
const authLog = (action, userId, success, details = {}, req = null) => {
  const logEntry = {
    action, // 'login', 'logout', 'register', 'password_change'
    userId: userId || null,
    success,
    details,
    timestamp: new Date().toISOString(),
    ip: req ? req.ip : null,
    userAgent: req ? req.get('User-Agent') : null
  };

  if (success) {
    logger.info('AUTH_EVENT', logEntry);
  } else {
    logger.warn('AUTH_EVENT_FAILED', logEntry);
  }

  return logEntry;
};

module.exports = {
  logger,
  auditLog,
  securityLog,
  authLog
};