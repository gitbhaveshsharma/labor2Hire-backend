/**
 * Validation Middleware
 * Request validation and sanitization
 *
 * @author Labor2Hire Team
 * @description Comprehensive validation middleware using Joi and express-validator
 */

import Joi from "joi";
import { validationResult, body, param, query } from "express-validator";
import { logger } from "../config/logger.js";
import { HTTP_STATUS } from "../constants/index.js";
import { ValidationError } from "./errorHandler.js";

/**
 * Joi validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Middleware function
 */
export const validateWithJoi = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        value: detail.context?.value,
      }));

      logger.warn("Joi validation failed", {
        property,
        errors: validationErrors,
        url: req.originalUrl,
        method: req.method,
        requestId: req.requestId,
      });

      throw new ValidationError("Validation failed", validationErrors);
    }

    // Replace the request property with validated and sanitized data
    req[property] = value;
    next();
  };
};

/**
 * Express validator middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
      location: error.location,
    }));

    logger.warn("Express validation failed", {
      errors: validationErrors,
      url: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
    });

    throw new ValidationError("Validation failed", validationErrors);
  }

  next();
};

/**
 * Simple validation middleware that handles express-validator results
 * @param {Array} validationRules - Array of express-validator rules
 * @returns {Function} Middleware function
 */
export const validate = (validationRules) => {
  return async (req, res, next) => {
    // Run all validation rules
    if (Array.isArray(validationRules)) {
      for (const validation of validationRules) {
        if (typeof validation === "function") {
          // Check if it's an express-validator function or custom middleware
          if (validation.builder && typeof validation.run === "function") {
            // Express-validator function - call run method
            await validation.run(req);
          } else {
            // Custom middleware function - call it directly
            await new Promise((resolve, reject) => {
              validation(req, res, (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
        }
      }
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const validationErrors = errors.array().map((error) => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value,
      }));

      logger.warn("Express-validator validation failed", {
        errors: validationErrors,
        url: req.originalUrl,
        method: req.method,
        requestId: req.requestId,
      });

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    next();
  };
};

/**
 * Common validation schemas
 */
export const validationSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      "string.pattern.base": "Invalid ObjectId format",
    }),
  // Phone number validation (international format)
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .messages({
      "string.pattern.base": "Invalid phone number format",
    }),
  // Email validation
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .messages({
      "string.email": "Invalid email format",
      "string.max": "Email must be at most 255 characters long",
    }),
  // Password validation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.max": "Password must be at most 128 characters long",
      "string.pattern.base":
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character",
    }),
  // Name validation
  name: Joi.string()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .trim()
    .messages({
      "string.min": "Name must be at least 1 character long",
      "string.max": "Name must be at most 100 characters long",
      "string.pattern.base":
        "Name must contain only letters, spaces, hyphens, and apostrophes",
    }),
  // Coordinates validation [longitude, latitude]
  coordinates: Joi.array()
    .items(Joi.number().min(-180).max(180))
    .length(2)
    .messages({
      "array.length":
        "Coordinates must be an array of exactly 2 numbers [longitude, latitude]",
      "array.base": "Coordinates must be an array",
    }),
  // URL validation
  url: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .max(2048)
    .messages({
      "string.uri": "Invalid URL format",
      "string.max": "URL must be at most 2048 characters long",
    }),
  // Date validation
  date: Joi.date().iso().messages({
    "date.format": "Date must be in ISO format",
  }),
  // Role validation
  userRole: Joi.string().valid("laborer", "employer", "admin").messages({
    "any.only": "Role must be laborer, employer, or admin",
  }),
  // Language preference validation
  language: Joi.string()
    .valid("en", "es", "fr", "de", "it", "pt", "zh", "ja", "ko", "ar", "hi")
    .default("en")
    .messages({
      "any.only": "Unsupported language",
    }),

  // Pagination validation
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().max(50),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  },
  // Search validation
  search: Joi.string().min(1).max(100).trim().messages({
    "string.min": "Search query must be at least 1 character long",
    "string.max": "Search query must be at most 100 characters long",
  }),
};

/**
 * Common express-validator chains
 */
export const validationChains = {
  // ID parameter validation
  idParam: param("id")
    .isMongoId()
    .withMessage("Invalid ID format")
    .customSanitizer((value) => value.toString()),

  // Phone number validation
  phoneNumber: body("phoneNumber")
    .isMobilePhone()
    .withMessage("Invalid phone number format")
    .customSanitizer((value) => value.replace(/\s+/g, "")),

  // Email validation
  email: body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Invalid email format"),

  // Password validation
  password: body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8-128 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character"
    ),

  // Name validation
  name: body("name")
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Name must be 1-100 characters long")
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage(
      "Name must contain only letters, spaces, hyphens, and apostrophes"
    ),

  // Pagination query validation
  paginationQuery: [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("sortBy").optional().isLength({ max: 50 }).trim(),
    query("sortOrder").optional().isIn(["asc", "desc"]),
  ],
};

/**
 * Validate request body with custom validation function
 * @param {Function} validationFn - Custom validation function
 * @returns {Function} Middleware function
 */
export const customValidation = (validationFn) => {
  return async (req, res, next) => {
    try {
      const result = await validationFn(req.body, req);

      if (result.isValid === false) {
        throw new ValidationError(
          "Custom validation failed",
          result.errors || []
        );
      }

      // If validation function returns modified data, use it
      if (result.data) {
        req.body = result.data;
      }

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      logger.error("Custom validation error", {
        error: error.message,
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
        requestId: req.requestId,
      });

      throw new ValidationError("Validation error occurred");
    }
  };
};

/**
 * Sanitize and validate coordinates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validateCoordinates = (req, res, next) => {
  const { coordinates } = req.body;

  if (!coordinates) {
    return next();
  }

  // Validate coordinates format
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    throw new ValidationError(
      "Coordinates must be an array of exactly 2 numbers [longitude, latitude]"
    );
  }

  const [longitude, latitude] = coordinates;

  // Validate longitude range
  if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
    throw new ValidationError(
      "Longitude must be a number between -180 and 180"
    );
  }

  // Validate latitude range
  if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
    throw new ValidationError("Latitude must be a number between -90 and 90");
  }

  // Sanitize coordinates (round to 6 decimal places for precision)
  req.body.sanitizedCoordinates = [
    Math.round(longitude * 1000000) / 1000000,
    Math.round(latitude * 1000000) / 1000000,
  ];

  next();
};

/**
 * Global validation middleware (applied to all routes)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const validationMiddleware = (req, res, next) => {
  // Skip validation for certain routes
  const skipRoutes = ["/health", "/api", "/api/docs"];
  if (skipRoutes.includes(req.path)) {
    return next();
  }

  // Add request ID for tracking
  if (!req.requestId) {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Log request for debugging in development
  if (process.env.NODE_ENV === "development") {
    logger.debug("Request received", {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      query: req.query,
      params: req.params,
      requestId: req.requestId,
    });
  }

  next();
};

export default {
  validateWithJoi,
  handleValidationErrors,
  validate,
  validationSchemas,
  validationChains,
  customValidation,
  validateCoordinates,
  validationMiddleware,
};
