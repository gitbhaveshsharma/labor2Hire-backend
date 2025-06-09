/**
 * @fileoverview Routes for negotiation-related endpoints
 * @module routes/negotiationRoutes
 * @author Labor2Hire Team
 */

import { Router } from "express";
import NegotiationController from "../controllers/NegotiationController.js";
import authMiddleware from "../../../middlewares/auth.js";
import {
  validateGetNegotiationHistory,
  validateGetActiveConversations,
  validateMarkMessagesAsRead,
  validateCompleteNegotiation,
} from "../validators/negotiationValidators.js";

const router = Router();
const negotiationController = new NegotiationController();

// Apply authentication middleware to all routes
router.use(authMiddleware.authenticate);

/**
 * @route GET /api/negotiations/:userId/:otherUserId
 * @desc Get negotiation history between two users
 * @access Private
 * @param {string} userId - ID of the first user
 * @param {string} otherUserId - ID of the second user
 * @param {string} [searchId] - Optional search ID to filter conversations
 */
router.get(
  "/:userId/:otherUserId",
  validateGetNegotiationHistory,
  async (req, res) => {
    await negotiationController.getNegotiationHistory(req, res);
  }
);

/**
 * @route GET /api/negotiations/:userId/conversations
 * @desc Get all active conversations for a user
 * @access Private
 * @param {string} userId - ID of the user
 */
router.get(
  "/:userId/conversations",
  validateGetActiveConversations,
  async (req, res) => {
    await negotiationController.getActiveConversations(req, res);
  }
);

/**
 * @route PUT /api/negotiations/:userId/messages/read
 * @desc Mark messages as read for a user
 * @access Private
 * @param {string} userId - ID of the user
 * @body {string[]} messageIds - Array of message IDs to mark as read
 */
router.put(
  "/:userId/messages/read",
  validateMarkMessagesAsRead,
  async (req, res) => {
    await negotiationController.markMessagesAsRead(req, res);
  }
);

/**
 * @route PUT /api/negotiations/conversations/:conversationId/complete
 * @desc Complete a negotiation conversation
 * @access Private
 * @param {string} conversationId - ID of the conversation to complete
 * @body {number} [finalWage] - Final agreed wage
 * @body {string} completedBy - User ID who completed the negotiation
 */
router.put(
  "/conversations/:conversationId/complete",
  validateCompleteNegotiation,
  async (req, res) => {
    await negotiationController.completeNegotiation(req, res);
  }
);

/**
 * @route GET /api/negotiations/stats
 * @desc Get negotiation statistics
 * @access Private
 */
router.get("/stats", async (req, res) => {
  await negotiationController.getStats(req, res);
});

export default router;
