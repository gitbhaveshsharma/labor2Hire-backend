/**
 * @fileoverview Validation middleware for negotiation endpoints
 * @module validators/negotiationValidators
 * @author Labor2Hire Team
 */

import { body, param, query } from "express-validator";

/**
 * Validation for getting negotiation history
 */
export const validateGetNegotiationHistory = [
  param("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  param("otherUserId")
    .notEmpty()
    .withMessage("Other User ID is required")
    .isMongoId()
    .withMessage("Other User ID must be a valid MongoDB ObjectId"),

  query("searchId")
    .optional()
    .isString()
    .withMessage("Search ID must be a string")
    .isLength({ min: 1, max: 100 })
    .withMessage("Search ID must be between 1 and 100 characters"),
];

/**
 * Validation for getting active conversations
 */
export const validateGetActiveConversations = [
  param("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),
];

/**
 * Validation for marking messages as read
 */
export const validateMarkMessagesAsRead = [
  param("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("User ID must be a valid MongoDB ObjectId"),

  body("messageIds")
    .isArray({ min: 1 })
    .withMessage("Message IDs must be a non-empty array")
    .custom((messageIds) => {
      // Validate each message ID is a valid MongoDB ObjectId
      const invalidIds = messageIds.filter(
        (id) => !id || typeof id !== "string" || !/^[0-9a-fA-F]{24}$/.test(id)
      );
      if (invalidIds.length > 0) {
        throw new Error("All message IDs must be valid MongoDB ObjectIds");
      }
      return true;
    }),
];

/**
 * Validation for completing a negotiation
 */
export const validateCompleteNegotiation = [
  param("conversationId")
    .notEmpty()
    .withMessage("Conversation ID is required")
    .isMongoId()
    .withMessage("Conversation ID must be a valid MongoDB ObjectId"),

  body("finalWage")
    .optional()
    .isNumeric()
    .withMessage("Final wage must be a number")
    .isFloat({ min: 0 })
    .withMessage("Final wage must be a positive number"),

  body("completedBy")
    .notEmpty()
    .withMessage("Completed by user ID is required")
    .isMongoId()
    .withMessage("Completed by must be a valid MongoDB ObjectId"),
];

/**
 * Validation for sending negotiation messages via Socket.IO
 */
export const validateNegotiationMessage = {
  senderId: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Sender ID is required and must be a string",
        };
      }
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        return {
          valid: false,
          message: "Sender ID must be a valid MongoDB ObjectId",
        };
      }
      return { valid: true };
    },
  },

  receiverId: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Receiver ID is required and must be a string",
        };
      }
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        return {
          valid: false,
          message: "Receiver ID must be a valid MongoDB ObjectId",
        };
      }
      return { valid: true };
    },
  },

  message: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Message is required and must be a string",
        };
      }
      if (value.trim().length === 0) {
        return { valid: false, message: "Message cannot be empty" };
      }
      if (value.length > 1000) {
        return {
          valid: false,
          message: "Message cannot exceed 1000 characters",
        };
      }
      return { valid: true };
    },
  },

  senderType: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Sender type is required and must be a string",
        };
      }
      if (!["employer", "laborer"].includes(value)) {
        return {
          valid: false,
          message: "Sender type must be either 'employer' or 'laborer'",
        };
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

  senderName: {
    required: true,
    type: "string",
    validation: (value) => {
      if (!value || typeof value !== "string") {
        return {
          valid: false,
          message: "Sender name is required and must be a string",
        };
      }
      if (value.trim().length === 0) {
        return { valid: false, message: "Sender name cannot be empty" };
      }
      return { valid: true };
    },
  },

  status: {
    required: false,
    type: "string",
    validation: (value) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== "string") {
          return { valid: false, message: "Status must be a string" };
        }
        if (
          !["pending", "accepted", "rejected", "counter", "expired"].includes(
            value
          )
        ) {
          return {
            valid: false,
            message:
              "Status must be one of: pending, accepted, rejected, counter, expired",
          };
        }
      }
      return { valid: true };
    },
  },

  negotiationStatus: {
    required: false,
    type: "string",
    validation: (value) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== "string") {
          return {
            valid: false,
            message: "Negotiation status must be a string",
          };
        }
        if (!["active", "completed", "cancelled", "expired"].includes(value)) {
          return {
            valid: false,
            message:
              "Negotiation status must be one of: active, completed, cancelled, expired",
          };
        }
      }
      return { valid: true };
    },
  },

  notificationId: {
    required: false,
    type: "string",
    validation: (value) => {
      if (value !== undefined && value !== null) {
        if (typeof value !== "string") {
          return { valid: false, message: "Notification ID must be a string" };
        }
        if (value.trim().length === 0) {
          return { valid: false, message: "Notification ID cannot be empty" };
        }
      }
      return { valid: true };
    },
  },
};

/**
 * Function to validate negotiation message data for Socket.IO
 * @param {Object} data - Message data to validate
 * @returns {Object} Validation result
 */
export function validateNegotiationMessageData(data) {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Message data is required and must be an object"],
    };
  }

  const errors = [];

  // Validate each field
  Object.entries(validateNegotiationMessage).forEach(([field, config]) => {
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

  // Additional validation: sender cannot be the same as receiver
  if (data.senderId && data.receiverId && data.senderId === data.receiverId) {
    errors.push("Sender ID and Receiver ID cannot be the same");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default {
  validateGetNegotiationHistory,
  validateGetActiveConversations,
  validateMarkMessagesAsRead,
  validateCompleteNegotiation,
  validateNegotiationMessage,
  validateNegotiationMessageData,
};
