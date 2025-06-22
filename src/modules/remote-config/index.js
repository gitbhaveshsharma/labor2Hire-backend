/**
 * Remote Configuration Module Index
 * Exports all remote configuration module components
 * @author Labor2Hire Team
 */

// Core services
export { default as configManager } from "./configManager.js";
export { default as configWebSocketServer } from "./websocketServer.js";

// API routes
export { default as configRoutes } from "./routes.js";

// Module initialization function
export async function initializeRemoteConfigModule(server) {
  try {
    // Load all configurations into memory
    await configManager.loadAllConfigs();

    // Initialize WebSocket server
    configWebSocketServer.initialize(server);

    console.log("✅ Remote Configuration Module initialized successfully");

    return {
      configManager,
      configWebSocketServer,
      status: "initialized",
    };
  } catch (error) {
    console.error(
      "❌ Failed to initialize Remote Configuration Module:",
      error
    );
    throw error;
  }
}

// Module metadata
export const moduleInfo = {
  name: "remote-config",
  version: "1.0.0",
  description:
    "Real-time remote configuration system for dynamic app configuration",
  endpoints: [
    "GET /api/config/health",
    "GET /api/config/all",
    "GET /api/config/screen/:screenName",
    "POST /api/config/update",
    "POST /api/config/update-bulk",
    "POST /api/config/reload/:screenName",
    "GET /api/config/stats",
    "POST /api/config/test-broadcast",
    "GET /api/config/websocket/stats",
  ],
  websocketEndpoint: "/config-socket",
  features: [
    "Real-time configuration updates via WebSocket",
    "JSON file-based configuration storage",
    "In-memory configuration caching",
    "Bulk configuration updates",
    "Configuration validation and schema enforcement",
    "Client connection management and statistics",
    "Configuration reload from files",
    "Test broadcasting capabilities",
    "Comprehensive logging and error handling",
  ],
  dependencies: ["socket.io", "express", "express-validator", "winston"],
  configFiles: ["configs/Auth.json", "configs/Home.json"],
};

export default {
  configManager,
  configWebSocketServer,
  configRoutes,
  initializeRemoteConfigModule,
  moduleInfo,
};
