/**
 * @fileoverview Connection controller for handling connection-related API endpoints
 * @module controllers/ConnectionController
 * @author Labor2Hire Team
 */

import logger from "../../../config/logger.js";
import { validationResult } from "express-validator";

/**
 * ConnectionController handles HTTP requests for socket connections
 */
export class ConnectionController {
  constructor(socketManager) {
    this.socketManager = socketManager;
  }

  /**
   * Check if a user is connected
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async checkConnection(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { userId } = req.params;

      logger.debug("Checking connection status", { userId });

      const isConnectedAsLaborer =
        this.socketManager.isLaborerConnected(userId);
      const isConnectedAsEmployer =
        this.socketManager.isEmployerConnected(userId);
      const isConnected = isConnectedAsLaborer || isConnectedAsEmployer;

      let userType = null;
      if (isConnectedAsLaborer) userType = "laborer";
      else if (isConnectedAsEmployer) userType = "employer";

      logger.debug(
        `Connection check for user ${userId}: ${isConnected} (${userType})`
      );

      return res.json({
        success: true,
        userId,
        isConnected,
        userType,
        connectedAsLaborer: isConnectedAsLaborer,
        connectedAsEmployer: isConnectedAsEmployer,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error checking connection status", {
        userId: req.params?.userId,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get connection statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConnectionStats(req, res) {
    try {
      const stats = this.socketManager.getConnectionStats();

      return res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error retrieving connection statistics", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get all connected users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getConnectedUsers(req, res) {
    try {
      const { userType } = req.query;

      let connectedUsers;
      if (userType === "laborer") {
        connectedUsers = this.socketManager.getConnectedLaborers();
      } else if (userType === "employer") {
        connectedUsers = this.socketManager.getConnectedEmployers();
      } else {
        // Return both types
        connectedUsers = {
          laborers: this.socketManager.getConnectedLaborers(),
          employers: this.socketManager.getConnectedEmployers(),
        };
      }

      return res.json({
        success: true,
        connectedUsers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error retrieving connected users", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Send a test notification to a specific user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async sendTestNotification(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { userId } = req.params;
      const { message, type = "test" } = req.body;

      logger.info("Sending test notification", { userId, type });

      const testNotification = {
        type,
        message: message || "This is a test notification",
        timestamp: new Date().toISOString(),
        notificationId: `test_${userId}_${Date.now()}`,
      };

      const result = await this.socketManager.sendNotificationToUser(
        userId,
        testNotification,
        type
      );

      return res.json({
        success: result.success,
        message: result.success
          ? "Test notification sent successfully"
          : "Failed to send test notification",
        delivered: result.success,
        error: result.error || null,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error sending test notification", {
        userId: req.params?.userId,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Disconnect a specific user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async disconnectUser(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { userId } = req.params;
      const { reason = "Admin disconnect" } = req.body;

      logger.info("Disconnecting user", { userId, reason });

      const result = this.socketManager.disconnectUser(userId, reason);

      return res.json({
        success: result.success,
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error disconnecting user", {
        userId: req.params?.userId,
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default ConnectionController;
