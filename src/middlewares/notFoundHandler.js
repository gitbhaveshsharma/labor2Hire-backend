/**
 * Not Found Handler Middleware
 * Handles requests to non-existent routes
 * 
 * @author Labor2Hire Team
 * @description Returns 404 response for undefined routes
 */

import { logger } from '../config/logger.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/index.js';

/**
 * Not found middleware handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const notFoundHandler = (req, res, next) => {
  // Log the 404 attempt
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });

  // Send 404 response
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: ERROR_MESSAGES.ROUTE_NOT_FOUND,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Please check the API documentation for available endpoints'
  });
};

export default notFoundHandler;
