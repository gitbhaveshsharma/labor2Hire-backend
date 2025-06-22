/**
 * Remote Configuration Client Example
 * Demonstrates how to connect to the configuration WebSocket server
 * @author Labor2Hire Team
 */

import { io } from "socket.io-client";

/**
 * Configuration Client Class
 * Handles connection to remote configuration server and real-time updates
 */
export class ConfigClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || "http://localhost:5002";
    this.socketPath = options.socketPath || "/config-socket";
    this.socket = null;
    this.configs = {};
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;

    // Event callbacks
    this.onConfigUpdate =
      options.onConfigUpdate || this.defaultConfigUpdateHandler;
    this.onFullConfigSync =
      options.onFullConfigSync || this.defaultFullConfigSyncHandler;
    this.onConnectionChange =
      options.onConnectionChange || this.defaultConnectionChangeHandler;
    this.onError = options.onError || this.defaultErrorHandler;
  }

  /**
   * Connect to the configuration server
   */
  connect() {
    try {
      console.log(`🔗 Connecting to configuration server: ${this.serverUrl}`);

      this.socket = io(this.serverUrl, {
        path: this.socketPath,
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error("❌ Failed to connect to configuration server:", error);
      this.onError("connection_failed", error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    // Connection established
    this.socket.on("connect", () => {
      console.log("✅ Connected to configuration server");
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChange(true);

      // Request full configuration sync on connect
      this.requestFullConfig();
    });

    // Full configuration sync received
    this.socket.on("fullConfigSync", (data) => {
      console.log("📋 Full configuration sync received:", {
        screensCount: Object.keys(data.configs).length,
        screens: Object.keys(data.configs),
        serverVersion: data.serverVersion,
        timestamp: data.timestamp,
      });

      this.configs = data.configs;
      this.onFullConfigSync(data.configs, data);
    });

    // Individual screen configuration update
    this.socket.on("screenConfigUpdate", (data) => {
      console.log(`🔄 Configuration update for screen: ${data.screen}`, {
        screen: data.screen,
        updateId: data.updateId,
        timestamp: data.timestamp,
      });

      // Update local configuration
      this.configs[data.screen] = data.config;
      this.onConfigUpdate(data.screen, data.config, data);
    });

    // Test message received
    this.socket.on("testMessage", (data) => {
      console.log("🧪 Test message received:", data);
    });

    // Server health check response
    this.socket.on("pong", (data) => {
      console.log("🏓 Pong received:", data.timestamp);
    });

    // Error handling
    this.socket.on("error", (error) => {
      console.error("❌ WebSocket error:", error);
      this.onError("websocket_error", error);
    });

    // Connection lost
    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from configuration server:", reason);
      this.isConnected = false;
      this.onConnectionChange(false, reason);

      // Attempt reconnection
      if (reason === "io server disconnect") {
        // Server initiated disconnect, don't reconnect
        console.log("Server initiated disconnect, not attempting reconnection");
      } else {
        this.attemptReconnection();
      }
    });

    // Server shutdown notice
    this.socket.on("serverShutdown", (data) => {
      console.log("🔌 Server shutdown notice:", data);
      this.onError("server_shutdown", data);
    });

    // Connection error
    this.socket.on("connect_error", (error) => {
      console.error("❌ Connection error:", error.message);
      this.onError("connection_error", error);
      this.attemptReconnection();
    });
  }

  /**
   * Request full configuration from server
   */
  requestFullConfig() {
    if (this.socket && this.isConnected) {
      console.log("📥 Requesting full configuration sync...");
      this.socket.emit("requestFullConfig");
    }
  }

  /**
   * Request specific screen configuration
   * @param {string} screenName - Name of the screen
   */
  requestScreenConfig(screenName) {
    if (this.socket && this.isConnected) {
      console.log(`📥 Requesting configuration for screen: ${screenName}`);
      this.socket.emit("requestScreenConfig", screenName);
    }
  }

  /**
   * Send ping to server for health check
   */
  ping() {
    if (this.socket && this.isConnected) {
      console.log("🏓 Sending ping to server...");
      this.socket.emit("ping");
    }
  }

  /**
   * Get current configuration for a screen
   * @param {string} screenName - Name of the screen
   * @returns {Object|null} Configuration object or null
   */
  getScreenConfig(screenName) {
    return this.configs[screenName] || null;
  }

  /**
   * Get all current configurations
   * @returns {Object} All configurations
   */
  getAllConfigs() {
    return { ...this.configs };
  }

  /**
   * Check if client is connected
   * @returns {boolean} Connection status
   */
  isClientConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  /**
   * Attempt reconnection to server
   */
  attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(
        `❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`
      );
      this.onError("max_reconnect_attempts_reached", null);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`
    );

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      console.log("🔌 Disconnecting from configuration server...");
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.onConnectionChange(false, "manual_disconnect");
    }
  }

  /**
   * Default configuration update handler
   * @param {string} screen - Screen name
   * @param {Object} config - Updated configuration
   * @param {Object} data - Full update data
   */
  defaultConfigUpdateHandler(screen, config, data) {
    console.log(`📱 Configuration updated for ${screen}:`, {
      screen,
      version: config.version,
      lastUpdated: config.lastUpdated,
    });
  }

  /**
   * Default full configuration sync handler
   * @param {Object} configs - All configurations
   * @param {Object} data - Full sync data
   */
  defaultFullConfigSyncHandler(configs, data) {
    console.log("📋 Full configuration sync completed:", {
      totalScreens: Object.keys(configs).length,
      screens: Object.keys(configs),
      serverVersion: data.serverVersion,
    });
  }

  /**
   * Default connection change handler
   * @param {boolean} connected - Connection status
   * @param {string} reason - Reason for change
   */
  defaultConnectionChangeHandler(connected, reason) {
    console.log(
      `🔗 Connection status changed: ${connected ? "Connected" : "Disconnected"}`,
      {
        connected,
        reason: reason || "unknown",
      }
    );
  }

  /**
   * Default error handler
   * @param {string} type - Error type
   * @param {Object} error - Error object
   */
  defaultErrorHandler(type, error) {
    console.error(`❌ Configuration client error [${type}]:`, error);
  }
}

// Example usage
async function exampleUsage() {
  console.log("🚀 Starting Remote Configuration Client Example...\n");

  // Create configuration client
  const configClient = new ConfigClient({
    serverUrl: "http://localhost:5002",
    onConfigUpdate: (screen, config, data) => {
      console.log(`\n🎯 CUSTOM HANDLER - Screen "${screen}" updated:`);
      console.log(`   Last Updated: ${config.lastUpdated}`);
      console.log(`   Version: ${config.version}`);
      console.log(`   Update ID: ${data.updateId}`);
    },
    onFullConfigSync: (configs, data) => {
      console.log(`\n📋 CUSTOM HANDLER - Full sync completed:`);
      console.log(`   Total Screens: ${Object.keys(configs).length}`);
      console.log(`   Server Version: ${data.serverVersion}`);
      Object.keys(configs).forEach((screen) => {
        console.log(`   - ${screen}: v${configs[screen].version}`);
      });
    },
    onConnectionChange: (connected, reason) => {
      console.log(
        `\n🔗 CUSTOM HANDLER - Connection ${connected ? "established" : "lost"}`
      );
      if (reason) console.log(`   Reason: ${reason}`);
    },
  });

  // Connect to server
  configClient.connect();

  // Simulate some interactions after connection
  setTimeout(() => {
    if (configClient.isClientConnected()) {
      console.log("\n🧪 Testing client interactions...");

      // Request specific screen config
      configClient.requestScreenConfig("Auth");

      // Send ping
      configClient.ping();

      // Get current configs
      const authConfig = configClient.getScreenConfig("Auth");
      if (authConfig) {
        console.log(
          `\n📱 Current Auth screen config version: ${authConfig.version}`
        );
      }
    }
  }, 2000);

  // Keep the example running
  console.log("\n⏰ Client will keep running. Press Ctrl+C to exit.\n");
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error);
}

export default ConfigClient;
