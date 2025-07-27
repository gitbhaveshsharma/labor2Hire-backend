/**
 * Remote Configuration Module - Missing Middleware and Utilities
 * Additional components to make the system production-ready
 * @author Labor2Hire Team
 */

import { logger } from "../../../config/logger.js";
import { cache } from "../../../config/redis.js";
import configMetricsService from "./metricsService.js";

/**
 * Configuration Template Engine
 * Processes template variables and generates dynamic configurations
 */
export class ConfigTemplateEngine {
  constructor() {
    this.templateVariables = new Map();
    this.customFilters = new Map();
    this.initializeDefaultVariables();
    this.initializeDefaultFilters();
  }

  /**
   * Initialize default template variables
   */
  initializeDefaultVariables() {
    this.templateVariables.set("TIMESTAMP", () => new Date().toISOString());
    this.templateVariables.set(
      "VERSION",
      () => process.env.npm_package_version || "1.0.0"
    );
    this.templateVariables.set(
      "ENVIRONMENT",
      () => process.env.NODE_ENV || "development"
    );
    this.templateVariables.set("RANDOM_ID", () =>
      Math.random().toString(36).substr(2, 9)
    );
    this.templateVariables.set(
      "DATE",
      () => new Date().toISOString().split("T")[0]
    );
    this.templateVariables.set(
      "TIME",
      () => new Date().toTimeString().split(" ")[0]
    );
  }

  /**
   * Initialize default template filters
   */
  initializeDefaultFilters() {
    this.customFilters.set("uppercase", (value) =>
      value.toString().toUpperCase()
    );
    this.customFilters.set("lowercase", (value) =>
      value.toString().toLowerCase()
    );
    this.customFilters.set(
      "capitalize",
      (value) =>
        value.toString().charAt(0).toUpperCase() +
        value.toString().slice(1).toLowerCase()
    );
    this.customFilters.set("reverse", (value) =>
      value.toString().split("").reverse().join("")
    );
    this.customFilters.set("truncate", (value, length = 50) =>
      value.toString().length > length
        ? value.toString().substring(0, length) + "..."
        : value.toString()
    );
    this.customFilters.set("format", (value, format) => {
      if (format === "currency") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(parseFloat(value) || 0);
      }
      if (format === "date") {
        return new Date(value).toLocaleDateString();
      }
      if (format === "time") {
        return new Date(value).toLocaleTimeString();
      }
      return value.toString();
    });
    this.customFilters.set("default", (value, defaultValue) =>
      value !== undefined && value !== null && value !== ""
        ? value
        : defaultValue
    );
    this.customFilters.set("replace", (value, search, replace) =>
      value.toString().replace(new RegExp(search, "g"), replace)
    );
    this.customFilters.set("split", (value, separator = ",") =>
      value.toString().split(separator)
    );
    this.customFilters.set("join", (value, separator = ",") =>
      Array.isArray(value) ? value.join(separator) : value.toString()
    );
  }

  /**
   * Register custom template variable
   */
  registerVariable(name, valueProvider) {
    if (typeof valueProvider !== "function") {
      throw new Error("Variable provider must be a function");
    }
    this.templateVariables.set(name, valueProvider);
  }

  /**
   * Register custom filter
   */
  registerFilter(name, filterFunction) {
    if (typeof filterFunction !== "function") {
      throw new Error("Filter must be a function");
    }
    this.customFilters.set(name, filterFunction);
  }

  /**
   * Process template with variables and filters
   */
  processTemplate(template, context = {}) {
    if (typeof template === "string") {
      return this.processStringTemplate(template, context);
    }

    if (Array.isArray(template)) {
      return template.map((item) => this.processTemplate(item, context));
    }

    if (typeof template === "object" && template !== null) {
      const processed = {};
      for (const [key, value] of Object.entries(template)) {
        processed[key] = this.processTemplate(value, context);
      }
      return processed;
    }

    return template;
  }

  /**
   * Process string template with variables and filters
   */
  processStringTemplate(str, context) {
    // Replace template variables {{VARIABLE_NAME}}
    str = str.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
      try {
        return this.evaluateExpression(expression.trim(), context);
      } catch (error) {
        logger.warn(
          `Failed to evaluate template expression: ${expression}`,
          error
        );
        return match; // Return original if evaluation fails
      }
    });

    return str;
  }

  /**
   * Evaluate template expression with filters
   */
  evaluateExpression(expression, context) {
    // Split by pipe to handle filters: VARIABLE | filter1 | filter2
    const parts = expression.split("|").map((part) => part.trim());
    const variableName = parts[0];
    const filters = parts.slice(1);

    // Get variable value
    let value = this.getVariableValue(variableName, context);

    // Apply filters in sequence
    for (const filterExpr of filters) {
      const [filterName, ...args] = filterExpr
        .split(":")
        .map((part) => part.trim());
      value = this.applyFilter(value, filterName, args);
    }

    return value;
  }

  /**
   * Get variable value from context or predefined variables
   */
  getVariableValue(variableName, context) {
    // Check context first
    if (context[variableName] !== undefined) {
      return context[variableName];
    }

    // Check nested context using dot notation
    if (variableName.includes(".")) {
      const value = this.getNestedValue(context, variableName);
      if (value !== undefined) {
        return value;
      }
    }

    // Check predefined variables
    if (this.templateVariables.has(variableName)) {
      const provider = this.templateVariables.get(variableName);
      return provider();
    }

    // Return variable name if not found
    logger.warn(`Template variable not found: ${variableName}`);
    return `{{${variableName}}}`;
  }

  /**
   * Get nested value using dot notation
   */
  getNestedValue(obj, path) {
    return path.split(".").reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Apply filter to value
   */
  applyFilter(value, filterName, args = []) {
    if (!this.customFilters.has(filterName)) {
      logger.warn(`Unknown filter: ${filterName}`);
      return value;
    }

    const filterFunction = this.customFilters.get(filterName);
    try {
      return filterFunction(value, ...args);
    } catch (error) {
      logger.error(`Filter application failed: ${filterName}`, error);
      return value;
    }
  }
}

/**
 * Configuration Versioning System
 * Manages configuration versions and rollback capabilities
 */
export class ConfigVersionManager {
  constructor() {
    this.versionHistory = new Map();
    this.maxVersionsPerScreen = 10;
  }

  /**
   * Create new configuration version
   */
  async createVersion(screenName, config, metadata = {}) {
    try {
      const version = this.generateVersionNumber();
      const versionData = {
        version,
        config: JSON.parse(JSON.stringify(config)), // Deep clone
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
          createdBy: metadata.userId || "system",
          type: metadata.type || "update",
        },
        hash: this.generateConfigHash(config),
      };

      // Store in memory
      if (!this.versionHistory.has(screenName)) {
        this.versionHistory.set(screenName, []);
      }

      const history = this.versionHistory.get(screenName);
      history.unshift(versionData);

      // Maintain maximum versions
      if (history.length > this.maxVersionsPerScreen) {
        history.splice(this.maxVersionsPerScreen);
      }

      // Store in Redis for persistence
      await this.persistVersionHistory(screenName, history);

      logger.info(`Created version ${version} for screen ${screenName}`, {
        version,
        screenName,
        hash: versionData.hash,
      });

      return versionData;
    } catch (error) {
      logger.error(`Failed to create version for screen ${screenName}:`, error);
      throw error;
    }
  }

  /**
   * Get configuration version
   */
  async getVersion(screenName, version) {
    try {
      const history = await this.getVersionHistory(screenName);
      return history.find((v) => v.version === version) || null;
    } catch (error) {
      logger.error(
        `Failed to get version ${version} for screen ${screenName}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get version history for screen
   */
  async getVersionHistory(screenName) {
    try {
      // Try memory first
      if (this.versionHistory.has(screenName)) {
        return this.versionHistory.get(screenName);
      }

      // Load from Redis
      const key = `config:versions:${screenName}`;
      const history = (await cache.get(key)) || [];

      // Store in memory for faster access
      this.versionHistory.set(screenName, history);

      return history;
    } catch (error) {
      logger.error(
        `Failed to get version history for screen ${screenName}:`,
        error
      );
      return [];
    }
  }

  /**
   * Rollback to specific version
   */
  async rollbackToVersion(screenName, version, metadata = {}) {
    try {
      const versionData = await this.getVersion(screenName, version);
      if (!versionData) {
        throw new Error(
          `Version ${version} not found for screen ${screenName}`
        );
      }

      // Create rollback version entry
      await this.createVersion(screenName, versionData.config, {
        ...metadata,
        type: "rollback",
        rollbackFrom: version,
        userId: metadata.userId || "system",
      });

      logger.info(`Rolled back screen ${screenName} to version ${version}`);

      return versionData.config;
    } catch (error) {
      logger.error(
        `Failed to rollback screen ${screenName} to version ${version}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(screenName, version1, version2) {
    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(screenName, version1),
        this.getVersion(screenName, version2),
      ]);

      if (!v1 || !v2) {
        throw new Error("One or both versions not found");
      }

      return {
        version1: v1.version,
        version2: v2.version,
        changes: this.detectChanges(v1.config, v2.config),
        metadata: {
          v1: v1.metadata,
          v2: v2.metadata,
        },
      };
    } catch (error) {
      logger.error(
        `Failed to compare versions ${version1} and ${version2} for screen ${screenName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Detect changes between configurations
   */
  detectChanges(config1, config2) {
    const changes = [];

    // Simple deep comparison (in production, use a proper diff library)
    const compare = (obj1, obj2, path = "") => {
      const keys = new Set([
        ...Object.keys(obj1 || {}),
        ...Object.keys(obj2 || {}),
      ]);

      for (const key of keys) {
        const currentPath = path ? `${path}.${key}` : key;
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];

        if (val1 === undefined && val2 !== undefined) {
          changes.push({ type: "added", path: currentPath, value: val2 });
        } else if (val1 !== undefined && val2 === undefined) {
          changes.push({ type: "removed", path: currentPath, value: val1 });
        } else if (
          typeof val1 === "object" &&
          typeof val2 === "object" &&
          val1 !== null &&
          val2 !== null
        ) {
          compare(val1, val2, currentPath);
        } else if (val1 !== val2) {
          changes.push({
            type: "modified",
            path: currentPath,
            oldValue: val1,
            newValue: val2,
          });
        }
      }
    };

    compare(config1, config2);
    return changes;
  }

  /**
   * Generate version number
   */
  generateVersionNumber() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `v${timestamp}_${random}`;
  }

  /**
   * Generate configuration hash
   */
  generateConfigHash(config) {
    const crypto = require("crypto");
    const configString = JSON.stringify(config, Object.keys(config).sort());
    return crypto
      .createHash("sha256")
      .update(configString)
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * Persist version history to Redis
   */
  async persistVersionHistory(screenName, history) {
    try {
      const key = `config:versions:${screenName}`;
      await cache.set(key, history, 604800); // 7 days
    } catch (error) {
      logger.warn(
        `Failed to persist version history for screen ${screenName}:`,
        error
      );
    }
  }
}

/**
 * Configuration Backup Service
 * Handles configuration backups and disaster recovery
 */
export class ConfigBackupService {
  constructor() {
    this.backupInterval = 6 * 60 * 60 * 1000; // 6 hours
    this.maxBackups = 24; // Keep 24 backups (6 days)
    this.backupTimer = null;
  }

  /**
   * Start automatic backup process
   */
  startAutomaticBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(() => {
      this.createFullBackup();
    }, this.backupInterval);

    // Create initial backup
    this.createFullBackup();

    logger.info("Automatic configuration backup started");
  }

  /**
   * Stop automatic backup process
   */
  stopAutomaticBackup() {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }

    logger.info("Automatic configuration backup stopped");
  }

  /**
   * Create full backup of all configurations
   */
  async createFullBackup() {
    try {
      const { configManager } = await import("./configManager.js");
      const allConfigs = configManager.getAllConfigs();

      const backup = {
        id: `backup_${Date.now()}`,
        timestamp: new Date().toISOString(),
        configs: allConfigs,
        metadata: {
          totalScreens: Object.keys(allConfigs).length,
          environment: process.env.NODE_ENV,
          version: process.env.npm_package_version || "1.0.0",
        },
      };

      // Store backup in Redis
      const backupKey = `config:backup:${backup.id}`;
      await cache.set(backupKey, backup, 604800); // 7 days

      // Update backup index
      await this.updateBackupIndex(backup.id);

      // Cleanup old backups
      await this.cleanupOldBackups();

      logger.info(`Created configuration backup: ${backup.id}`, {
        backupId: backup.id,
        screensCount: backup.metadata.totalScreens,
      });

      return backup;
    } catch (error) {
      logger.error("Failed to create configuration backup:", error);
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId) {
    try {
      const backupKey = `config:backup:${backupId}`;
      const backup = await cache.get(backupKey);

      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      const { configManager } = await import("./configManager.js");

      // Restore each configuration
      const restoredScreens = [];
      for (const [screenName, config] of Object.entries(backup.configs)) {
        try {
          configManager.configStore.set(screenName, config);
          await configManager.saveConfigToFile(screenName, config);
          await configManager.cacheConfiguration(screenName, config);
          restoredScreens.push(screenName);
        } catch (error) {
          logger.error(`Failed to restore screen ${screenName}:`, error);
        }
      }

      logger.info(`Restored configuration from backup: ${backupId}`, {
        backupId,
        restoredScreens,
        totalRestored: restoredScreens.length,
      });

      return {
        backupId,
        restoredScreens,
        totalRestored: restoredScreens.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to restore from backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const indexKey = "config:backup:index";
      const backupIds = (await cache.get(indexKey)) || [];

      const backups = [];
      for (const backupId of backupIds) {
        const backupKey = `config:backup:${backupId}`;
        const backup = await cache.get(backupKey);
        if (backup) {
          backups.push({
            id: backup.id,
            timestamp: backup.timestamp,
            metadata: backup.metadata,
          });
        }
      }

      return backups.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (error) {
      logger.error("Failed to list backups:", error);
      return [];
    }
  }

  /**
   * Update backup index
   */
  async updateBackupIndex(backupId) {
    try {
      const indexKey = "config:backup:index";
      const backupIds = (await cache.get(indexKey)) || [];

      backupIds.unshift(backupId);

      // Keep only the latest backups
      if (backupIds.length > this.maxBackups) {
        backupIds.splice(this.maxBackups);
      }

      await cache.set(indexKey, backupIds, 604800); // 7 days
    } catch (error) {
      logger.warn("Failed to update backup index:", error);
    }
  }

  /**
   * Cleanup old backups
   */
  async cleanupOldBackups() {
    try {
      const indexKey = "config:backup:index";
      const backupIds = (await cache.get(indexKey)) || [];

      // Remove backups beyond the maximum limit
      const toRemove = backupIds.slice(this.maxBackups);

      for (const backupId of toRemove) {
        const backupKey = `config:backup:${backupId}`;
        await cache.del(backupKey);
      }

      if (toRemove.length > 0) {
        logger.info(`Cleaned up ${toRemove.length} old backups`);
      }
    } catch (error) {
      logger.warn("Failed to cleanup old backups:", error);
    }
  }
}

// Export singleton instances
export const templateEngine = new ConfigTemplateEngine();
export const versionManager = new ConfigVersionManager();
export const backupService = new ConfigBackupService();

export default {
  ConfigTemplateEngine,
  ConfigVersionManager,
  ConfigBackupService,
  templateEngine,
  versionManager,
  backupService,
};
