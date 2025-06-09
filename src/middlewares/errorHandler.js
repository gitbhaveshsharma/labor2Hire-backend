/**
 * Global Error Handler Middleware
 * Centralized error handling for the application
 *
 * @author Labor2Hire Team
 * @description Handles all application errors with proper logging and response formatting
 */

import { logger } from "../config/logger.js";
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  ENVIRONMENTS,
} from "../constants/index.js";

/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(
    message,
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, HTTP_STATUS.BAD_REQUEST);
    this.errors = errors;
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message = ERROR_MESSAGES.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN);
  }
}

/**
 * Resource not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, HTTP_STATUS.NOT_FOUND);
  }
}

/**
 * Database error class
 */
export class DatabaseError extends AppError {
  constructor(message = "Database operation failed") {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  constructor(
    message = "External service unavailable",
    statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE
  ) {
    super(message, statusCode);
  }
}

/**
 * Handle MongoDB duplicate key errors
 * @param {Error} error - MongoDB duplicate key error
 * @returns {AppError} Formatted application error
 */
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const value = error.keyValue[field];

  // Provide specific message for phone number duplicates
  if (field === "phoneNumber") {
    return new ValidationError(
      "You already have an account with this phone number. Please use login instead."
    );
  }

  const message = `${field} '${value}' already exists`;
  return new ValidationError(message);
};

/**
 * Handle MongoDB validation errors
 * @param {Error} error - MongoDB validation error
 * @returns {AppError} Formatted application error
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map((err) => ({
    field: err.path,
    message: err.message,
    value: err.value,
  }));
  return new ValidationError("Validation failed", errors);
};

/**
 * Handle MongoDB cast errors
 * @param {Error} error - MongoDB cast error
 * @returns {AppError} Formatted application error
 */
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new ValidationError(message);
};

/**
 * Handle JWT errors
 * @param {Error} error - JWT error
 * @returns {AppError} Formatted application error
 */
const handleJWTError = (error) => {
  if (error.name === "TokenExpiredError") {
    return new AuthenticationError("Token has expired. Please log in again.");
  } else if (error.name === "JsonWebTokenError") {
    return new AuthenticationError("Invalid token. Please log in again.");
  }
  return new AuthenticationError("Authentication failed.");
};

/**
 * Format error response for development environment
 * @param {Error} error - The error object
 * @returns {Object} Detailed error response
 */
const formatDevelopmentError = (error) => ({
  success: false,
  message: error.message,
  statusCode: error.statusCode,
  error: {
    name: error.name,
    stack: error.stack,
    isOperational: error.isOperational,
    ...(error.errors && { validationErrors: error.errors }),
  },
  timestamp: new Date().toISOString(),
});

/**
 * Format error response for production environment
 * @param {Error} error - The error object
 * @returns {Object} Safe error response
 */
const formatProductionError = (error) => {
  const response = {
    success: false,
    timestamp: new Date().toISOString(),
  };

  if (error.isOperational) {
    response.message = error.message;
    if (error.errors) {
      response.errors = error.errors;
    }
  } else {
    response.message = ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
  }

  return response;
};

/**
 * Main error handler middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const errorHandler = (error, req, res, next) => {
  let appError = error;

  // Log the error
  logger.error("Error occurred in application", {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    userId: req.user?.id,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  });

  // Convert known errors to AppError
  if (error.name === "ValidationError") {
    appError = handleValidationError(error);
  } else if (error.code === 11000) {
    appError = handleDuplicateKeyError(error);
  } else if (error.name === "CastError") {
    appError = handleCastError(error);
  } else if (
    error.name === "TokenExpiredError" ||
    error.name === "JsonWebTokenError"
  ) {
    appError = handleJWTError(error);
  } else if (!(error instanceof AppError)) {
    // Convert unknown errors to generic AppError
    appError = new AppError(
      process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION
        ? ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        : error.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      false
    );
  }

  // Set default status code if not set
  const statusCode = appError.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // Format response based on environment
  const errorResponse =
    process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION
      ? formatProductionError(appError)
      : formatDevelopmentError(appError);

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with error handling
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create operational error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @returns {AppError} Operational error
 */
export const createError = (message, statusCode) => {
  return new AppError(message, statusCode, true);
};

export default {
  errorHandler,
  asyncHandler,
  createError,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  DatabaseError,
  ExternalServiceError,
};
