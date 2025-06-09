/**
 * @fileoverview Routes for connection-related endpoints
 * @module routes/connectionRoutes
 * @author Labor2Hire Team
 */

import { Router } from "express";
import ConnectionController from "../controllers/ConnectionController.js";
import authMiddleware from "../../../middlewares/auth.js";
import {
  validateCheckConnection,
  validateGetConnectedUsers,
  validateSendTestNotification,
  validateDisconnectUser,
} from "../validators/connectionValidators.js";

const router = Router();

// Initialize controller - will be properly configured when routes are registered
let connectionController;

/**
 * Configure the connection controller with socket manager
 * @param {Object} socketManager - Socket manager instance
 */
export function configureConnectionController(socketManager) {
  connectionController = new ConnectionController(socketManager);
}

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

/**
 * @route GET /api/connections/check/:userId
 * @desc Check if a user is connected
 * @access Private
 * @param {string} userId - ID of the user to check
 */
router.get("/check/:userId", validateCheckConnection, async (req, res) => {
  if (!connectionController) {
    return res.status(500).json({
      error: "Connection controller not properly configured",
    });
  }
  await connectionController.checkConnection(req, res);
});

/**
 * @route GET /api/connections/stats
 * @desc Get connection statistics
 * @access Private
 */
router.get("/stats", async (req, res) => {
  if (!connectionController) {
    return res.status(500).json({
      error: "Connection controller not properly configured",
    });
  }
  await connectionController.getConnectionStats(req, res);
});

/**
 * @route GET /api/connections/users
 * @desc Get connected users
 * @access Private
 * @query {string} [userType] - Filter by user type ('laborer' or 'employer')
 */
router.get("/users", validateGetConnectedUsers, async (req, res) => {
  if (!connectionController) {
    return res.status(500).json({
      error: "Connection controller not properly configured",
    });
  }
  await connectionController.getConnectedUsers(req, res);
});

/**
 * @route POST /api/connections/test/:userId
 * @desc Send a test notification to a specific user
 * @access Private
 * @param {string} userId - ID of the user to send notification to
 * @body {string} [message] - Test message to send
 * @body {string} [type] - Type of notification
 */
router.post("/test/:userId", validateSendTestNotification, async (req, res) => {
  if (!connectionController) {
    return res.status(500).json({
      error: "Connection controller not properly configured",
    });
  }
  await connectionController.sendTestNotification(req, res);
});

/**
 * @route DELETE /api/connections/disconnect/:userId
 * @desc Disconnect a specific user
 * @access Private
 * @param {string} userId - ID of the user to disconnect
 * @body {string} [reason] - Reason for disconnection
 */
router.delete(
  "/disconnect/:userId",
  validateDisconnectUser,
  async (req, res) => {
    if (!connectionController) {
      return res.status(500).json({
        error: "Connection controller not properly configured",
      });
    }
    await connectionController.disconnectUser(req, res);
  }
);

export default router;
