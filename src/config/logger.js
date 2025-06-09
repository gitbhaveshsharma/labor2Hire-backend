/**
 * @fileoverview Winston logger configuration
 * @module config/logger
 * @author Labor2Hire Team
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENVIRONMENTS } from '../constants/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    if (stack) {
      logEntry.stack = stack;
    }

    return JSON.stringify(logEntry);
  })
);

/**
 * Console log format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

/**
 * Create winston logger instance
 */
const createLogger = () => {
  const logLevel = process.env.LOG_LEVEL || 'info';
  const environment = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
  const logDir = path.join(__dirname, '../../logs');

  const transports = [];

  // Console transport for all environments
  transports.push(
    new winston.transports.Console({
      level: environment === ENVIRONMENTS.DEVELOPMENT ? 'debug' : logLevel,
      format: environment === ENVIRONMENTS.DEVELOPMENT ? consoleFormat : logFormat,
      silent: environment === ENVIRONMENTS.TESTING
    })
  );

  // File transports for non-testing environments
  if (environment !== ENVIRONMENTS.TESTING) {
    // Error log file
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: logFormat,
        maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
        zippedArchive: true
      })
    );

    // Combined log file
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        format: logFormat,
        maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
        zippedArchive: true
      })
    );

    // Audit log for important actions
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'info',
        format: logFormat,
        maxSize: process.env.LOG_FILE_MAX_SIZE || '20m',
        maxFiles: process.env.LOG_FILE_MAX_FILES || '30d',
        zippedArchive: true,
        // Only log audit-related messages
        filter: (info) => info.audit === true
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: {
      service: 'labor2hire-backend',
      environment,
      pid: process.pid
    },
    transports,
    exitOnError: false,
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, 'rejections.log'),
        format: logFormat
      })
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logDir, 'exceptions.log'),
        format: logFormat
      })
    ]
  });
};

// Create logger instance
export const logger = createLogger();

/**
 * Request logger middleware for Express
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.id || req.headers['x-request-id']
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      requestId: req.id || req.headers['x-request-id']
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Security logger for authentication and authorization events
 */
export const securityLogger = {
  loginAttempt: (phoneNumber, success, ip) => {
    logger.info('Login attempt', {
      event: 'login_attempt',
      phoneNumber: phoneNumber ? phoneNumber.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2') : 'unknown',
      success,
      ip,
      audit: true
    });
  },

  accessDenied: (userId, resource, ip) => {
    logger.warn('Access denied', {
      event: 'access_denied',
      userId,
      resource,
      ip,
      audit: true
    });
  },

  tokenGenerated: (userId, tokenType = 'access') => {
    logger.info('Token generated', {
      event: 'token_generated',
      userId,
      tokenType,
      audit: true
    });
  },

  passwordChanged: (userId) => {
    logger.info('Password changed', {
      event: 'password_changed',
      userId,
      audit: true
    });
  },

  accountCreated: (userId, phoneNumber) => {
    logger.info('Account created', {
      event: 'account_created',
      userId,
      phoneNumber: phoneNumber ? phoneNumber.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2') : 'unknown',
      audit: true
    });
  },

  suspiciousActivity: (userId, activity, details) => {
    logger.warn('Suspicious activity detected', {
      event: 'suspicious_activity',
      userId,
      activity,
      details,
      audit: true
    });
  }
};

/**
 * Performance logger for monitoring slow operations
 */
export const performanceLogger = {
  slowQuery: (query, duration, collection) => {
    logger.warn('Slow database query detected', {
      event: 'slow_query',
      query: typeof query === 'object' ? JSON.stringify(query) : query,
      duration: `${duration}ms`,
      collection,
      threshold: '1000ms'
    });
  },

  apiResponse: (endpoint, method, duration, statusCode) => {
    const level = duration > 5000 ? 'warn' : 'info';
    logger.log(level, 'API response time', {
      event: 'api_response',
      endpoint,
      method,
      duration: `${duration}ms`,
      statusCode
    });
  },

  cacheHit: (key, operation) => {
    logger.debug('Cache operation', {
      event: 'cache_hit',
      key,
      operation
    });
  },

  cacheMiss: (key, operation) => {
    logger.debug('Cache operation', {
      event: 'cache_miss',
      key,
      operation
    });
  }
};

/**
 * Business logic logger for tracking important business events
 */
export const businessLogger = {
  jobCreated: (jobId, employerId, category) => {
    logger.info('Job created', {
      event: 'job_created',
      jobId,
      employerId,
      category,
      audit: true
    });
  },

  jobApplication: (applicationId, jobId, laborerId) => {
    logger.info('Job application submitted', {
      event: 'job_application',
      applicationId,
      jobId,
      laborerId,
      audit: true
    });
  },

  paymentProcessed: (paymentId, amount, fromUserId, toUserId) => {
    logger.info('Payment processed', {
      event: 'payment_processed',
      paymentId,
      amount,
      fromUserId,
      toUserId,
      audit: true
    });
  },

  locationUpdated: (userId, coordinates) => {
    logger.info('User location updated', {
      event: 'location_updated',
      userId,
      coordinates,
      audit: true
    });
  }
};

/**
 * Error logger with enhanced error tracking
 */
export const errorLogger = {
  database: (operation, error, context = {}) => {
    logger.error('Database error', {
      event: 'database_error',
      operation,
      error: error.message,
      stack: error.stack,
      ...context
    });
  },

  validation: (field, value, rule, context = {}) => {
    logger.warn('Validation error', {
      event: 'validation_error',
      field,
      value: typeof value === 'string' && value.length > 50 ? `${value.substring(0, 50)}...` : value,
      rule,
      ...context
    });
  },

  external: (service, operation, error, context = {}) => {
    logger.error('External service error', {
      event: 'external_service_error',
      service,
      operation,
      error: error.message,
      ...context
    });
  },

  uncaught: (error, context = {}) => {
    logger.error('Uncaught error', {
      event: 'uncaught_error',
      error: error.message,
      stack: error.stack,
      ...context
    });
  }
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  errorLogger.uncaught(error, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  errorLogger.uncaught(reason, { 
    type: 'unhandledRejection',
    promise: promise.toString()
  });
});

export default logger;
