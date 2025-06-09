/**
 * Authentication Routes
 * Defines all authentication-related API endpoints
 */

import express from "express";
import * as authController from "../controllers/authController.js";
import { authValidators } from "../validators/authValidators.js";
import { authenticate } from "../../../middlewares/auth.js";
import { validate } from "../../../middlewares/validation.js";
import {
  rateLimitAuth,
  rateLimitSensitive,
} from "../../../middlewares/rateLimiting.js";
import { logger } from "../../../config/logger.js";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication service is healthy",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Public Routes (No authentication required)
 */

// User registration
router.post(
  "/register",
  rateLimitAuth,
  validate(authValidators.register),
  authController.register
);

// User login
router.post(
  "/login",
  rateLimitAuth,
  validate(authValidators.login),
  authController.login
);

// Refresh access token
router.post(
  "/refresh",
  rateLimitAuth,
  validate(authValidators.refreshToken),
  authController.refreshToken
);

// Forgot password - request reset token
router.post(
  "/forgot-password",
  rateLimitSensitive,
  validate(authValidators.forgotPassword),
  authController.forgotPassword
);

// Reset password using reset token
router.post(
  "/reset-password",
  rateLimitSensitive,
  validate(authValidators.resetPassword),
  authController.resetPassword
);

/**
 * Protected Routes (Authentication required)
 */

// Apply authentication middleware to all routes below
router.use(authenticate);

// Get current user profile
router.get("/profile", authController.getProfile);

// Update user profile
router.put(
  "/profile",
  validate(authValidators.updateProfile),
  authController.updateProfile
);

// Update user location
router.put(
  "/location",
  validate(authValidators.updateLocation),
  authController.updateLocation
);

// Toggle active status (for laborers)
router.put("/toggle-status", authController.toggleActiveStatus);

// Change password (for authenticated users)
router.put(
  "/change-password",
  rateLimitSensitive,
  validate(authValidators.changePassword),
  authController.changePassword
);

// Logout user
router.post("/logout", authController.logout);

// Verify token (for middleware use)
router.get("/verify", authController.verifyToken);

/**
 * Admin/Employer Only Routes
 */

// Get users by IDs (bulk retrieval)
router.post(
  "/users/bulk",
  validate(authValidators.getUsersByIds),
  authController.getUsersByIds
);

/**
 * Development/Testing Routes (only available in development)
 */
if (process.env.NODE_ENV === "development") {
  // Get all users (for testing purposes only)
  router.get("/dev/users", async (req, res) => {
    try {
      const User = (await import("../models/User.js")).default;
      const users = await User.find(
        {},
        "-hashedPassword -refreshToken -passwordResetToken"
      );

      res.status(200).json({
        success: true,
        message: "All users retrieved (development only)",
        data: { users },
      });
    } catch (error) {
      logger.error("Error in development users endpoint:", {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: "Failed to retrieve users",
      });
    }
  });

  // Delete user (for testing purposes only)
  router.delete("/dev/users/:userId", async (req, res) => {
    try {
      const User = (await import("../models/User.js")).default;
      const { userId } = req.params;

      await User.findByIdAndDelete(userId);

      logger.info("User deleted (development only)", { userId });

      res.status(200).json({
        success: true,
        message: "User deleted successfully (development only)",
      });
    } catch (error) {
      logger.error("Error in development delete user endpoint:", {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
      });
    }
  });

  // Reset user password (for testing purposes only)
  router.post("/dev/reset-user-password", async (req, res) => {
    try {
      const { phoneNumber, newPassword } = req.body;
      const authService = await import("../services/authService.js");

      // Generate reset token and reset password
      const resetToken =
        await authService.generatePasswordResetToken(phoneNumber);
      await authService.resetPassword(resetToken, newPassword);

      logger.info("User password reset (development only)", {
        phoneNumber: phoneNumber.slice(0, 2) + "****" + phoneNumber.slice(-2),
      });

      res.status(200).json({
        success: true,
        message: "Password reset successfully (development only)",
      });
    } catch (error) {
      logger.error("Error in development reset password endpoint:", {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
      });
    }
  });
}

/**
 * Error handling middleware for authentication routes
 */
router.use((error, req, res, next) => {
  logger.error("Authentication route error:", {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    user: req.user ? { id: req.user.id, role: req.user.role } : null,
  });

  // Handle specific error types
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.errors,
    });
  }

  if (error.name === "AuthenticationError") {
    return res.status(401).json({
      success: false,
      message: error.message || "Authentication failed",
    });
  }

  if (error.name === "AuthorizationError") {
    return res.status(403).json({
      success: false,
      message: error.message || "Insufficient permissions",
    });
  }

  if (error.name === "MongoError" && error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Phone number already registered",
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && {
      error: error.message,
      stack: error.stack,
    }),
  });
});

/**
 * Route not found handler
 */
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Authentication route not found: ${req.method} ${req.originalUrl}`,
  });
});

export default router;
