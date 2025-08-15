/**
 * WebSocket Server for Real-time Configuration Updates
 * Manages WebSocket connections and broadcasts configuration changes
 * @author Labor2Hire Team
 */

import { Server } from "socket.io";
import { logger } from "../../config/logger.js";
import configManager from "./configManager.js";

/**
 * Connected clients map
 * Stores active WebSocket connections with metadata
 */
const connectedClients = new Map();

/**
 * Configuration WebSocket Server
 * Handles real-time configuration broadcasting
 */
export class ConfigWebSocketServer {
  constructor() {
    this.io = null;
    this.connectionCount = 0;
    this.broadcastCount = 0;
  }

  /**
   * Initialize WebSocket server
   * @param {Object} server - HTTP server instance
   */
  initialize(server) {
    try {
      // Close existing Socket.IO server if it exists
      if (this.io) {
        logger.info(
          "Closing existing WebSocket server before reinitializing..."
        );
        this.disconnectAllClients("Server restarting");
        this.io.close();
        this.io = null;
      }

      // Clear connected clients map on restart
      connectedClients.clear();
      this.connectionCount = 0;
      this.broadcastCount = 0;

      // Configure Socket.IO with optimized settings for stability
      this.io = new Server(server, {
        cors: {
          origin:
            process.env.NODE_ENV === "production"
              ? process.env.ALLOWED_ORIGINS?.split(",") || []
              : [
                  "http://localhost:3000",
                  "http://localhost:5173",
                  "http://192.168.0.105:5001",
                  "http://192.168.0.105:3000",
                  // Allow any localhost port for development
                  /^http:\/\/localhost:\d+$/,
                  // Allow any IP in the 192.168.0.x range for local network
                  /^http:\/\/192\.168\.0\.\d+:\d+$/,
                ],
          methods: ["GET", "POST"],
          credentials: true,
        },
        // Optimized ping settings for stability
        pingTimeout: 60000, // Increased back to 60s for stability
        pingInterval: 25000, // Increased back to 25s for stability
        upgradeTimeout: 30000, // Allow more time for transport upgrades
        maxHttpBufferSize: 1e6, // 1MB limit
        transports: ["polling", "websocket"], // Prefer polling first for reliability
        path: "/config-socket",
        allowEIO3: true, // Allow Engine.IO v3 clients
        serveClient: false, // Don't serve client files
        // Additional stability settings
        destroyUpgrade: false, // Don't destroy upgrade requests
        destroyUpgradeTimeout: 1000,
        allowUpgrades: true, // Allow transport upgrades
        cookie: false, // Disable cookies for simplicity
        httpCompression: true, // Enable compression
        perMessageDeflate: true, // Enable message compression
      });

      // Setup connection handlers
      this.setupConnectionHandlers();

      // Add server restart notification after a brief delay
      setTimeout(() => {
        this.notifyServerRestart();
      }, 1000);

      logger.info("Configuration WebSocket server initialized successfully", {
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ["polling", "websocket"],
        upgradeTimeout: 30000,
      });
    } catch (error) {
      logger.error("Failed to initialize WebSocket server:", error);
      throw error;
    }
  }

  /**
   * Setup WebSocket connection event handlers
   */
  setupConnectionHandlers() {
    this.io.on("connection", (socket) => {
      this.handleNewConnection(socket);
    });
  }

  /**
   * Handle new client connection
   * @param {Object} socket - Socket instance
   */
  async handleNewConnection(socket) {
    try {
      this.connectionCount++;

      // Store client information
      const clientInfo = {
        id: socket.id,
        connectedAt: new Date().toISOString(),
        userAgent: socket.handshake.headers["user-agent"],
        ip: socket.handshake.address,
        lastActivity: new Date().toISOString(),
        reconnected: false,
      };

      connectedClients.set(socket.id, clientInfo);

      logger.info(`New config client connected: ${socket.id}`, {
        clientId: socket.id,
        totalClients: connectedClients.size,
        userAgent: clientInfo.userAgent,
        ip: clientInfo.ip,
      });

      // Send immediate acknowledgment
      socket.emit("connectionAck", {
        clientId: socket.id,
        serverTime: new Date().toISOString(),
        message: "Connection established successfully",
      });

      // Send full configuration to new client after a brief delay
      setTimeout(async () => {
        await this.sendFullConfigToClient(socket);
      }, 100);

      // Setup client event handlers
      this.setupClientEventHandlers(socket);
    } catch (error) {
      logger.error(`Error handling new connection ${socket.id}:`, error);
      socket.emit("error", {
        message: "Connection setup failed",
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Setup event handlers for individual client
   * @param {Object} socket - Socket instance
   */
  setupClientEventHandlers(socket) {
    // Handle socket errors to prevent crashes
    socket.on("error", (error) => {
      logger.error(`Socket error from client ${socket.id}:`, {
        error: error.message,
        clientId: socket.id,
        stack: error.stack,
      });
    });

    // Handle transport errors
    socket.on("connect_error", (error) => {
      logger.warn(`Connection error for client ${socket.id}:`, {
        error: error.message,
        clientId: socket.id,
      });
    });

    // Handle client requesting full config refresh
    socket.on("requestFullConfig", async () => {
      try {
        await this.sendFullConfigToClient(socket);
        this.updateClientActivity(socket.id);
        logger.debug(`Full config sent to client: ${socket.id}`);
      } catch (error) {
        logger.error(`Error sending full config to ${socket.id}:`, error);
        socket.emit("error", {
          message: "Failed to send configuration",
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle client requesting specific screen config
    socket.on("requestScreenConfig", async (screenName) => {
      try {
        // Try to get config from in-memory store first
        let config = configManager.getScreenConfig(screenName);

        // If not available, attempt to reload from file/template (covers newly added templates)
        if (!config) {
          try {
            logger.debug(
              `Config not found in memory for ${screenName}, attempting reload from file/template`
            );
            config = await configManager.reloadScreenConfig(screenName, {
              source: "socket-request",
            });
            logger.debug(`Reload attempt finished for ${screenName}`);
          } catch (reloadErr) {
            logger.warn(`Reload attempt failed for ${screenName}:`, reloadErr);
            // leave config as null so we fall through to emitting error below
          }
        }

        if (config) {
          socket.emit("screenConfigUpdate", {
            screen: screenName,
            config: config,
            timestamp: new Date().toISOString(),
          });
          this.updateClientActivity(socket.id);
          logger.debug(
            `Screen config sent to client ${socket.id}: ${screenName}`
          );
        } else {
          socket.emit("error", {
            message: `Screen configuration not found: ${screenName}`,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        logger.error(`Error sending screen config to ${socket.id}:`, error);
        socket.emit("error", {
          message: "Failed to send screen configuration",
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle ping for connection health check
    socket.on("ping", () => {
      try {
        socket.emit("pong", { timestamp: new Date().toISOString() });
        this.updateClientActivity(socket.id);
      } catch (error) {
        logger.error(`Error sending pong to ${socket.id}:`, error);
      }
    });

    // Handle client disconnect
    socket.on("disconnect", (reason) => {
      this.handleClientDisconnect(socket.id, reason);
    });
  }

  /**
   * Notify clients about server restart
   */
  notifyServerRestart() {
    try {
      if (!this.io) {
        return;
      }

      logger.info("Notifying clients about server restart");

      // Broadcast server restart notification
      this.io.emit("serverRestarted", {
        message:
          "Server has been restarted and is ready to serve configurations",
        timestamp: new Date().toISOString(),
        serverVersion: process.env.npm_package_version || "1.0.0",
        action: "requestFullConfig", // Suggest clients to request full config
      });

      logger.info("Server restart notification sent to all clients");
    } catch (error) {
      logger.error("Error sending server restart notification:", error);
    }
  }

  /**
   * Send full configuration to a specific client
   * @param {Object} socket - Socket instance
   */
  async sendFullConfigToClient(socket) {
    try {
      const allConfigs = configManager.getAllConfigs();

      socket.emit("fullConfigSync", {
        configs: allConfigs,
        timestamp: new Date().toISOString(),
        serverVersion: process.env.npm_package_version || "1.0.0",
      });

      logger.debug(`Full configuration sent to client: ${socket.id}`, {
        screensCount: Object.keys(allConfigs).length,
        screens: Object.keys(allConfigs),
      });
    } catch (error) {
      logger.error(`Failed to send full config to client ${socket.id}:`, error);
      throw error;
    }
  }

  /**
   * Broadcast configuration update to all connected clients
   * @param {string} screen - Screen name that was updated
   * @param {Object} config - Updated configuration
   */
  async broadcastConfigUpdate(screen, config) {
    try {
      if (!this.io) {
        logger.warn(
          "WebSocket server not initialized, cannot broadcast update"
        );
        return;
      }

      const updateData = {
        screen: screen,
        config: config,
        timestamp: new Date().toISOString(),
        updateId: `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      // Broadcast to all connected clients
      this.io.emit("screenConfigUpdate", updateData);

      this.broadcastCount++;

      logger.info(`Configuration update broadcasted for screen: ${screen}`, {
        screen,
        connectedClients: connectedClients.size,
        updateId: updateData.updateId,
        broadcastCount: this.broadcastCount,
      });

      // Update activity for all clients
      for (const clientId of connectedClients.keys()) {
        this.updateClientActivity(clientId);
      }
    } catch (error) {
      logger.error(
        `Failed to broadcast config update for screen ${screen}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Broadcast full configuration sync to all clients
   * Useful when multiple configurations are updated
   */
  async broadcastFullConfigSync() {
    try {
      if (!this.io) {
        logger.warn(
          "WebSocket server not initialized, cannot broadcast full sync"
        );
        return;
      }

      const allConfigs = configManager.getAllConfigs();
      const syncData = {
        configs: allConfigs,
        timestamp: new Date().toISOString(),
        syncId: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        serverVersion: process.env.npm_package_version || "1.0.0",
      };

      // Broadcast to all connected clients
      this.io.emit("fullConfigSync", syncData);

      this.broadcastCount++;

      logger.info("Full configuration sync broadcasted to all clients", {
        connectedClients: connectedClients.size,
        screensCount: Object.keys(allConfigs).length,
        syncId: syncData.syncId,
      });
    } catch (error) {
      logger.error("Failed to broadcast full config sync:", error);
      throw error;
    }
  }

  /**
   * Handle client disconnection
   * @param {string} clientId - Client socket ID
   * @param {string} reason - Disconnect reason
   */
  handleClientDisconnect(clientId, reason) {
    const clientInfo = connectedClients.get(clientId);

    if (clientInfo) {
      const connectionDuration =
        Date.now() - new Date(clientInfo.connectedAt).getTime();

      logger.info(`Config client disconnected: ${clientId}`, {
        clientId,
        reason,
        connectionDuration: `${Math.round(connectionDuration / 1000)}s`,
        totalClients: connectedClients.size - 1,
      });

      connectedClients.delete(clientId);
    }
  }

  /**
   * Update client activity timestamp
   * @param {string} clientId - Client socket ID
   */
  updateClientActivity(clientId) {
    const clientInfo = connectedClients.get(clientId);
    if (clientInfo) {
      clientInfo.lastActivity = new Date().toISOString();
      connectedClients.set(clientId, clientInfo);
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      connectedClients: connectedClients.size,
      totalConnections: this.connectionCount,
      totalBroadcasts: this.broadcastCount,
      clients: Array.from(connectedClients.values()),
      serverStatus: this.io ? "active" : "inactive",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send a test message to all connected clients
   * @param {Object} testData - Test data to send
   */
  async sendTestBroadcast(testData = {}) {
    try {
      if (!this.io) {
        throw new Error("WebSocket server not initialized");
      }

      const testMessage = {
        type: "test",
        message: "Test broadcast from server",
        data: testData,
        timestamp: new Date().toISOString(),
        testId: `test_${Date.now()}`,
      };

      this.io.emit("testMessage", testMessage);

      logger.info("Test broadcast sent to all clients", {
        connectedClients: connectedClients.size,
        testId: testMessage.testId,
      });

      return {
        success: true,
        message: "Test broadcast sent successfully",
        clientCount: connectedClients.size,
        testId: testMessage.testId,
      };
    } catch (error) {
      logger.error("Failed to send test broadcast:", error);
      throw error;
    }
  }

  /**
   * Disconnect all clients
   * @param {string} reason - Disconnect reason
   */
  disconnectAllClients(reason = "Server shutdown") {
    try {
      if (!this.io) {
        return;
      }

      logger.info(`Disconnecting all clients. Reason: ${reason}`);

      // Send shutdown notice to all clients
      this.io.emit("serverShutdown", {
        reason,
        timestamp: new Date().toISOString(),
        message: "Server is shutting down. Please reconnect in a moment.",
      });

      // Disconnect all clients
      this.io.disconnectSockets(true);

      // Clear connected clients map
      connectedClients.clear();

      logger.info("All clients disconnected successfully");
    } catch (error) {
      logger.error("Error disconnecting clients:", error);
    }
  }

  /**
   * Close WebSocket server
   */
  close() {
    try {
      if (this.io) {
        this.disconnectAllClients("Server closing");
        this.io.close();
        this.io = null;
        logger.info("Configuration WebSocket server closed");
      }
    } catch (error) {
      logger.error("Error closing WebSocket server:", error);
    }
  }
}

// Create singleton instance
const configWebSocketServer = new ConfigWebSocketServer();

export default configWebSocketServer;
