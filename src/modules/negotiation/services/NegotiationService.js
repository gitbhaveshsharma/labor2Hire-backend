/**
 * @fileoverview Negotiation service for handling negotiation logic
 * @module services/NegotiationService
 * @author Labor2Hire Team
 */

import { logger } from "../../../config/logger.js";
import {
  NegotiationMessage,
  NegotiationConversation,
} from "../models/Negotiation.js";
import { getSocketIdForUser, jobStatusMap } from "./SocketManager.js";

/**
 * Enhanced negotiation service with improved error handling and validation
 */
class NegotiationService {
  /**
   * Handle negotiation message between users
   * @param {Object} io - Socket.IO instance
   * @param {Object} data - Negotiation message data
   * @returns {Object} Result object
   */
  async handleNegotiationMessage(io, data) {
    try {
      // Validate message data
      const validation = this.validateNegotiationData(data);
      if (!validation.isValid) {
        return { success: false, message: validation.message };
      }

      const {
        searchId,
        senderId,
        receiverId,
        message,
        wage,
        senderType,
        senderName,
      } = data;

      // Check if job is already booked
      if (jobStatusMap.get(searchId) === "booked") {
        logger.warn(`Negotiation attempt rejected for booked job: ${searchId}`);
        return { success: false, message: "This job has expired." };
      }

      // Prevent self-messaging
      if (senderId === receiverId) {
        logger.error("Self-messaging attempt detected", {
          senderId,
          receiverId,
        });
        return { success: false, message: "Cannot send messages to yourself" };
      }

      // Check if negotiation is already completed
      if (data.negotiationStatus === "completed") {
        logger.warn("Attempt to send message for completed negotiation", {
          data,
        });
        return {
          success: false,
          message: "This job has already been accepted.",
        };
      }

      // Create negotiation message object
      const negotiationMessage = {
        senderId,
        receiverId,
        searchId,
        notificationId:
          data.notificationId ||
          this.generateNotificationId(senderId, receiverId),
        message: message.trim(),
        senderType,
        senderName: senderName || "Unknown",
        wage,
        status: data.status || "pending",
        negotiationStatus: data.negotiationStatus || "active",
        timestamp: new Date().toISOString(),
        isRead: false,
      };

      logger.info("Processing negotiation message", {
        senderId,
        receiverId,
        senderName,
        searchId,
        messagePreview:
          message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      });

      // Store message in database
      await this.storeNegotiationMessage(negotiationMessage);

      // Attempt to deliver message via socket
      const deliveryResult = await this.deliverMessage(io, negotiationMessage);

      return deliveryResult;
    } catch (error) {
      logger.error("Error processing negotiation message:", error);
      return { success: false, message: "Server error occurred" };
    }
  }

  /**
   * Validate negotiation message data
   * @param {Object} data - Message data to validate
   * @returns {Object} Validation result
   */
  validateNegotiationData(data) {
    if (!data) {
      return { isValid: false, message: "No data provided" };
    }

    const required = ["senderId", "receiverId", "message", "searchId"];
    for (const field of required) {
      if (!data[field]) {
        return { isValid: false, message: `${field} is required` };
      }
    }

    if (typeof data.wage !== "number" || data.wage < 0) {
      return { isValid: false, message: "Valid wage is required" };
    }

    if (data.message.trim().length === 0) {
      return { isValid: false, message: "Message cannot be empty" };
    }

    if (data.message.length > 1000) {
      return {
        isValid: false,
        message: "Message too long (max 1000 characters)",
      };
    }

    return { isValid: true };
  }

  /**
   * Store negotiation message in database
   * @param {Object} messageData - Message data to store
   * @returns {Object} Saved message
   */
  async storeNegotiationMessage(messageData) {
    try {
      const negotiation = new NegotiationMessage(messageData);
      const savedMessage = await negotiation.save();

      logger.debug("Negotiation message stored successfully", {
        messageId: savedMessage._id,
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
      });

      return savedMessage;
    } catch (error) {
      logger.error("Failed to store negotiation message:", error);
      throw new Error("Failed to save message to database");
    }
  }

  /**
   * Deliver message via socket
   * @param {Object} io - Socket.IO instance
   * @param {Object} message - Message to deliver
   * @returns {Object} Delivery result
   */
  async deliverMessage(io, message) {
    const { receiverId } = message;
    const socketId = getSocketIdForUser(receiverId);

    if (!socketId) {
      logger.info(`Receiver ${receiverId} is not connected - message queued`);
      return {
        success: false,
        message: "Recipient not online",
        queued: true,
      };
    }

    try {
      // Send message with acknowledgment
      io.to(socketId).emit("negotiationMessage", message, (ack) => {
        if (ack) {
          logger.debug("Client acknowledged message receipt", ack);
        }
      });

      // Update delivery status in database
      await this.updateMessageDeliveryStatus(
        message.notificationId,
        "delivered"
      );

      logger.info(
        `Negotiation message delivered to ${receiverId} (socket: ${socketId})`
      );

      return {
        success: true,
        message: "Message delivered",
        deliveredAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to deliver message via socket:", error);
      return { success: false, message: "Failed to deliver message" };
    }
  }

  /**
   * Get negotiation history between two users
   * @param {string} userId1 - First user ID
   * @param {string} userId2 - Second user ID
   * @param {Object} options - Query options (limit, skip, etc.)
   * @returns {Array} Message history
   */
  async getNegotiationHistory(userId1, userId2, options = {}) {
    try {
      const { limit = 50, skip = 0, searchId } = options;

      const query = {
        $or: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      };

      if (searchId) {
        query.searchId = searchId;
      }

      const messages = await NegotiationMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate("senderId", "name phoneNumber")
        .populate("receiverId", "name phoneNumber")
        .lean();

      logger.debug(
        `Retrieved negotiation history between ${userId1} and ${userId2}`,
        {
          messageCount: messages.length,
          searchId,
        }
      );

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      logger.error("Error retrieving negotiation history:", error);
      throw new Error("Failed to retrieve negotiation history");
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID who read the message
   * @returns {Object} Update result
   */
  async markMessageAsRead(messageId, userId) {
    try {
      const message = await NegotiationMessage.findById(messageId);

      if (!message) {
        return { success: false, message: "Message not found" };
      }

      if (message.receiverId.toString() !== userId) {
        return {
          success: false,
          message: "Unauthorized to mark this message as read",
        };
      }
      if (message.isRead) {
        return { success: true, message: "Message already marked as read" };
      }

      await NegotiationMessage.findByIdAndUpdate(messageId, {
        isRead: true,
        readAt: new Date(),
      });

      logger.debug(`Message marked as read`, { messageId, userId });

      return { success: true, message: "Message marked as read" };
    } catch (error) {
      logger.error("Error marking message as read:", error);
      return { success: false, message: "Failed to mark message as read" };
    }
  }

  /**
   * Get unread message count for a user
   * @param {string} userId - User ID
   * @returns {number} Unread message count
   */ async getUnreadMessageCount(userId) {
    try {
      const count = await NegotiationMessage.countDocuments({
        receiverId: userId,
        isRead: false,
      });

      return count;
    } catch (error) {
      logger.error("Error getting unread message count:", error);
      return 0;
    }
  }

  /**
   * Update negotiation status
   * @param {string} searchId - Search/job ID
   * @param {string} status - New status
   * @returns {Object} Update result
   */
  async updateNegotiationStatus(searchId, status) {
    try {
      const validStatuses = ["active", "completed", "cancelled", "expired"];

      if (!validStatuses.includes(status)) {
        return { success: false, message: "Invalid status" };
      }

      await NegotiationMessage.updateMany(
        { searchId },
        { negotiationStatus: status }
      );

      logger.info(
        `Updated negotiation status for searchId ${searchId} to ${status}`
      );

      return { success: true, message: "Status updated successfully" };
    } catch (error) {
      logger.error("Error updating negotiation status:", error);
      return { success: false, message: "Failed to update status" };
    }
  }

  /**
   * Generate unique notification ID
   * @param {string} senderId - Sender ID
   * @param {string} receiverId - Receiver ID
   * @returns {string} Unique notification ID
   */
  generateNotificationId(senderId, receiverId) {
    return `${senderId}_${receiverId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update message delivery status
   * @param {string} notificationId - Notification ID
   * @param {string} status - Delivery status
   * @returns {Promise<void>}
   */ async updateMessageDeliveryStatus(notificationId, status) {
    try {
      const updateData = { [`${status}At`]: new Date() };

      await NegotiationMessage.findOneAndUpdate({ notificationId }, updateData);
    } catch (error) {
      logger.error("Error updating message delivery status:", error);
    }
  }

  /**
   * Get active negotiations for a user
   * @param {string} userId - User ID
   * @returns {Array} Active negotiations
   */
  async getActiveNegotiations(userId) {
    try {
      const negotiations = await NegotiationMessage.aggregate([
        {
          $match: {
            $or: [{ senderId: userId }, { receiverId: userId }],
            negotiationStatus: "active",
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: {
              searchId: "$searchId",
              otherUser: {
                $cond: {
                  if: { $eq: ["$senderId", userId] },
                  then: "$receiverId",
                  else: "$senderId",
                },
              },
            },
            lastMessage: { $first: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ["$receiverId", userId] },
                      { $eq: ["$isRead", false] },
                    ],
                  },
                  then: 1,
                  else: 0,
                },
              },
            },
          },
        },
        {
          $sort: { "lastMessage.createdAt": -1 },
        },
      ]);

      return negotiations;
    } catch (error) {
      logger.error("Error getting active negotiations:", error);
      throw new Error("Failed to retrieve active negotiations");
    }
  }
}

export default new NegotiationService();
