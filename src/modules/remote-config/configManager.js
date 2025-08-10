/**
 * Enhanced Configuration Manager with Distributed Caching and Advanced Features
 * @author Labor2Hire Team
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../../config/logger.js";
import { cache } from "../../config/redis.js";
import configAuditLogger from "./services/auditService.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration directories
const CONFIG_DIR = path.join(__dirname, "configs");
const SCHEMA_DIR = path.join(__dirname, "schemas");
const TEMPLATES_DIR = path.join(__dirname, "templates");
const CACHE_PREFIX = "config:";
const CACHE_STATS_KEY = "config:stats";
const CACHE_METADATA_KEY = "config:metadata";
const DISTRIBUTED_LOCK_PREFIX = "config:lock:";

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 30000,
  monitorTimeout: 5000,
};

/**
 * Enhanced Configuration Manager with advanced features
 */
class EnhancedConfigManager {
  constructor() {
    this.configStore = new Map();
    this.validScreens = new Set();
    this.configSchemas = new Map();
    this.configTemplates = new Map();
    this.circuitBreaker = new Map();
    this.initialLoadComplete = false;
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
    };

    // Initialize JSON Schema validator
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);

    // Initialize circuit breakers
    this.initializeCircuitBreakers();

    // Initialize debounced reloads map
    this.debouncedReloads = new Map();

    // Start watching for config file changes
    this.watchConfigs();
  }

  /**
   * Watch for changes in the configuration directory
   */
  watchConfigs() {
    try {
      // Skip file watching in development to prevent restart loops
      if (process.env.NODE_ENV === "development") {
        logger.info(
          "File watching disabled in development mode to prevent restart loops"
        );
        return;
      }

      const watcher = fs.watch(CONFIG_DIR, (eventType, filename) => {
        if (filename && eventType === "change") {
          this.handleFileChange(filename);
        }
      });

      if (watcher && watcher.on) {
        watcher.on("error", (error) => {
          logger.error("File watcher error:", error);
        });
      }
    } catch (error) {
      logger.error("Failed to start file watcher:", error);
    }
  }

  /**
   * Handle file change events
   */
  handleFileChange(filename) {
    const screenName = path.basename(filename, ".json");

    if (this.validScreens.has(screenName)) {
      // Debounce the reload to avoid multiple reloads in a short time
      if (this.debouncedReloads.has(screenName)) {
        clearTimeout(this.debouncedReloads.get(screenName));
      }

      const timeout = setTimeout(async () => {
        logger.info(
          `Configuration file changed for screen: ${screenName}. Reloading...`
        );

        try {
          // Clear cache first to ensure fresh load from file
          await this.clearScreenCache(screenName);

          // Force reload from file (bypass cache)
          const config = await this.forceReloadFromFile(screenName, {
            source: "file-watcher",
          });

          // Broadcast the update to WebSocket clients
          const { configWebSocketServer } = await import(
            "./websocketServer.js"
          );
          await configWebSocketServer.broadcastConfigUpdate(screenName, config);

          logger.info(
            `Configuration successfully reloaded for screen: ${screenName}`
          );
        } catch (error) {
          logger.error(
            `Failed to reload configuration for screen ${screenName}:`,
            error
          );
        }

        this.debouncedReloads.delete(screenName);
      }, 500); // 500ms debounce delay

      this.debouncedReloads.set(screenName, timeout);
    }
  }

  /**
   * Initialize circuit breakers for external dependencies
   */
  initializeCircuitBreakers() {
    const services = ["redis", "filesystem", "websocket"];

    services.forEach((service) => {
      this.circuitBreaker.set(service, {
        state: "CLOSED", // CLOSED, OPEN, HALF_OPEN
        failures: 0,
        lastFailureTime: null,
        nextAttemptTime: null,
      });
    });
  }

  /**
   * Load all configuration files with enhanced error handling
   */
  async loadAllConfigs() {
    return this.executeWithCircuitBreaker("filesystem", async () => {
      try {
        logger.info(
          "Loading all screen configurations with enhanced features..."
        );

        // Load configuration schemas
        await this.loadConfigSchemas();

        // Load configuration templates
        await this.loadConfigTemplates();

        // Discover and register screens dynamically
        await this.discoverScreens();

        // Load configurations for all discovered screens
        const loadedConfigs = new Map();

        for (const screen of this.validScreens) {
          try {
            // Force load from file (bypass cache during startup)
            const config = await this.loadScreenConfigWithFallback(
              screen,
              true
            );
            loadedConfigs.set(screen, config);

            // Cache in Redis with distribution
            await this.cacheConfiguration(screen, config);

            logger.info(`Loaded configuration for screen: ${screen}`);
          } catch (error) {
            logger.error(
              `Failed to load configuration for screen ${screen}:`,
              error
            );

            // Try to load from fallback
            const fallbackConfig = await this.getFallbackConfiguration(screen);
            if (fallbackConfig) {
              loadedConfigs.set(screen, fallbackConfig);
              logger.info(
                `Loaded fallback configuration for screen: ${screen}`
              );
            }
          }
        }

        this.configStore = loadedConfigs;

        // Update metadata
        await this.updateConfigMetadata();

        logger.info(
          `Successfully loaded ${loadedConfigs.size} screen configurations`
        );

        // Audit log
        await configAuditLogger.logConfigChange("config-load-all", {
          screensLoaded: Array.from(loadedConfigs.keys()),
          totalConfigs: loadedConfigs.size,
        });

        // Mark initial load as complete to allow file saving
        this.initialLoadComplete = true;

        return this.configStore;
      } catch (error) {
        logger.error("Failed to load configurations:", error);
        throw error;
      }
    });
  }

  /**
   * Dynamically discover screens from various sources
   */
  async discoverScreens() {
    return this.executeWithCircuitBreaker("filesystem", async () => {
      try {
        logger.debug("Starting screen discovery process...");

        // Discover from config files
        const configFiles = await this.discoverConfigFiles();
        logger.debug(
          `Discovered ${configFiles.length} config files:`,
          configFiles
        );

        // Discover from schema files
        const schemaFiles = await this.discoverSchemaFiles();
        logger.debug(
          `Discovered ${schemaFiles.length} schema files:`,
          schemaFiles
        );

        // Discover from templates
        const templateFiles = await this.discoverTemplateFiles();
        logger.debug(
          `Discovered ${templateFiles.length} template files:`,
          templateFiles
        );

        // Discover from environment variables
        const envScreens = this.discoverScreensFromEnv();
        logger.debug(
          `Discovered ${envScreens.length} environment screens:`,
          envScreens
        );

        // Combine all discovered screens
        const allScreens = new Set([
          ...configFiles,
          ...schemaFiles,
          ...templateFiles,
          ...envScreens,
        ]);

        this.validScreens = allScreens;

        logger.info(
          `Discovered ${allScreens.size} screens:`,
          Array.from(allScreens)
        );

        // If no screens discovered, fallback to defaults
        if (allScreens.size === 0) {
          logger.warn("No screens discovered, using fallback defaults");
          this.validScreens = new Set(["Auth", "Home"]);
        }

        return this.validScreens;
      } catch (error) {
        logger.error("Failed to discover screens:", error);
        // Fallback to default screens
        this.validScreens = new Set(["Auth", "Home"]);
        return this.validScreens;
      }
    });
  }

  /**
   * Discover configuration files
   */
  async discoverConfigFiles() {
    await this.ensureDirectoryExists(CONFIG_DIR);
    const files = await fs.readdir(CONFIG_DIR);

    return files
      .filter((file) => file.endsWith(".json"))
      .map((file) => path.basename(file, ".json"));
  }

  /**
   * Discover schema files
   */
  async discoverSchemaFiles() {
    await this.ensureDirectoryExists(SCHEMA_DIR);
    const files = await fs.readdir(SCHEMA_DIR);

    return files
      .filter((file) => file.endsWith(".schema.json"))
      .map((file) => {
        // Handle different naming patterns
        let screenName = path.basename(file, ".schema.json");

        // Convert dots to proper casing (e.g., "Choose.language" -> "ChooseLanguage")
        if (screenName.includes(".")) {
          screenName = screenName
            .split(".")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("");
        }

        return screenName;
      });
  }

  /**
   * Discover template files
   */
  async discoverTemplateFiles() {
    await this.ensureDirectoryExists(TEMPLATES_DIR);
    const files = await fs.readdir(TEMPLATES_DIR);

    return files
      .filter((file) => file.endsWith(".template.json"))
      .map((file) => {
        // Handle different naming patterns
        let screenName = path.basename(file, ".template.json");

        // Convert dots to proper casing (e.g., "Choose.language" -> "ChooseLanguage")
        if (screenName.includes(".")) {
          screenName = screenName
            .split(".")
            .map(
              (part) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            )
            .join("");
        }

        return screenName;
      });
  }

  /**
   * Discover screens from environment variables
   */
  discoverScreensFromEnv() {
    const envScreens = process.env.ADDITIONAL_SCREENS;
    if (!envScreens) return [];

    return envScreens
      .split(",")
      .map((screen) => screen.trim())
      .filter(Boolean);
  }

  /**
   * Load configuration schemas
   */
  async loadConfigSchemas() {
    try {
      await this.ensureDirectoryExists(SCHEMA_DIR);
      const schemaFiles = await fs.readdir(SCHEMA_DIR);

      for (const schemaFile of schemaFiles) {
        if (schemaFile.endsWith(".schema.json")) {
          // Handle different naming patterns
          let screenName = path.basename(schemaFile, ".schema.json");

          // Convert dots to proper casing (e.g., "Choose.language" -> "ChooseLanguage")
          if (screenName.includes(".")) {
            screenName = screenName
              .split(".")
              .map(
                (part) =>
                  part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
              )
              .join("");
          }

          const schemaPath = path.join(SCHEMA_DIR, schemaFile);

          try {
            const schemaContent = await fs.readFile(schemaPath, "utf8");
            const schema = JSON.parse(schemaContent);

            // Compile schema with AJV
            const validator = this.ajv.compile(schema);
            this.configSchemas.set(screenName, {
              schema,
              validator,
              filePath: schemaPath,
            });

            logger.debug(`Loaded schema for screen: ${screenName}`);
          } catch (error) {
            logger.error(`Failed to load schema for ${screenName}:`, error);
          }
        }
      }
    } catch (error) {
      logger.warn("Failed to load configuration schemas:", error);
    }
  }

  /**
   * Load configuration templates
   */
  async loadConfigTemplates() {
    try {
      await this.ensureDirectoryExists(TEMPLATES_DIR);
      const templateFiles = await fs.readdir(TEMPLATES_DIR);

      for (const templateFile of templateFiles) {
        if (templateFile.endsWith(".template.json")) {
          // Handle different naming patterns
          let screenName = path.basename(templateFile, ".template.json");

          // Convert dots to proper casing (e.g., "Choose.language" -> "ChooseLanguage")
          if (screenName.includes(".")) {
            screenName = screenName
              .split(".")
              .map(
                (part) =>
                  part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
              )
              .join("");
          }

          const templatePath = path.join(TEMPLATES_DIR, templateFile);

          try {
            const templateContent = await fs.readFile(templatePath, "utf8");
            const template = JSON.parse(templateContent);

            this.configTemplates.set(screenName, {
              template,
              filePath: templatePath,
            });

            logger.debug(`Loaded template for screen: ${screenName}`);
          } catch (error) {
            logger.error(`Failed to load template for ${screenName}:`, error);
          }
        }
      }
    } catch (error) {
      logger.warn("Failed to load configuration templates:", error);
    }
  }

  /**
   * Load screen configuration with fallback mechanisms
   */
  async loadScreenConfigWithFallback(screen, forceReload = false) {
    return this.executeWithRetry(async () => {
      // Skip cache if force reload is requested
      if (!forceReload) {
        // Try to load from cache first (distributed cache)
        const cachedConfig = await this.getCachedConfiguration(screen);
        if (cachedConfig) {
          logger.debug(`Loaded ${screen} configuration from cache`);
          return cachedConfig;
        }
      }

      // Try to load from file
      try {
        const fileConfig = await this.loadScreenConfigFromFile(screen);
        if (fileConfig) {
          // Validate against schema
          await this.validateConfiguration(screen, fileConfig);

          // Cache the fresh configuration
          await this.cacheConfiguration(screen, fileConfig);

          return fileConfig;
        }
      } catch (error) {
        logger.warn(`Failed to load ${screen} from file:`, error);
      }

      // Try to load from template
      const templateConfig = await this.createConfigFromTemplate(screen);
      if (templateConfig) {
        logger.info(`Created ${screen} configuration from template`);

        // Cache the template-generated configuration
        await this.cacheConfiguration(screen, templateConfig);

        return templateConfig;
      }

      // Final fallback
      throw new Error(`Cannot load configuration for screen: ${screen}`);
    });
  }

  /**
   * Get cached configuration from Redis
   */
  async getCachedConfiguration(screen) {
    return this.executeWithCircuitBreaker("redis", async () => {
      try {
        const cacheKey = `${CACHE_PREFIX}${screen}`;
        const cachedData = await cache.get(cacheKey);

        if (cachedData) {
          logger.debug(`Cache HIT for screen: ${screen}`);

          // Add cache metadata
          if (typeof cachedData === "object" && cachedData !== null) {
            cachedData._metadata = {
              ...cachedData._metadata,
              source: "cache",
              cachedAt: new Date().toISOString(),
            };
          }

          return cachedData;
        } else {
          logger.debug(`Cache MISS for screen: ${screen}`);
          return null;
        }
      } catch (error) {
        logger.warn(`Failed to get cached config for ${screen}:`, error);
        return null;
      }
    });
  }

  /**
   * Cache configuration in Redis
   */
  async cacheConfiguration(screen, config) {
    return this.executeWithCircuitBreaker("redis", async () => {
      try {
        const cacheKey = `${CACHE_PREFIX}${screen}`;
        const ttl = this.getCacheTtl(screen);

        // Create a copy of config for caching to avoid modifying original
        const configToCache = JSON.parse(JSON.stringify(config));

        // Add cache metadata
        configToCache._metadata = {
          ...configToCache._metadata,
          source: "file",
          cachedAt: new Date().toISOString(),
          cacheKey,
          ttl,
        };

        await cache.set(cacheKey, configToCache, ttl);

        logger.debug(`Cached configuration for ${screen} with TTL ${ttl}s`);
      } catch (error) {
        logger.warn(`Failed to cache config for ${screen}:`, error);
      }
    });
  }

  /**
   * Load screen configuration from file
   */
  async loadScreenConfigFromFile(screen) {
    const configPath = path.join(CONFIG_DIR, `${screen}.json`);

    try {
      const configData = await fs.readFile(configPath, "utf8");
      const config = JSON.parse(configData);

      // Add metadata
      config._metadata = {
        source: "file",
        loadedAt: new Date().toISOString(),
        filePath: configPath,
      };

      return config;
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create configuration from template
   */
  async createConfigFromTemplate(screen) {
    const templateData = this.configTemplates.get(screen);
    if (!templateData) {
      return null;
    }

    try {
      const config = JSON.parse(JSON.stringify(templateData.template));

      // Process template variables
      const processedConfig = this.processTemplateVariables(config, screen);

      // Add metadata
      processedConfig._metadata = {
        source: "template",
        loadedAt: new Date().toISOString(),
        templatePath: templateData.filePath,
      };

      // Save to file for future use
      await this.saveConfigToFile(screen, processedConfig);

      return processedConfig;
    } catch (error) {
      logger.error(
        `Failed to create config from template for ${screen}:`,
        error
      );
      return null;
    }
  }

  /**
   * Process template variables
   */
  processTemplateVariables(config, screen) {
    const variables = {
      SCREEN_NAME: screen,
      TIMESTAMP: new Date().toISOString(),
      VERSION: process.env.npm_package_version || "1.0.0",
      ENVIRONMENT: process.env.NODE_ENV || "development",
      BUILD_NUMBER: process.env.BUILD_NUMBER || "dev",
      API_BASE_URL: process.env.API_BASE_URL || "http://localhost:5002",
      WEBSOCKET_URL: process.env.WEBSOCKET_URL || "ws://localhost:5002",
    };

    // Try to use the advanced template engine if available
    try {
      const { templateEngine } = require("./services/advancedServices.js");
      return templateEngine.processTemplate(config, variables);
    } catch (error) {
      // Fallback to simple variable replacement
      logger.warn(
        "Advanced template engine not available, using fallback:",
        error.message
      );
      return this.replaceVariablesInObject(config, variables);
    }
  }

  /**
   * Replace variables in object recursively
   */
  replaceVariablesInObject(obj, variables) {
    if (typeof obj === "string") {
      return obj.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.replaceVariablesInObject(item, variables));
    }

    if (typeof obj === "object" && obj !== null) {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariablesInObject(value, variables);
      }
      return result;
    }

    return obj;
  }

  /**
   * Validate configuration against schema
   */
  async validateConfiguration(screen, config) {
    const schemaData = this.configSchemas.get(screen);
    if (!schemaData) {
      logger.warn(`No schema found for screen: ${screen}`);
      return true;
    }

    const isValid = schemaData.validator(config);
    if (!isValid) {
      const errors = schemaData.validator.errors;

      // In development mode, be more lenient with validation to prevent restart loops
      if (process.env.NODE_ENV === "development") {
        logger.warn(
          `Schema validation failed for ${screen} (development mode - continuing):`,
          errors
        );
        return true;
      }

      logger.error(`Schema validation failed for ${screen}:`, errors);
      throw new Error(
        `Configuration validation failed: ${JSON.stringify(errors)}`
      );
    }

    logger.debug(`Schema validation passed for ${screen}`);
    return true;
  }

  /**
   * Get fallback configuration
   */
  async getFallbackConfiguration(screen) {
    try {
      // Try to load from backup
      const backupConfig = await this.loadBackupConfiguration(screen);
      if (backupConfig) {
        return backupConfig;
      }

      // Try to load from template
      const templateConfig = await this.createConfigFromTemplate(screen);
      if (templateConfig) {
        return templateConfig;
      }

      // Final fallback - minimal configuration
      return this.createMinimalConfiguration(screen);
    } catch (error) {
      logger.error(`Failed to get fallback config for ${screen}:`, error);
      return null;
    }
  }

  /**
   * Load backup configuration
   */
  async loadBackupConfiguration(screen) {
    try {
      const backupPath = path.join(
        CONFIG_DIR,
        "backups",
        `${screen}.backup.json`
      );
      const backupData = await fs.readFile(backupPath, "utf8");
      const config = JSON.parse(backupData);

      config._metadata = {
        source: "backup",
        loadedAt: new Date().toISOString(),
        backupPath,
      };

      return config;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create minimal configuration
   */
  createMinimalConfiguration(screen) {
    return {
      screenTitle: screen,
      backgroundColor: "#ffffff",
      primaryColor: "#007bff",
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      _metadata: {
        source: "minimal-fallback",
        loadedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Update configuration with distributed locking
   */
  async updateConfig(screen, key, value, context = {}) {
    const lockKey = `${DISTRIBUTED_LOCK_PREFIX}${screen}`;

    return this.executeWithDistributedLock(lockKey, async () => {
      return this.executeWithRetry(async () => {
        try {
          // Validate screen
          if (!this.validScreens.has(screen)) {
            throw new Error(`Invalid screen name: ${screen}`);
          }

          // Get current configuration
          let currentConfig = this.configStore.get(screen);
          if (!currentConfig) {
            currentConfig = await this.loadScreenConfigWithFallback(screen);
            this.configStore.set(screen, currentConfig);
          }

          // Create backup before update
          await this.createConfigBackup(screen, currentConfig);

          // Create version before update
          try {
            const { versionManager } = await import(
              "./services/advancedServices.js"
            );
            await versionManager.createVersion(screen, currentConfig, {
              type: "pre-update",
              userId: context.userId,
              reason: `Before updating key: ${key}`,
            });
          } catch (versionError) {
            logger.warn(
              `Failed to create version for ${screen}:`,
              versionError
            );
          }

          // Validate the update
          await this.validateConfigUpdate(screen, key, value);

          // Create updated configuration
          const updatedConfig = {
            ...currentConfig,
            [key]: value,
            lastUpdated: new Date().toISOString(),
            version: this.incrementVersion(currentConfig.version),
            _metadata: {
              ...currentConfig._metadata,
              lastModifiedBy: context.userId || "system",
              lastModifiedAt: new Date().toISOString(),
              updateSource: context.source || "api",
            },
          };

          // Validate complete configuration
          await this.validateConfiguration(screen, updatedConfig);

          // Update in-memory store
          this.configStore.set(screen, updatedConfig);

          // Save to file first
          await this.saveConfigToFile(screen, updatedConfig);

          // Clear cache to ensure fresh data on next request
          await this.clearScreenCache(screen);

          // Update cache with new data
          await this.cacheConfiguration(screen, updatedConfig);

          // Audit log
          await configAuditLogger.logConfigChange(
            "config-update",
            {
              screen,
              key,
              value: typeof value === "object" ? JSON.stringify(value) : value,
              version: updatedConfig.version,
            },
            context
          );

          logger.info(
            `Configuration updated for screen ${screen}, key: ${key}`,
            {
              screen,
              key,
              version: updatedConfig.version,
              userId: context.userId,
            }
          );

          return updatedConfig;
        } catch (error) {
          logger.error(
            `Failed to update configuration for screen ${screen}:`,
            error
          );
          throw error;
        }
      });
    });
  }

  /**
   * Bulk update configurations
   */
  async updateMultipleConfigs(screen, updates, context = {}) {
    const lockKey = `${DISTRIBUTED_LOCK_PREFIX}${screen}`;

    return this.executeWithDistributedLock(lockKey, async () => {
      return this.executeWithRetry(async () => {
        try {
          // Validate screen
          if (!this.validScreens.has(screen)) {
            throw new Error(`Invalid screen name: ${screen}`);
          }

          // Get current configuration
          let currentConfig = this.configStore.get(screen);
          if (!currentConfig) {
            currentConfig = await this.loadScreenConfigWithFallback(screen);
            this.configStore.set(screen, currentConfig);
          }

          // Create backup before update
          await this.createConfigBackup(screen, currentConfig);

          // Validate all updates
          for (const [key, value] of Object.entries(updates)) {
            await this.validateConfigUpdate(screen, key, value);
          }

          // Create updated configuration
          const updatedConfig = {
            ...currentConfig,
            ...updates,
            lastUpdated: new Date().toISOString(),
            version: this.incrementVersion(currentConfig.version),
            _metadata: {
              ...currentConfig._metadata,
              lastModifiedBy: context.userId || "system",
              lastModifiedAt: new Date().toISOString(),
              updateSource: context.source || "api",
              bulkUpdate: true,
              updatedKeys: Object.keys(updates),
            },
          };

          // Validate complete configuration
          await this.validateConfiguration(screen, updatedConfig);

          // Update in-memory store
          this.configStore.set(screen, updatedConfig);

          // Save to file first
          await this.saveConfigToFile(screen, updatedConfig);

          // Clear cache to ensure fresh data on next request
          await this.clearScreenCache(screen);

          // Update cache with new data
          await this.cacheConfiguration(screen, updatedConfig);

          // Audit log
          await configAuditLogger.logConfigChange(
            "config-bulk-update",
            {
              screen,
              updates: Object.keys(updates),
              updateCount: Object.keys(updates).length,
              version: updatedConfig.version,
            },
            context
          );

          logger.info(`Multiple configurations updated for screen ${screen}`, {
            screen,
            updatedKeys: Object.keys(updates),
            version: updatedConfig.version,
            userId: context.userId,
          });

          return updatedConfig;
        } catch (error) {
          logger.error(
            `Failed to update multiple configurations for screen ${screen}:`,
            error
          );
          throw error;
        }
      });
    });
  }

  /**
   * Validate configuration update
   */
  async validateConfigUpdate(screen, key, value) {
    // Check if key is allowed to be updated
    const protectedKeys = ["_metadata", "version", "lastUpdated"];
    if (protectedKeys.includes(key)) {
      throw new Error(`Cannot update protected key: ${key}`);
    }

    // Type-specific validation
    if (typeof value === "string" && value.length > 10000) {
      throw new Error(`Value too long for key: ${key}`);
    }

    // Schema-based validation if available
    const schemaData = this.configSchemas.get(screen);
    if (
      schemaData &&
      schemaData.schema.properties &&
      schemaData.schema.properties[key]
    ) {
      const keySchema = schemaData.schema.properties[key];
      const validator = this.ajv.compile(keySchema);

      if (!validator(value)) {
        throw new Error(
          `Value validation failed for key ${key}: ${JSON.stringify(validator.errors)}`
        );
      }
    }

    return true;
  }

  /**
   * Create configuration backup
   */
  async createConfigBackup(screen, config) {
    try {
      const backupDir = path.join(CONFIG_DIR, "backups");
      await this.ensureDirectoryExists(backupDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(
        backupDir,
        `${screen}.${timestamp}.backup.json`
      );

      const backupData = JSON.stringify(config, null, 2);
      await fs.writeFile(backupPath, backupData, "utf8");

      logger.debug(`Created backup for ${screen} at ${backupPath}`);
    } catch (error) {
      logger.warn(`Failed to create backup for ${screen}:`, error);
    }
  }

  /**
   * Increment version number
   */
  incrementVersion(currentVersion) {
    if (!currentVersion) return "1.0.0";

    const parts = currentVersion.split(".").map(Number);
    parts[2] = (parts[2] || 0) + 1;

    return parts.join(".");
  }

  /**
   * Execute with distributed lock
   */
  async executeWithDistributedLock(lockKey, operation, timeout = 30000) {
    const lockValue = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lockTtl = Math.ceil(timeout / 1000);

    try {
      // Try to acquire lock
      const acquired = await this.acquireDistributedLock(
        lockKey,
        lockValue,
        lockTtl
      );
      if (!acquired) {
        throw new Error(`Failed to acquire distributed lock: ${lockKey}`);
      }

      // Execute operation
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Operation timeout")), timeout);
        }),
      ]);

      return result;
    } finally {
      // Release lock
      await this.releaseDistributedLock(lockKey, lockValue);
    }
  }

  /**
   * Acquire distributed lock
   */
  async acquireDistributedLock(lockKey, lockValue, ttl) {
    return this.executeWithCircuitBreaker("redis", async () => {
      try {
        // Use Redis SET NX EX for atomic lock acquisition
        const result = await cache.set(lockKey, lockValue, ttl);
        return result === "OK";
      } catch (error) {
        logger.warn(`Failed to acquire distributed lock ${lockKey}:`, error);
        return false;
      }
    });
  }

  /**
   * Release distributed lock
   */
  async releaseDistributedLock(lockKey, lockValue) {
    return this.executeWithCircuitBreaker("redis", async () => {
      try {
        // Use Lua script to ensure we only delete our own lock
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;

        // In a real implementation, you'd use Redis EVAL
        // For now, just delete the key
        await cache.del(lockKey);
        return true;
      } catch (error) {
        logger.warn(`Failed to release distributed lock ${lockKey}:`, error);
        return false;
      }
    });
  }

  /**
   * Execute with circuit breaker
   */
  async executeWithCircuitBreaker(service, operation) {
    const breaker = this.circuitBreaker.get(service);
    if (!breaker) {
      return await operation();
    }

    // Check circuit breaker state
    if (breaker.state === "OPEN") {
      if (Date.now() < breaker.nextAttemptTime) {
        throw new Error(`Circuit breaker is OPEN for service: ${service}`);
      }
      // Try to half-open
      breaker.state = "HALF_OPEN";
    }

    try {
      const result = await operation();

      // Success - reset circuit breaker
      if (breaker.state === "HALF_OPEN") {
        breaker.state = "CLOSED";
        breaker.failures = 0;
        breaker.lastFailureTime = null;
        breaker.nextAttemptTime = null;
      }

      return result;
    } catch (error) {
      // Failure - update circuit breaker
      breaker.failures++;
      breaker.lastFailureTime = Date.now();

      if (breaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
        breaker.state = "OPEN";
        breaker.nextAttemptTime =
          Date.now() + CIRCUIT_BREAKER_CONFIG.resetTimeout;
      }

      throw error;
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(operation, options = {}) {
    const { maxRetries, baseDelay, maxDelay } = {
      ...this.retryConfig,
      ...options,
    };

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

        logger.warn(
          `Operation failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1}):`,
          error
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Save configuration to file
   */
  async saveConfigToFile(screen, config) {
    return this.executeWithCircuitBreaker("filesystem", async () => {
      // Skip file saving in development during startup to prevent restart loops
      if (process.env.NODE_ENV === "development" && !this.initialLoadComplete) {
        logger.debug(
          `Skipping file save for ${screen} during initial development load`
        );
        return;
      }

      const configPath = path.join(CONFIG_DIR, `${screen}.json`);

      try {
        const configData = JSON.stringify(config, null, 2);
        await fs.writeFile(configPath, configData, "utf8");
        logger.debug(`Configuration saved to file: ${configPath}`);
      } catch (error) {
        logger.error(
          `Failed to save configuration to file ${configPath}:`,
          error
        );
        throw error;
      }
    });
  }

  /**
   * Update configuration metadata
   */
  async updateConfigMetadata() {
    try {
      const metadata = {
        totalScreens: this.configStore.size,
        availableScreens: Array.from(this.validScreens),
        loadedScreens: Array.from(this.configStore.keys()),
        lastLoadTime: new Date().toISOString(),
        configDirectory: CONFIG_DIR,
        schemaDirectory: SCHEMA_DIR,
        templatesDirectory: TEMPLATES_DIR,
        circuitBreakerStatus: Object.fromEntries(this.circuitBreaker),
      };

      await cache.set(CACHE_METADATA_KEY, metadata, 3600);
    } catch (error) {
      logger.warn("Failed to update config metadata:", error);
    }
  }

  /**
   * Get cache TTL for screen
   */
  getCacheTtl(screen) {
    // Different TTL for different screens
    const ttlMap = {
      Auth: 3600, // 1 hour
      Home: 1800, // 30 minutes
      default: 3600, // 1 hour
    };

    return ttlMap[screen] || ttlMap.default;
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        await fs.mkdir(dirPath, { recursive: true });
        logger.debug(`Created directory: ${dirPath}`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Get all configurations
   */
  getAllConfigs() {
    const configs = {};
    for (const [screen, config] of this.configStore) {
      configs[screen] = config;
    }
    return configs;
  }

  /**
   * Get screen configuration
   */
  getScreenConfig(screen) {
    return this.configStore.get(screen) || null;
  }

  /**
   * Get configuration statistics
   */
  async getConfigStats() {
    try {
      const metadata = (await cache.get(CACHE_METADATA_KEY)) || {};
      const auditStats = await configAuditLogger.getAuditStats();

      return {
        ...metadata,
        auditStats,
        circuitBreakerStatus: Object.fromEntries(this.circuitBreaker),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to get config stats:", error);
      return {
        error: "Failed to retrieve statistics",
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Force reload screen configuration from file (bypass cache)
   */
  async forceReloadFromFile(screen, context = {}) {
    try {
      logger.info(
        `Force reloading configuration from file for screen: ${screen}`
      );

      // Load fresh configuration from file
      const config = await this.loadScreenConfigWithFallback(screen, true);

      // Update in-memory store
      this.configStore.set(screen, config);

      // Update cache with fresh data
      await this.cacheConfiguration(screen, config);

      // Audit log
      await configAuditLogger.logConfigChange(
        "config-force-reload",
        {
          screen,
          version: config.version,
          source: "file-force-reload",
        },
        context
      );

      logger.info(`Force reload completed for screen: ${screen}`);
      return config;
    } catch (error) {
      logger.error(
        `Failed to force reload configuration for screen ${screen}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Reload screen configuration
   */
  async reloadScreenConfig(screen, context = {}) {
    try {
      logger.info(`Reloading configuration for screen: ${screen}`);

      // Clear cache first to ensure fresh load
      await this.clearScreenCache(screen);

      // Load fresh configuration
      const config = await this.loadScreenConfigWithFallback(screen, true);

      // Update in-memory store
      this.configStore.set(screen, config);

      // Update cache
      await this.cacheConfiguration(screen, config);

      // Audit log
      await configAuditLogger.logConfigChange(
        "config-reload",
        {
          screen,
          version: config.version,
        },
        context
      );

      logger.info(`Reloaded configuration for screen: ${screen}`);
      return config;
    } catch (error) {
      logger.error(
        `Failed to reload configuration for screen ${screen}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Clear screen cache
   */
  async clearScreenCache(screen) {
    return this.executeWithCircuitBreaker("redis", async () => {
      try {
        const cacheKey = `${CACHE_PREFIX}${screen}`;
        await cache.del(cacheKey);
        logger.debug(`Cleared cache for screen: ${screen}`);
      } catch (error) {
        logger.warn(`Failed to clear cache for screen ${screen}:`, error);
      }
    });
  }

  /**
   * Clear all configuration cache
   */
  async clearAllCache() {
    return this.executeWithCircuitBreaker("redis", async () => {
      try {
        // Get all cache keys for configurations
        const keys = [];
        for (const screen of this.validScreens) {
          keys.push(`${CACHE_PREFIX}${screen}`);
        }

        if (keys.length > 0) {
          await Promise.all(keys.map((key) => cache.del(key)));
          logger.info(`Cleared cache for ${keys.length} screens`);
        }

        // Also clear metadata cache
        await cache.del(CACHE_METADATA_KEY);
        await cache.del(CACHE_STATS_KEY);

        logger.info("All configuration cache cleared");
      } catch (error) {
        logger.warn("Failed to clear all cache:", error);
      }
    });
  }

  /**
   * Invalidate and refresh cache for a specific screen
   */
  async invalidateAndRefreshCache(screen) {
    try {
      // Clear existing cache
      await this.clearScreenCache(screen);

      // Load fresh configuration
      const config = await this.loadScreenConfigWithFallback(screen, true);

      // Update in-memory store
      this.configStore.set(screen, config);

      // Cache the fresh configuration
      await this.cacheConfiguration(screen, config);

      logger.info(`Cache invalidated and refreshed for screen: ${screen}`);
      return config;
    } catch (error) {
      logger.error(
        `Failed to invalidate and refresh cache for screen ${screen}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get valid screens
   */
  get VALID_SCREENS() {
    return Array.from(this.validScreens);
  }

  /**
   * Get cache status for all screens
   */
  async getCacheStatus() {
    const cacheStatus = {};

    for (const screen of this.validScreens) {
      try {
        const cacheKey = `${CACHE_PREFIX}${screen}`;
        const exists = await cache.exists(cacheKey);
        const cached = exists ? await cache.get(cacheKey) : null;

        cacheStatus[screen] = {
          isCached: exists,
          cacheKey,
          lastCachedAt: cached?._metadata?.cachedAt || null,
          source: cached?._metadata?.source || null,
          ttl: cached?._metadata?.ttl || null,
        };
      } catch (error) {
        cacheStatus[screen] = {
          isCached: false,
          error: error.message,
        };
      }
    }

    return {
      cacheStatus,
      redisConnected: cache.isConnected ? cache.isConnected() : false,
      timestamp: new Date().toISOString(),
    };
  }
}

// Create singleton instance
const enhancedConfigManager = new EnhancedConfigManager();

export default enhancedConfigManager;

// Export individual methods for backward compatibility
export const {
  loadAllConfigs,
  getAllConfigs,
  getScreenConfig,
  updateConfig,
  updateMultipleConfigs,
  getConfigStats,
  reloadScreenConfig,
} = enhancedConfigManager;
