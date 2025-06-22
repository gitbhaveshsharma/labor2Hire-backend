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
const CONFIG_DIR = path.join(__dirname, "../../../configs");
const SCHEMA_DIR = path.join(__dirname, "schemas");
const TEMPLATES_DIR = path.join(__dirname, "templates");

// Redis cache keys
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
            const config = await this.loadScreenConfigWithFallback(screen);
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
    try {
      // Discover from config files
      const configFiles = await this.discoverConfigFiles();

      // Discover from schema files
      const schemaFiles = await this.discoverSchemaFiles();

      // Discover from templates
      const templateFiles = await this.discoverTemplateFiles();

      // Discover from environment variables
      const envScreens = this.discoverScreensFromEnv();

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
    } catch (error) {
      logger.error("Failed to discover screens:", error);
      // Fallback to default screens
      this.validScreens = new Set(["Auth", "Home"]);
    }
  }

  /**
   * Discover configuration files
   */
  async discoverConfigFiles() {
    try {
      await this.ensureDirectoryExists(CONFIG_DIR);
      const files = await fs.readdir(CONFIG_DIR);

      return files
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.basename(file, ".json"));
    } catch (error) {
      logger.warn("Failed to discover config files:", error);
      return [];
    }
  }

  /**
   * Discover schema files
   */
  async discoverSchemaFiles() {
    try {
      await this.ensureDirectoryExists(SCHEMA_DIR);
      const files = await fs.readdir(SCHEMA_DIR);

      return files
        .filter((file) => file.endsWith(".schema.json"))
        .map((file) => path.basename(file, ".schema.json"));
    } catch (error) {
      logger.warn("Failed to discover schema files:", error);
      return [];
    }
  }

  /**
   * Discover template files
   */
  async discoverTemplateFiles() {
    try {
      await this.ensureDirectoryExists(TEMPLATES_DIR);
      const files = await fs.readdir(TEMPLATES_DIR);

      return files
        .filter((file) => file.endsWith(".template.json"))
        .map((file) => path.basename(file, ".template.json"));
    } catch (error) {
      logger.warn("Failed to discover template files:", error);
      return [];
    }
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
          const screenName = path.basename(schemaFile, ".schema.json");
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
          const screenName = path.basename(templateFile, ".template.json");
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
  async loadScreenConfigWithFallback(screen) {
    return this.executeWithRetry(async () => {
      // Try to load from cache first (distributed cache)
      const cachedConfig = await this.getCachedConfiguration(screen);
      if (cachedConfig) {
        logger.debug(`Loaded ${screen} configuration from cache`);
        return cachedConfig;
      }

      // Try to load from file
      try {
        const fileConfig = await this.loadScreenConfigFromFile(screen);
        if (fileConfig) {
          // Validate against schema
          await this.validateConfiguration(screen, fileConfig);
          return fileConfig;
        }
      } catch (error) {
        logger.warn(`Failed to load ${screen} from file:`, error);
      }

      // Try to load from template
      const templateConfig = await this.createConfigFromTemplate(screen);
      if (templateConfig) {
        logger.info(`Created ${screen} configuration from template`);
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
        return await cache.get(cacheKey);
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

        await cache.set(cacheKey, config, ttl);

        logger.debug(`Cached configuration for ${screen}`);
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
    };

    return this.replaceVariablesInObject(config, variables);
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

          // Save to file
          await this.saveConfigToFile(screen, updatedConfig);

          // Update cache
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

          // Save to file
          await this.saveConfigToFile(screen, updatedConfig);

          // Update cache
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
   * Reload screen configuration
   */
  async reloadScreenConfig(screen, context = {}) {
    try {
      // Clear cache first
      await this.clearScreenCache(screen);

      // Load fresh configuration
      const config = await this.loadScreenConfigWithFallback(screen);
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
   * Get valid screens
   */
  get VALID_SCREENS() {
    return Array.from(this.validScreens);
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
