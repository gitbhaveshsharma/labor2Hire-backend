/**
 * Security Middleware
 * Additional security measures for the application
 * 
 * @author Labor2Hire Team
 * @description Custom security middleware for enhanced protection
 */

import { logger } from '../config/logger.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/index.js';

/**
 * Security headers middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const securityMiddleware = (req, res, next) => {
  // Add custom security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
};

/**
 * IP whitelist middleware (for admin routes)
 * @param {Array} allowedIPs - Array of allowed IP addresses
 * @returns {Function} Middleware function
 */
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      logger.warn('IP access denied', {
        ip: clientIP,
        url: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent')
      });

      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message: ERROR_MESSAGES.ACCESS_DENIED,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Request size limit middleware
 * @param {string} limit - Size limit (e.g., '1mb', '100kb')
 * @returns {Function} Middleware function
 */
export const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSize = parseSize(limit);

    if (contentLength > maxSize) {
      logger.warn('Request size limit exceeded', {
        contentLength,
        maxSize,
        ip: req.ip,
        url: req.originalUrl
      });

      return res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({
        success: false,
        message: ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
        maxSize: limit,
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Parse size string to bytes
 * @param {string} size - Size string (e.g., '1mb', '100kb')
 * @returns {number} Size in bytes
 */
const parseSize = (size) => {
  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)$/);
  if (!match) return 0;

  const [, value, unit] = match;
  return Math.round(parseFloat(value) * units[unit]);
};

/**
 * Sanitize request data middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const sanitizeRequest = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Sanitize object by removing dangerous characters
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remove potential script tags and dangerous characters
      sanitized[key] = value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Content type validation middleware
 * @param {Array} allowedTypes - Array of allowed content types
 * @returns {Function} Middleware function
 */
export const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    
    if (req.method !== 'GET' && req.method !== 'DELETE' && contentType) {
      const baseType = contentType.split(';')[0].trim();
      
      if (!allowedTypes.includes(baseType)) {
        logger.warn('Invalid content type', {
          contentType: baseType,
          allowedTypes,
          ip: req.ip,
          url: req.originalUrl
        });

        return res.status(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE).json({
          success: false,
          message: ERROR_MESSAGES.UNSUPPORTED_MEDIA_TYPE,
          allowedTypes,
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  };
};

export default {
  securityMiddleware,
  ipWhitelist,
  requestSizeLimit,
  sanitizeRequest,
  validateContentType
};
