/**
 * Enhanced Remote Configuration API Routes
 * HTTP endpoints for configuration management with advanced features
 * @author Labor2Hire Team
 */

import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import enhancedConfigManager from "./configManager.js";
import configWebSocketServer from "./websocketServer.js";
import { logger } from "../../config/logger.js";
import rateLimiting from "../../middlewares/rateLimiting.js";
import {
  authenticateConfigAccess,
  authorizeConfigOperation,
  sanitizeConfigInput,
} from "./middleware/configAuth.js";
import configAuditLogger from "./services/auditService.js";
import configMetricsService, {
  performanceMonitoringMiddleware,
} from "./services/metricsService.js";
import configHealthService from "./services/healthService.js";

const router = Router();

/**
 * Validation middleware for configuration updates
 */
const validateConfigUpdate = [
  body("screen")
    .notEmpty()
    .withMessage("Screen name is required")
    .isString()
    .withMessage("Screen name must be a string")
    .custom(async (value) => {
      const validScreens = enhancedConfigManager.VALID_SCREENS;
      if (!validScreens.includes(value)) {
        throw new Error(
          `Invalid screen name. Valid screens: ${validScreens.join(", ")}`
        );
      }
      return true;
    }),

  body("key")
    .notEmpty()
    .withMessage("Configuration key is required")
    .isString()
    .withMessage("Configuration key must be a string")
    .isLength({ min: 1, max: 100 })
    .withMessage("Key must be between 1 and 100 characters"),

  body("value").exists().withMessage("Configuration value is required"),
];

/**
 * Validation middleware for bulk configuration updates
 */
const validateBulkConfigUpdate = [
  body("screen")
    .notEmpty()
    .withMessage("Screen name is required")
    .isString()
    .withMessage("Screen name must be a string")
    .custom(async (value) => {
      const validScreens = enhancedConfigManager.VALID_SCREENS;
      if (!validScreens.includes(value)) {
        throw new Error(
          `Invalid screen name. Valid screens: ${validScreens.join(", ")}`
        );
      }
      return true;
    }),

  body("updates")
    .isObject()
    .withMessage("Updates must be an object")
    .custom((value) => {
      if (Object.keys(value).length === 0) {
        throw new Error("Updates object cannot be empty");
      }
      if (Object.keys(value).length > 50) {
        throw new Error("Too many updates in single request (max 50)");
      }
      return true;
    }),
];

/**
 * Validation middleware for screen registration
 */
const validateScreenRegistration = [
  body("screenName")
    .notEmpty()
    .withMessage("Screen name is required")
    .isString()
    .withMessage("Screen name must be a string")
    .matches(/^[A-Za-z][A-Za-z0-9_-]*$/)
    .withMessage(
      "Screen name must start with letter and contain only letters, numbers, underscore, and hyphen"
    )
    .isLength({ min: 2, max: 50 })
    .withMessage("Screen name must be between 2 and 50 characters"),

  body("schema")
    .optional()
    .isObject()
    .withMessage("Schema must be a valid JSON object"),

  body("template")
    .optional()
    .isObject()
    .withMessage("Template must be a valid JSON object"),

  body("environment")
    .optional()
    .isIn(["development", "staging", "production"])
    .withMessage("Environment must be development, staging, or production"),
];

/**
 * Error handling middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

/**
 * Enhanced authentication middleware for configuration endpoints
 * Use enhanced authentication instead of commented-out basic auth
 */
router.use(authenticateConfigAccess);

/**
 * Input sanitization middleware
 */
router.use(sanitizeConfigInput);

/**
 * Performance monitoring middleware
 */
router.use(performanceMonitoringMiddleware);

/**
 * Apply rate limiting to all configuration routes
 */
// Use the general API rate limiter for configuration routes
router.use(rateLimiting.rateLimitGeneral);

/**
 * @route GET /api/config/health
 * @desc Enhanced health check endpoint for configuration service
 * @access Public
 */
router.get("/health", async (req, res) => {
  try {
    const healthStatus = await configHealthService.getHealthStatus();
    const stats = await enhancedConfigManager.getConfigStats();
    const wsStats = configWebSocketServer.getConnectionStats();
    const metrics = configMetricsService.getMetricsSummary();

    res.json({
      success: true,
      message: "Configuration service health check",
      data: {
        service: "remote-config",
        status: healthStatus.overall,
        version: "2.0.0",
        timestamp: new Date().toISOString(),
        health: healthStatus,
        configuration: {
          totalScreens: stats.totalScreens,
          loadedScreens: stats.loadedScreens,
          availableScreens: stats.availableScreens,
        },
        websocket: {
          status: wsStats.serverStatus,
          connectedClients: wsStats.connectedClients,
          totalConnections: wsStats.totalConnections,
          totalBroadcasts: wsStats.totalBroadcasts,
        },
        metrics: {
          requests: metrics.requests,
          updates: metrics.updates,
          cache: metrics.cache,
          errors: metrics.errors,
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        },
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route GET /api/config/metrics
 * @desc Get Prometheus metrics
 * @access Private
 */
router.get(
  "/metrics",
  authorizeConfigOperation(["read", "stats"]),
  (req, res) => {
    try {
      const metrics = configMetricsService.getMetrics();
      res.set("Content-Type", "text/plain");
      res.send(metrics);
    } catch (error) {
      logger.error("Failed to get metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve metrics",
        error: error.message,
      });
    }
  }
);

/**
 * @route GET /api/config/metrics/summary
 * @desc Get metrics summary in JSON format
 * @access Private
 */
router.get(
  "/metrics/summary",
  authorizeConfigOperation(["read", "stats"]),
  (req, res) => {
    try {
      const metrics = configMetricsService.getMetricsSummary();
      res.json({
        success: true,
        message: "Metrics summary retrieved successfully",
        data: metrics,
      });
    } catch (error) {
      logger.error("Failed to get metrics summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve metrics summary",
        error: error.message,
      });
    }
  }
);

/**
 * @route GET /api/config/all
 * @desc Get all screen configurations with caching and metrics
 * @access Private
 */
router.get("/all", authorizeConfigOperation(["read"]), async (req, res) => {
  const startTime = Date.now();

  try {
    const configs = enhancedConfigManager.getAllConfigs();

    // Record metrics
    configMetricsService.recordConfigRequest(
      "all",
      "get-all",
      (Date.now() - startTime) / 1000
    );

    // Audit log
    await configAuditLogger.logConfigAccess(
      "get-all-configs",
      {
        totalConfigs: Object.keys(configs).length,
      },
      {
        userId: req.configAuth?.userId,
        userRole: req.configAuth?.role,
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.headers["x-request-id"] || "unknown",
      }
    );

    logger.info("All configurations requested", {
      requestId: req.headers["x-request-id"] || "unknown",
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.configAuth?.userId,
    });

    res.json({
      success: true,
      message: "All configurations retrieved successfully",
      data: {
        configs,
        totalScreens: Object.keys(configs).length,
        availableScreens: enhancedConfigManager.VALID_SCREENS,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to get all configurations:", error);
    configMetricsService.recordError("all", "get-all", "server_error");

    res.status(500).json({
      success: false,
      message: "Failed to retrieve configurations",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route GET /api/config/screen/:screenName
 * @desc Get configuration for a specific screen with caching
 * @access Private
 */
router.get(
  "/screen/:screenName",
  [
    param("screenName").custom(async (value) => {
      const validScreens = enhancedConfigManager.VALID_SCREENS;
      if (!validScreens.includes(value)) {
        throw new Error(
          `Invalid screen name. Valid screens: ${validScreens.join(", ")}`
        );
      }
      return true;
    }),
  ],
  authorizeConfigOperation(["read"]),
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { screenName } = req.params;
      const config = enhancedConfigManager.getScreenConfig(screenName);

      if (!config) {
        configMetricsService.recordError(screenName, "get-screen", "not_found");

        return res.status(404).json({
          success: false,
          message: `Configuration not found for screen: ${screenName}`,
          timestamp: new Date().toISOString(),
        });
      }

      // Record metrics
      configMetricsService.recordConfigRequest(
        screenName,
        "get-screen",
        (Date.now() - startTime) / 1000
      );

      // Check if served from cache
      if (config._metadata?.source === "cache") {
        configMetricsService.recordCacheHit(screenName);
      } else {
        configMetricsService.recordCacheMiss(screenName);
      }

      // Audit log
      await configAuditLogger.logConfigAccess(
        "get-screen-config",
        {
          screen: screenName,
          version: config.version,
          source: config._metadata?.source,
        },
        {
          userId: req.configAuth?.userId,
          userRole: req.configAuth?.role,
          ip: req.ip,
          userAgent: req.get("User-Agent"),
          requestId: req.headers["x-request-id"] || "unknown",
        }
      );

      logger.info(`Configuration requested for screen: ${screenName}`, {
        screen: screenName,
        requestId: req.headers["x-request-id"] || "unknown",
        ip: req.ip,
        userId: req.configAuth?.userId,
      });

      res.json({
        success: true,
        message: `Configuration retrieved for screen: ${screenName}`,
        data: {
          screen: screenName,
          config,
          lastUpdated: config.lastUpdated,
          version: config.version,
          metadata: config._metadata,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(
        `Failed to get configuration for screen ${req.params.screenName}:`,
        error
      );
      configMetricsService.recordError(
        req.params.screenName,
        "get-screen",
        "server_error"
      );

      res.status(500).json({
        success: false,
        message: "Failed to retrieve screen configuration",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route POST /api/config/update
 * @desc Update a specific configuration key for a screen with enhanced features
 * @access Private
 */
router.post(
  "/update",
  authorizeConfigOperation(["write"]),
  validateConfigUpdate,
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { screen, key, value } = req.body;

      const context = {
        userId: req.configAuth?.userId || "system",
        userRole: req.configAuth?.role || "unknown",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.headers["x-request-id"] || "unknown",
        method: req.method,
        url: req.originalUrl,
        source: "api",
      };

      logger.info(`Configuration update requested`, {
        screen,
        key,
        value: typeof value === "object" ? JSON.stringify(value) : value,
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
        userId: context.userId,
      });

      // Update configuration with enhanced manager
      const updatedConfig = await enhancedConfigManager.updateConfig(
        screen,
        key,
        value,
        context
      );

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      configMetricsService.recordConfigUpdate(
        screen,
        "update-single",
        duration,
        true
      );

      // Broadcast update to all connected WebSocket clients
      await configWebSocketServer.broadcastConfigUpdate(screen, updatedConfig);

      res.json({
        success: true,
        message: `Configuration updated successfully for screen: ${screen}`,
        data: {
          screen,
          key,
          value,
          updatedConfig,
          lastUpdated: updatedConfig.lastUpdated,
          version: updatedConfig.version,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Failed to update configuration:", error);

      const duration = (Date.now() - startTime) / 1000;
      configMetricsService.recordConfigUpdate(
        req.body.screen || "unknown",
        "update-single",
        duration,
        false
      );

      res.status(400).json({
        success: false,
        message: "Failed to update configuration",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route POST /api/config/update-bulk
 * @desc Update multiple configuration keys for a screen with enhanced features
 * @access Private
 */
router.post(
  "/update-bulk",
  authorizeConfigOperation(["write"]),
  validateBulkConfigUpdate,
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { screen, updates } = req.body;

      const context = {
        userId: req.configAuth?.userId || "system",
        userRole: req.configAuth?.role || "unknown",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.headers["x-request-id"] || "unknown",
        method: req.method,
        url: req.originalUrl,
        source: "api",
      };

      logger.info(`Bulk configuration update requested`, {
        screen,
        updatedKeys: Object.keys(updates),
        updateCount: Object.keys(updates).length,
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
        userId: context.userId,
      });

      // Update multiple configurations
      const updatedConfig = await enhancedConfigManager.updateMultipleConfigs(
        screen,
        updates,
        context
      );

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      configMetricsService.recordConfigUpdate(
        screen,
        "update-bulk",
        duration,
        true
      );

      // Broadcast update to all connected WebSocket clients
      await configWebSocketServer.broadcastConfigUpdate(screen, updatedConfig);

      res.json({
        success: true,
        message: `Bulk configuration updated successfully for screen: ${screen}`,
        data: {
          screen,
          updates,
          updatedKeys: Object.keys(updates),
          updateCount: Object.keys(updates).length,
          updatedConfig,
          lastUpdated: updatedConfig.lastUpdated,
          version: updatedConfig.version,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Failed to update bulk configuration:", error);

      const duration = (Date.now() - startTime) / 1000;
      configMetricsService.recordConfigUpdate(
        req.body.screen || "unknown",
        "update-bulk",
        duration,
        false
      );

      res.status(400).json({
        success: false,
        message: "Failed to update bulk configuration",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route POST /api/config/reload/:screenName
 * @desc Reload configuration from file for a specific screen
 * @access Private
 */
router.post(
  "/reload/:screenName",
  [
    param("screenName").custom(async (value) => {
      const validScreens = enhancedConfigManager.VALID_SCREENS;
      if (!validScreens.includes(value)) {
        throw new Error(
          `Invalid screen name. Valid screens: ${validScreens.join(", ")}`
        );
      }
      return true;
    }),
  ],
  authorizeConfigOperation(["reload"]),
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const { screenName } = req.params;

      const context = {
        userId: req.configAuth?.userId || "system",
        userRole: req.configAuth?.role || "unknown",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.headers["x-request-id"] || "unknown",
        method: req.method,
        url: req.originalUrl,
        source: "api",
      };

      logger.info(`Configuration reload requested for screen: ${screenName}`, {
        screen: screenName,
        requestId: context.requestId,
        ip: context.ip,
        userId: context.userId,
      });

      // Reload configuration from file
      const reloadedConfig = await enhancedConfigManager.reloadScreenConfig(
        screenName,
        context
      );

      // Record metrics
      const duration = (Date.now() - startTime) / 1000;
      configMetricsService.recordConfigUpdate(
        screenName,
        "reload",
        duration,
        true
      );

      // Broadcast update to all connected WebSocket clients
      await configWebSocketServer.broadcastConfigUpdate(
        screenName,
        reloadedConfig
      );

      res.json({
        success: true,
        message: `Configuration reloaded successfully for screen: ${screenName}`,
        data: {
          screen: screenName,
          config: reloadedConfig,
          lastUpdated: reloadedConfig.lastUpdated,
          version: reloadedConfig.version,
          metadata: reloadedConfig._metadata,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(
        `Failed to reload configuration for screen ${req.params.screenName}:`,
        error
      );

      const duration = (Date.now() - startTime) / 1000;
      configMetricsService.recordConfigUpdate(
        req.params.screenName,
        "reload",
        duration,
        false
      );

      res.status(500).json({
        success: false,
        message: "Failed to reload screen configuration",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route GET /api/config/stats
 * @desc Get configuration service statistics
 * @access Private
 */
router.get("/stats", (req, res) => {
  try {
    const configStats = configManager.getConfigStats();
    const wsStats = configWebSocketServer.getConnectionStats();

    res.json({
      success: true,
      message: "Configuration service statistics retrieved successfully",
      data: {
        configuration: configStats,
        websocket: wsStats,
        performance: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Failed to get configuration statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/config/test-broadcast
 * @desc Send a test broadcast to all connected WebSocket clients
 * @access Private
 */
router.post(
  "/test-broadcast",
  [
    body("message")
      .optional()
      .isString()
      .withMessage("Message must be a string"),
    body("data").optional().isObject().withMessage("Data must be an object"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { message, data } = req.body;

      const testData = {
        customMessage: message || "Test message from configuration API",
        customData: data || { test: true },
        requestedBy: req.ip,
        requestId: req.headers["x-request-id"] || "unknown",
      };

      const result = await configWebSocketServer.sendTestBroadcast(testData);

      res.json({
        success: true,
        message: "Test broadcast sent successfully",
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to send test broadcast:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send test broadcast",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route GET /api/config/websocket/stats
 * @desc Get WebSocket connection statistics
 * @access Private
 */
router.get("/websocket/stats", (req, res) => {
  try {
    const wsStats = configWebSocketServer.getConnectionStats();

    res.json({
      success: true,
      message: "WebSocket statistics retrieved successfully",
      data: wsStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to get WebSocket statistics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve WebSocket statistics",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route POST /api/config/template/process
 * @desc Process template with variables
 * @access Private
 */
router.post(
  "/template/process",
  [
    body("template")
      .notEmpty()
      .withMessage("Template is required")
      .isObject()
      .withMessage("Template must be an object"),
    body("variables")
      .optional()
      .isObject()
      .withMessage("Variables must be an object"),
  ],
  authorizeConfigOperation(["write"]),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { template, variables = {} } = req.body;
      const { templateEngine } = await import("./services/advancedServices.js");

      const processedTemplate = templateEngine.processTemplate(
        template,
        variables
      );

      res.json({
        success: true,
        message: "Template processed successfully",
        data: {
          originalTemplate: template,
          processedTemplate,
          variables,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Failed to process template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process template",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route GET /api/config/version/:screenName
 * @desc Get version history for a screen
 * @access Private
 */
router.get(
  "/version/:screenName",
  [
    param("screenName").custom(async (value) => {
      const validScreens = enhancedConfigManager.VALID_SCREENS;
      if (!validScreens.includes(value)) {
        throw new Error(
          `Invalid screen name. Valid screens: ${validScreens.join(", ")}`
        );
      }
      return true;
    }),
  ],
  authorizeConfigOperation(["read"]),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { screenName } = req.params;
      const { versionManager } = await import("./services/advancedServices.js");

      const versionHistory = await versionManager.getVersionHistory(screenName);

      res.json({
        success: true,
        message: `Version history retrieved for screen: ${screenName}`,
        data: {
          screen: screenName,
          versions: versionHistory,
          totalVersions: versionHistory.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(`Failed to get version history for ${screenName}:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve version history",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route POST /api/config/version/:screenName/rollback
 * @desc Rollback to a specific version
 * @access Private
 */
router.post(
  "/version/:screenName/rollback",
  [
    param("screenName").custom(async (value) => {
      const validScreens = enhancedConfigManager.VALID_SCREENS;
      if (!validScreens.includes(value)) {
        throw new Error(
          `Invalid screen name. Valid screens: ${validScreens.join(", ")}`
        );
      }
      return true;
    }),
    body("version")
      .notEmpty()
      .withMessage("Version is required")
      .isString()
      .withMessage("Version must be a string"),
  ],
  authorizeConfigOperation(["write", "rollback"]),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { screenName } = req.params;
      const { version } = req.body;
      const { versionManager } = await import("./services/advancedServices.js");

      const context = {
        userId: req.configAuth?.userId || "system",
        userRole: req.configAuth?.role || "unknown",
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        requestId: req.headers["x-request-id"] || "unknown",
      };

      const rolledBackConfig = await versionManager.rollbackToVersion(
        screenName,
        version,
        context
      );

      // Update the config manager with the rolled back configuration
      await enhancedConfigManager.updateConfig(
        screenName,
        "FULL_CONFIG_ROLLBACK",
        rolledBackConfig,
        context
      );

      // Broadcast update to all connected WebSocket clients
      await configWebSocketServer.broadcastConfigUpdate(
        screenName,
        rolledBackConfig
      );

      res.json({
        success: true,
        message: `Successfully rolled back ${screenName} to version ${version}`,
        data: {
          screen: screenName,
          rolledBackToVersion: version,
          config: rolledBackConfig,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error(
        `Failed to rollback ${screenName} to version ${version}:`,
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to rollback configuration",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route GET /api/config/backup
 * @desc List available backups
 * @access Private
 */
router.get(
  "/backup",
  authorizeConfigOperation(["read", "backup"]),
  async (req, res) => {
    try {
      const { backupService } = await import("./services/advancedServices.js");
      const backups = await backupService.listBackups();

      res.json({
        success: true,
        message: "Backup list retrieved successfully",
        data: {
          backups,
          totalBackups: backups.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Failed to list backups:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve backup list",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route POST /api/config/backup/create
 * @desc Create a manual backup
 * @access Private
 */
router.post(
  "/backup/create",
  authorizeConfigOperation(["write", "backup"]),
  async (req, res) => {
    try {
      const { backupService } = await import("./services/advancedServices.js");
      const backup = await backupService.createFullBackup();

      res.json({
        success: true,
        message: "Backup created successfully",
        data: {
          backup: {
            id: backup.id,
            timestamp: backup.timestamp,
            metadata: backup.metadata,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      logger.error("Failed to create backup:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create backup",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route POST /api/config/backup/restore
 * @desc Restore from backup
 * @access Private
 */
router.post(
  "/backup/restore",
  [
    body("backupId")
      .notEmpty()
      .withMessage("Backup ID is required")
      .isString()
      .withMessage("Backup ID must be a string"),
  ],
  authorizeConfigOperation(["write", "restore"]),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { backupId } = req.body;
      const { backupService } = await import("./services/advancedServices.js");

      const restoreResult = await backupService.restoreFromBackup(backupId);

      // Broadcast full config sync to all connected clients
      await configWebSocketServer.broadcastFullConfigSync();

      res.json({
        success: true,
        message: `Successfully restored from backup: ${backupId}`,
        data: restoreResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error(
        `Failed to restore from backup ${req.body.backupId}:`,
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to restore from backup",
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

/**
 * @route GET /api/config/health/detailed
 * @desc Get detailed health status with all system components
 * @access Private
 */
router.get(
  "/health/detailed",
  authorizeConfigOperation(["read"]),
  async (req, res) => {
    try {
      const configStats = await enhancedConfigManager.getConfigStats();
      const wsStats = configWebSocketServer.getConnectionStats();
      const metricsStats = configMetricsService.getMetricsSummary();

      // Get additional health information
      const healthData = {
        configuration: {
          ...configStats,
          status: "healthy",
        },
        websocket: {
          ...wsStats,
          status: wsStats.serverStatus === "active" ? "healthy" : "unhealthy",
        },
        metrics: {
          ...metricsStats,
          status: "healthy",
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          nodeVersion: process.version,
          platform: process.platform,
          status: "healthy",
        },
        redis: {
          connected: cache.isConnected ? cache.isConnected() : false,
          status:
            cache.isConnected && cache.isConnected() ? "healthy" : "unhealthy",
        },
        timestamp: new Date().toISOString(),
      };

      // Determine overall health status
      const overallStatus = Object.values(healthData)
        .filter((item) => typeof item === "object" && item.status)
        .every((item) => item.status === "healthy")
        ? "healthy"
        : "degraded";

      res.json({
        success: true,
        message: "Detailed health status retrieved successfully",
        status: overallStatus,
        data: healthData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Failed to get detailed health status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve detailed health status",
        error: error.message,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      });
    }
  }
);

export default router;
