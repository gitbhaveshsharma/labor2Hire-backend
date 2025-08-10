/**
 * Remote Configuration Module Index
 * Exports all remote configuration module components
 * @author Labor2Hire Team
 */

// Core services
import configManager from "./configManager.js";
import configWebSocketServer from "./websocketServer.js";

// API routes
import configRoutes from "./routes.js";

// Re-export the modules as named exports for external use.
// The import statements above make them available in this file's scope.
export { configManager, configWebSocketServer, configRoutes };

// Module initialization function
export async function initializeRemoteConfigModule(server) {
  try {
    console.log("🔧 Initializing Remote Configuration Module...");

    // Clear any existing configuration cache to ensure fresh start
    try {
      await configManager.clearAllCache();
      console.log("🗑️ Cleared existing configuration cache");
    } catch (cacheError) {
      console.warn(
        "⚠️ Could not clear cache (Redis might not be available):",
        cacheError.message
      );
    }

    // Load all configurations into memory (will bypass cache and load fresh from files)
    await configManager.loadAllConfigs();
    console.log("📁 Loaded configurations from files");

    // Initialize WebSocket server
    configWebSocketServer.initialize(server);
    console.log("🔌 WebSocket server initialized");

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
