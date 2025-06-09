/**
 * @fileoverview Socket Manager service for real-time communication
 * @module services/SocketManager
 * @author Labor2Hire Team
 */

import { Server } from "socket.io";
import { logger } from "../../../config/logger.js";
import NegotiationService from "./NegotiationService.js";
import NotificationService from "./NotificationService.js";
import axios from "axios";

// Maps to store connected users
export const connectedLaborers = new Map();
export const connectedEmployers = new Map();

// Map to track job statuses
export const jobStatusMap = new Map();

/**
 * Enhanced Socket.IO setup with improved error handling and security
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO instance
 */
export function setupSocketIO(server) {
  // Configure Socket.io with enhanced security options
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB limit for security
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify token with auth service
      // Note: In a real implementation, you'd verify the JWT token here
      socket.token = token;
      next();
    } catch (error) {
      logger.error("Socket authentication failed:", error);
      next(new Error("Authentication failed"));
    }
  });

  // Setup job status listener
  setupJobStatusListener(io);

  // Main connection handler
  io.on("connection", (socket) => {
    logger.info(`New socket connection established: ${socket.id}`);

    // Register laborer
    socket.on("registerLaborer", async (userId, callback) => {
      await handleUserRegistration(socket, userId, "laborer", callback);
    });

    // Register employer
    socket.on("registerEmployer", async (userId, callback) => {
      await handleUserRegistration(socket, userId, "employer", callback);
    });

    // Handle new search data (job notifications)
    socket.on("newSearchData", async (searchData) => {
      try {
        await NotificationService.handleJobNotification(io, searchData);
        logger.info("New search data processed successfully", {
          searchId: searchData.searchId,
        });
      } catch (error) {
        logger.error("Error processing new search data:", error);
        socket.emit("error", { message: "Failed to process job notification" });
      }
    });

    // Handle negotiation messages
    socket.on("sendNegotiation", async (data, callback) => {
      try {
        logger.info(`Received negotiation message from socket ${socket.id}`, {
          senderId: data?.senderId,
          receiverId: data?.receiverId,
          senderName: data?.senderName,
        });

        const result = await NegotiationService.handleNegotiationMessage(
          io,
          data
        );

        if (typeof callback === "function") {
          callback(result);
        }
      } catch (error) {
        logger.error("Error handling negotiation message:", error);
        if (typeof callback === "function") {
          callback({ success: false, message: "Failed to process message" });
        }
      }
    });

    // Handle job booking
    socket.on("jobBooked", ({ searchId }) => {
      if (searchId) {
        jobStatusMap.set(searchId, "booked");
        logger.info(`Job booked: ${searchId}`);

        // Notify all connected users about job booking
        io.emit("jobStatusUpdate", { searchId, status: "booked" });
      }
    });

    // Handle message read status
    socket.on("markMessageRead", async (data, callback) => {
      try {
        const result = await NegotiationService.markMessageAsRead(
          data.messageId,
          data.userId
        );
        if (typeof callback === "function") {
          callback(result);
        }
      } catch (error) {
        logger.error("Error marking message as read:", error);
        if (typeof callback === "function") {
          callback({
            success: false,
            message: "Failed to mark message as read",
          });
        }
      }
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      const { receiverId, isTyping } = data;
      const targetSocket = getSocketIdForUser(receiverId);

      if (targetSocket) {
        io.to(targetSocket).emit("userTyping", {
          senderId: socket.userId,
          isTyping,
        });
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      handleUserDisconnection(socket, reason);
    });

    // Error handler for socket events
    socket.on("error", (error) => {
      logger.error("Socket error", {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
      });
    });
  });

  logger.info("Socket.IO server setup completed");
  return io;
}

/**
 * Handle user registration (laborer or employer)
 * @param {Object} socket - Socket instance
 * @param {string} userId - User ID
 * @param {string} userType - 'laborer' or 'employer'
 * @param {Function} callback - Response callback
 */
async function handleUserRegistration(socket, userId, userType, callback) {
  if (!userId) {
    logger.warn(
      `Invalid registration attempt with empty userId from socket ${socket.id}`
    );
    if (typeof callback === "function") {
      callback({ success: false, message: "Invalid userId" });
    }
    return;
  }

  try {
    // Fetch user information
    const userInfo = await getUserInfo(userId, socket.token);

    if (!userInfo || !userInfo.name) {
      throw new Error("User information is incomplete or missing name");
    }

    // Store user connection
    const connectionData = {
      socketId: socket.id,
      name: userInfo.name,
      connectedAt: new Date().toISOString(),
    };

    const connectionMap =
      userType === "laborer" ? connectedLaborers : connectedEmployers;
    connectionMap.set(userId, connectionData);

    // Set socket properties
    socket.userId = userId;
    socket.userType = userType;

    logger.info(
      `${userType} registered: ${userInfo.name} (${userId}) with socket ${socket.id}`
    );
    logger.info(`Currently connected ${userType}s: ${connectionMap.size}`);

    if (typeof callback === "function") {
      callback({
        success: true,
        message: "Successfully registered",
        userName: userInfo.name,
        userType,
      });
    }
  } catch (error) {
    logger.error(`Failed to register ${userType} ${userId}:`, error);
    if (typeof callback === "function") {
      callback({
        success: false,
        message: error.message || `Failed to register ${userType}`,
      });
    }
  }
}

/**
 * Handle user disconnection
 * @param {Object} socket - Socket instance
 * @param {string} reason - Disconnect reason
 */
function handleUserDisconnection(socket, reason) {
  logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);

  if (socket.userId) {
    if (socket.userType === "laborer") {
      connectedLaborers.delete(socket.userId);
      logger.info(`Laborer ${socket.userId} disconnected`);
    } else if (socket.userType === "employer") {
      connectedEmployers.delete(socket.userId);
      logger.info(`Employer ${socket.userId} disconnected`);
    }

    logger.info(
      `Remaining connections - Laborers: ${connectedLaborers.size}, Employers: ${connectedEmployers.size}`
    );
  }
}

/**
 * Get socket ID for a specific user
 * @param {string} userId - User ID
 * @returns {string|null} Socket ID or null if not found
 */
export function getSocketIdForUser(userId) {
  // Check laborers first
  const laborer = connectedLaborers.get(userId);
  if (laborer) {
    return laborer.socketId;
  }

  // Check employers
  const employer = connectedEmployers.get(userId);
  if (employer) {
    return employer.socketId;
  }

  return null;
}

/**
 * Get user information from user service
 * @param {string} userId - User ID
 * @param {string} token - Authorization token
 * @returns {Object} User information
 */
async function getUserInfo(userId, token) {
  try {
    const response = await axios.post(
      `${process.env.USER_SERVICE_URL || "http://localhost:5001"}/api/users/batch`,
      { userIds: [userId] },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000,
      }
    );

    return Array.isArray(response.data) ? response.data[0] : response.data[0];
  } catch (error) {
    logger.error("Failed to fetch user information:", error);
    throw new Error("Failed to fetch user information");
  }
}

/**
 * Setup job status listener
 * @param {Object} io - Socket.IO instance
 */
function setupJobStatusListener(io) {
  if (!io || typeof io.on !== "function") {
    logger.error(
      "Invalid Socket.IO instance provided to setupJobStatusListener"
    );
    return;
  }

  io.on("jobBooked", ({ searchId }) => {
    if (!searchId) {
      logger.warn("jobBooked event received without a valid searchId");
      return;
    }

    logger.info(`Job booked event received for searchId: ${searchId}`);
    jobStatusMap.set(searchId, "booked");
  });

  logger.info("Job status listener successfully set up");
}

/**
 * Check if user is connected
 * @param {string} userId - User ID
 * @returns {boolean} Connection status
 */
export function isUserConnected(userId) {
  return connectedLaborers.has(userId) || connectedEmployers.has(userId);
}

/**
 * Get all connected users
 * @returns {Object} Connected users data
 */
export function getConnectedUsers() {
  return {
    laborers: Array.from(connectedLaborers.entries()).map(([id, data]) => ({
      userId: id,
      ...data,
    })),
    employers: Array.from(connectedEmployers.entries()).map(([id, data]) => ({
      userId: id,
      ...data,
    })),
  };
}

/**
 * SocketManager class for managing socket connections
 */
export class SocketManager {
  constructor(io) {
    this.io = io;
  }

  /**
   * Check if a laborer is connected
   * @param {string} userId - User ID
   * @returns {boolean} Connection status
   */
  isLaborerConnected(userId) {
    return connectedLaborers.has(userId);
  }

  /**
   * Check if an employer is connected
   * @param {string} userId - User ID
   * @returns {boolean} Connection status
   */
  isEmployerConnected(userId) {
    return connectedEmployers.has(userId);
  }

  /**
   * Get connected laborers count
   * @returns {number} Number of connected laborers
   */
  getConnectedLaborersCount() {
    return connectedLaborers.size;
  }

  /**
   * Get connected employers count
   * @returns {number} Number of connected employers
   */
  getConnectedEmployersCount() {
    return connectedEmployers.size;
  }

  /**
   * Get connected laborers
   * @returns {Array} Array of connected laborers
   */
  getConnectedLaborers() {
    return Array.from(connectedLaborers.entries()).map(([id, data]) => ({
      userId: id,
      ...data,
    }));
  }

  /**
   * Get connected employers
   * @returns {Array} Array of connected employers
   */
  getConnectedEmployers() {
    return Array.from(connectedEmployers.entries()).map(([id, data]) => ({
      userId: id,
      ...data,
    }));
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      totalConnections: connectedLaborers.size + connectedEmployers.size,
      connectedLaborers: connectedLaborers.size,
      connectedEmployers: connectedEmployers.size,
      laborers: this.getConnectedLaborers(),
      employers: this.getConnectedEmployers(),
    };
  }

  /**
   * Send notification to a laborer
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Result of notification sending
   */
  async sendNotificationToLaborer(userId, notification) {
    try {
      const laborer = connectedLaborers.get(userId);
      if (!laborer) {
        return {
          success: false,
          error: "Laborer not connected",
        };
      }

      return new Promise((resolve) => {
        this.io
          .to(laborer.socketId)
          .emit("matchNotification", notification, (ack) => {
            resolve({ success: true, acknowledged: !!ack });
          });

        // Timeout in case no acknowledgment
        setTimeout(() => {
          resolve({ success: true, acknowledged: false });
        }, 1000);
      });
    } catch (error) {
      logger.error("Error sending notification to laborer:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification to any user (laborer or employer)
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   * @param {string} eventName - Socket event name
   * @returns {Promise<Object>} Result of notification sending
   */
  async sendNotificationToUser(
    userId,
    notification,
    eventName = "notification"
  ) {
    try {
      const socketId = getSocketIdForUser(userId);
      if (!socketId) {
        return {
          success: false,
          error: "User not connected",
        };
      }

      return new Promise((resolve) => {
        this.io.to(socketId).emit(eventName, notification, (ack) => {
          resolve({ success: true, acknowledged: !!ack });
        });

        // Timeout in case no acknowledgment
        setTimeout(() => {
          resolve({ success: true, acknowledged: false });
        }, 1000);
      });
    } catch (error) {
      logger.error("Error sending notification to user:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Disconnect a specific user
   * @param {string} userId - User ID
   * @param {string} reason - Disconnect reason
   * @returns {Object} Result of disconnection
   */
  disconnectUser(userId, reason = "Admin disconnect") {
    try {
      const socketId = getSocketIdForUser(userId);
      if (!socketId) {
        return {
          success: false,
          message: "User not connected",
        };
      }

      // Find the socket and disconnect it
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
        logger.info(`User ${userId} disconnected by admin. Reason: ${reason}`);
        return {
          success: true,
          message: "User disconnected successfully",
        };
      } else {
        return {
          success: false,
          message: "Socket not found",
        };
      }
    } catch (error) {
      logger.error("Error disconnecting user:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
