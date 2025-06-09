/**
 * @fileoverview Negotiation controller for handling negotiation-related API endpoints
 * @module controllers/NegotiationController
 * @author Labor2Hire Team
 */

import NegotiationService from "../services/NegotiationService.js";
import logger from "../../../config/logger.js";
import { validationResult } from "express-validator";

/**
 * NegotiationController handles HTTP requests for negotiations
 */
export class NegotiationController {
  constructor() {
    this.negotiationService = NegotiationService;
  }

  /**
   * Get negotiation history between two users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getNegotiationHistory(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { userId, otherUserId } = req.params;
      const { searchId } = req.query;

      logger.info("Retrieving negotiation history", {
        userId,
        otherUserId,
        searchId,
      });

      const result = await this.negotiationService.getConversationHistory(
        userId,
        otherUserId,
        searchId
      );

      if (!result.success) {
        return res.status(500).json({
          error: result.error || "Failed to retrieve negotiation history",
        });
      }

      logger.debug("Retrieved negotiation history", {
        userId,
        otherUserId,
        messageCount: result.messages.length,
      });

      return res.json({
        success: true,
        userId,
        otherUserId,
        searchId,
        messages: result.messages,
        conversation: result.conversation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error retrieving negotiation history", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get all active conversations for a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActiveConversations(req, res) {
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

      logger.info("Retrieving active conversations", { userId });

      const result =
        await this.negotiationService.getActiveConversations(userId);

      if (!result.success) {
        return res.status(500).json({
          error: result.error || "Failed to retrieve conversations",
        });
      }

      return res.json({
        success: true,
        userId,
        conversations: result.conversations,
        count: result.conversations.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error retrieving active conversations", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Mark messages as read
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async markMessagesAsRead(req, res) {
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
      const { messageIds } = req.body;

      logger.info("Marking messages as read", {
        userId,
        messageCount: messageIds?.length,
      });

      const result = await this.negotiationService.markMessagesAsRead(
        messageIds,
        userId
      );

      if (!result.success) {
        return res.status(500).json({
          error: result.error || "Failed to mark messages as read",
        });
      }

      return res.json({
        success: true,
        markedCount: result.modifiedCount,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error marking messages as read", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Complete a negotiation
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async completeNegotiation(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { conversationId } = req.params;
      const { finalWage, completedBy } = req.body;

      logger.info("Completing negotiation", {
        conversationId,
        finalWage,
        completedBy,
      });

      const result = await this.negotiationService.completeConversation(
        conversationId,
        finalWage,
        completedBy
      );

      if (!result.success) {
        return res.status(500).json({
          error: result.error || "Failed to complete negotiation",
        });
      }

      return res.json({
        success: true,
        conversation: result.conversation,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error completing negotiation", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Get negotiation statistics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getStats(req, res) {
    try {
      const stats = await this.negotiationService.getStats();

      return res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error retrieving negotiation stats", {
        error: error.message,
        stack: error.stack,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default NegotiationController;
