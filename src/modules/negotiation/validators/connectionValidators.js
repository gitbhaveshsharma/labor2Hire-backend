/**
 * @fileoverview Validation middleware for connection endpoints
 * @module validators/connectionValidators
 * @author Labor2Hire Team
 */

import { body, param, query } from "express-validator";

/**
 * Validation for checking connection status
 */
export const validateCheckConnection = [
  param("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

/**
 * Validation for getting connected users
 */
export const validateGetConnectedUsers = [
  query("userType")
    .optional()
    .isIn(["laborer", "employer"])
    .withMessage("User type must be either 'laborer' or 'employer'"),
];

/**
 * Validation for sending test notification
 */
export const validateSendTestNotification = [
  param("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  body("message")
    .optional()
    .isString()
    .withMessage("Message must be a string")
    .isLength({ min: 1, max: 500 })
    .withMessage("Message must be between 1 and 500 characters"),

  body("type")
    .optional()
    .isString()
    .withMessage("Type must be a string")
    .isIn(["test", "notification", "alert", "info"])
    .withMessage("Type must be one of: test, notification, alert, info"),
];

/**
 * Validation for disconnecting a user
 */
export const validateDisconnectUser = [
  param("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  body("reason")
    .optional()
    .isString()
    .withMessage("Reason must be a string")
    .isLength({ min: 1, max: 200 })
    .withMessage("Reason must be between 1 and 200 characters"),
];

/**
 * Validation for Socket.IO user registration
 */
export const validateUserRegistration = {
  userId: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "User ID is required and must be a string",
        };
      }
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        return {
          valid: false,
          message: "User ID must be a valid MongoDB ObjectId",
        };
      }
      return { valid: true };
    },
  },

  userType: {
    required: false,
    type: "string",
    validation: (value) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== "string") {
          return { valid: false, message: "User type must be a string" };
        }
        if (!["laborer", "employer"].includes(value)) {
          return {
            valid: false,
            message: "User type must be either 'laborer' or 'employer'",
          };
        }
      }
      return { valid: true };
    },
  },
};

/**
 * Function to validate user registration data for Socket.IO
 * @param {Object} data - Registration data to validate
 * @returns {Object} Validation result
 */
export function validateUserRegistrationData(data) {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Registration data is required and must be an object"],
    };
  }

  const errors = [];

  // Validate each field
  Object.entries(validateUserRegistration).forEach(([field, config]) => {
    const value = data[field];

    // Check if required field is present
    if (config.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      return;
    }

    // Skip validation for optional fields that are not provided
    if (!config.required && (value === undefined || value === null)) {
      return;
    }

    // Run field-specific validation
    const result = config.validation(value);
    if (!result.valid) {
      errors.push(result.message);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validation for search data notifications
 */
export const validateSearchData = {
  searchId: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Search ID is required and must be a string",
        };
      }
      if (value.trim().length === 0) {
        return { valid: false, message: "Search ID cannot be empty" };
      }
      return { valid: true };
    },
  },

  employerId: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Employer ID is required and must be a string",
        };
      }
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        return {
          valid: false,
          message: "Employer ID must be a valid MongoDB ObjectId",
        };
      }
      return { valid: true };
    },
  },

  employerName: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Employer name is required and must be a string",
        };
      }
      if (value.trim().length === 0) {
        return { valid: false, message: "Employer name cannot be empty" };
      }
      return { valid: true };
    },
  },

  wage: {
    required: true,
    type: "number",
    validation: (value) => {
      if (value === undefined || value === null) {
        return { valid: false, message: "Wage is required" };
      }
      if (typeof value !== "number" || isNaN(value)) {
        return { valid: false, message: "Wage must be a valid number" };
      }
      if (value < 0) {
        return { valid: false, message: "Wage must be a positive number" };
      }
      return { valid: true };
    },
  },

  description: {
    required: false,
    type: "string",
    validation: (value) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== "string") {
          return { valid: false, message: "Description must be a string" };
        }
        if (value.length > 500) {
          return {
            valid: false,
            message: "Description cannot exceed 500 characters",
          };
        }
      }
      return { valid: true };
    },
  },

  matchedLaborers: {
    required: true,
    type: "array",
    validation: (value) => {
      if (!Array.isArray(value)) {
        return { valid: false, message: "Matched laborers must be an array" };
      }
      if (value.length === 0) {
        return {
          valid: false,
          message: "Matched laborers array cannot be empty",
        };
      }

      // Validate each laborer object
      for (let i = 0; i < value.length; i++) {
        const laborer = value[i];
        if (!laborer || typeof laborer !== "object") {
          return {
            valid: false,
            message: `Laborer at index ${i} must be an object`,
          };
        }
        if (!laborer.userId || typeof laborer.userId !== "string") {
          return {
            valid: false,
            message: `Laborer at index ${i} must have a valid userId`,
          };
        }
        if (!/^[0-9a-fA-F]{24}$/.test(laborer.userId)) {
          return {
            valid: false,
            message: `Laborer at index ${i} must have a valid MongoDB ObjectId as userId`,
          };
        }
      }

      return { valid: true };
    },
  },
};

/**
 * Function to validate search data for notifications
 * @param {Object} data - Search data to validate
 * @returns {Object} Validation result
 */
export function validateSearchDataForNotification(data) {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Search data is required and must be an object"],
    };
  }

  const errors = [];

  // Validate each field
  Object.entries(validateSearchData).forEach(([field, config]) => {
    const value = data[field];

    // Check if required field is present
    if (config.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      return;
    }

    // Skip validation for optional fields that are not provided
    if (!config.required && (value === undefined || value === null)) {
      return;
    }

    // Run field-specific validation
    const result = config.validation(value);
    if (!result.valid) {
      errors.push(result.message);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  validateCheckConnection,
  validateGetConnectedUsers,
  validateSendTestNotification,
  validateDisconnectUser,
  validateUserRegistration,
  validateUserRegistrationData,
  validateSearchData,
  validateSearchDataForNotification,
};
