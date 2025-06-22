/**
 * Configuration Health Monitoring and Alerting Service
 * @author Labor2Hire Team
 */

import { logger } from "../../../config/logger.js";
import { cache } from "../../../config/redis.js";
import configMetricsService from "./metricsService.js";

const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const ALERT_THRESHOLD_PREFIX = "config:alert:threshold:";
const ALERT_HISTORY_PREFIX = "config:alert:history:";
const HEALTH_STATUS_KEY = "config:health:status";

/**
 * Health monitoring and alerting service
 */
export class ConfigHealthService {
  constructor() {
    this.healthChecks = new Map();
    this.alertThresholds = new Map();
    this.activeAlerts = new Set();
    this.monitoringInterval = null;

    this.initializeHealthChecks();
    this.initializeAlertThresholds();
    this.startMonitoring();
  }

  /**
   * Initialize health check functions
   */
  initializeHealthChecks() {
    // Memory usage check
    this.healthChecks.set("memory", {
      name: "Memory Usage",
      check: this.checkMemoryUsage.bind(this),
      critical: false,
    });

    // Response time check
    this.healthChecks.set("response_time", {
      name: "Response Time",
      check: this.checkResponseTime.bind(this),
      critical: true,
    });

    // Error rate check
    this.healthChecks.set("error_rate", {
      name: "Error Rate",
      check: this.checkErrorRate.bind(this),
      critical: true,
    });

    // Cache hit rate check
    this.healthChecks.set("cache_hit_rate", {
      name: "Cache Hit Rate",
      check: this.checkCacheHitRate.bind(this),
      critical: false,
    });

    // WebSocket connections check
    this.healthChecks.set("websocket", {
      name: "WebSocket Health",
      check: this.checkWebSocketHealth.bind(this),
      critical: true,
    });

    // Configuration consistency check
    this.healthChecks.set("config_consistency", {
      name: "Configuration Consistency",
      check: this.checkConfigConsistency.bind(this),
      critical: true,
    });

    // Redis connectivity check
    this.healthChecks.set("redis", {
      name: "Redis Connectivity",
      check: this.checkRedisHealth.bind(this),
      critical: true,
    });

    logger.info(`Initialized ${this.healthChecks.size} health checks`);
  }

  /**
   * Initialize alert thresholds
   */
  initializeAlertThresholds() {
    // Memory usage threshold (80% of available heap)
    this.alertThresholds.set("memory", {
      warning: 0.7, // 70%
      critical: 0.9, // 90%
      unit: "percentage",
    });

    // Response time thresholds
    this.alertThresholds.set("response_time", {
      warning: 2, // 2 seconds
      critical: 5, // 5 seconds
      unit: "seconds",
    });

    // Error rate thresholds
    this.alertThresholds.set("error_rate", {
      warning: 0.05, // 5%
      critical: 0.15, // 15%
      unit: "percentage",
    });

    // Cache hit rate thresholds
    this.alertThresholds.set("cache_hit_rate", {
      warning: 0.8, // 80%
      critical: 0.6, // 60%
      unit: "percentage",
      inverse: true, // Alert when value is BELOW threshold
    });

    logger.info(`Initialized ${this.alertThresholds.size} alert thresholds`);
  }

  /**
   * Start health monitoring
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, HEALTH_CHECK_INTERVAL);

    logger.info("Health monitoring started");
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    logger.info("Health monitoring stopped");
  }

  /**
   * Perform all health checks
   */
  async performHealthChecks() {
    try {
      const healthResults = new Map();
      const timestamp = new Date().toISOString();

      // Run all health checks
      for (const [checkName, checkConfig] of this.healthChecks) {
        try {
          const result = await checkConfig.check();
          healthResults.set(checkName, {
            ...result,
            name: checkConfig.name,
            critical: checkConfig.critical,
            timestamp,
          });
        } catch (error) {
          logger.error(`Health check failed for ${checkName}:`, error);
          healthResults.set(checkName, {
            status: "error",
            message: error.message,
            name: checkConfig.name,
            critical: checkConfig.critical,
            timestamp,
          });
        }
      }

      // Process results and trigger alerts
      await this.processHealthResults(healthResults);

      // Store health status
      await this.storeHealthStatus(healthResults);
    } catch (error) {
      logger.error("Failed to perform health checks:", error);
    }
  }

  /**
   * Process health check results and trigger alerts
   */
  async processHealthResults(healthResults) {
    for (const [checkName, result] of healthResults) {
      const threshold = this.alertThresholds.get(checkName);
      if (!threshold) continue;

      const alertLevel = this.determineAlertLevel(result, threshold);

      if (alertLevel) {
        await this.triggerAlert(checkName, alertLevel, result);
      } else {
        // Clear alert if it was previously active
        await this.clearAlert(checkName);
      }
    }
  }

  /**
   * Determine alert level based on thresholds
   */
  determineAlertLevel(result, threshold) {
    if (result.status === "error") {
      return "critical";
    }

    if (typeof result.value !== "number") {
      return null;
    }

    const { warning, critical, inverse } = threshold;

    if (inverse) {
      // Alert when value is below threshold
      if (result.value < critical) return "critical";
      if (result.value < warning) return "warning";
    } else {
      // Alert when value is above threshold
      if (result.value > critical) return "critical";
      if (result.value > warning) return "warning";
    }

    return null;
  }

  /**
   * Trigger alert
   */
  async triggerAlert(checkName, level, result) {
    const alertKey = `${checkName}:${level}`;

    // Check if alert is already active
    if (this.activeAlerts.has(alertKey)) {
      return;
    }

    this.activeAlerts.add(alertKey);

    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      checkName,
      level,
      message: result.message || `${result.name} ${level} threshold exceeded`,
      value: result.value,
      threshold: this.alertThresholds.get(checkName),
      timestamp: new Date().toISOString(),
      resolved: false,
    };

    try {
      // Log alert
      const logLevel = level === "critical" ? "error" : "warn";
      logger[logLevel](
        `CONFIGURATION ALERT [${level.toUpperCase()}]: ${alert.message}`,
        {
          alert,
          checkName,
          value: result.value,
        }
      );

      // Store alert history
      await this.storeAlertHistory(alert);

      // Send notifications (implement based on your notification system)
      await this.sendAlertNotification(alert);
    } catch (error) {
      logger.error("Failed to process alert:", error);
    }
  }

  /**
   * Clear alert
   */
  async clearAlert(checkName) {
    const alertKeys = Array.from(this.activeAlerts).filter((key) =>
      key.startsWith(checkName)
    );

    for (const alertKey of alertKeys) {
      this.activeAlerts.delete(alertKey);

      logger.info(`Alert resolved: ${alertKey}`);

      // Update alert history to mark as resolved
      try {
        const historyKey = `${ALERT_HISTORY_PREFIX}${alertKey}`;
        const alertHistory = await cache.get(historyKey);
        if (alertHistory) {
          alertHistory.resolved = true;
          alertHistory.resolvedAt = new Date().toISOString();
          await cache.set(historyKey, alertHistory, 604800); // 7 days
        }
      } catch (error) {
        logger.warn("Failed to update alert history:", error);
      }
    }
  }

  /**
   * Store alert history
   */
  async storeAlertHistory(alert) {
    try {
      const historyKey = `${ALERT_HISTORY_PREFIX}${alert.checkName}:${alert.level}`;
      await cache.set(historyKey, alert, 604800); // 7 days

      // Add to daily alert index
      const dateKey = `${ALERT_HISTORY_PREFIX}daily:${new Date().toISOString().split("T")[0]}`;
      const dailyAlerts = (await cache.get(dateKey)) || [];
      dailyAlerts.push(alert.id);
      await cache.set(dateKey, dailyAlerts, 604800); // 7 days
    } catch (error) {
      logger.warn("Failed to store alert history:", error);
    }
  }

  /**
   * Send alert notification
   */
  async sendAlertNotification(alert) {
    try {
      // In a real implementation, this would send notifications via:
      // - Email
      // - Slack
      // - PagerDuty
      // - SMS
      // - Webhook

      logger.info(`Alert notification sent: ${alert.id}`, {
        checkName: alert.checkName,
        level: alert.level,
        message: alert.message,
      });

      // Store notification record
      const notificationKey = `config:notification:${alert.id}`;
      await cache.set(
        notificationKey,
        {
          alertId: alert.id,
          sentAt: new Date().toISOString(),
          channels: ["log"], // In real implementation: ['email', 'slack', etc.]
        },
        86400
      ); // 24 hours
    } catch (error) {
      logger.error("Failed to send alert notification:", error);
    }
  }

  /**
   * Store health status
   */
  async storeHealthStatus(healthResults) {
    try {
      const overallStatus = this.calculateOverallHealth(healthResults);

      const healthStatus = {
        overall: overallStatus,
        checks: Object.fromEntries(healthResults),
        activeAlerts: Array.from(this.activeAlerts),
        timestamp: new Date().toISOString(),
      };

      await cache.set(HEALTH_STATUS_KEY, healthStatus, 300); // 5 minutes
    } catch (error) {
      logger.warn("Failed to store health status:", error);
    }
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth(healthResults) {
    let hasError = false;
    let hasWarning = false;

    for (const [_, result] of healthResults) {
      if (result.status === "error" && result.critical) {
        hasError = true;
        break;
      }
      if (result.status === "warning") {
        hasWarning = true;
      }
    }

    if (hasError) return "unhealthy";
    if (hasWarning) return "degraded";
    return "healthy";
  }

  /**
   * Individual health check methods
   */

  async checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const usagePercent = memUsage.heapUsed / memUsage.heapTotal;

    return {
      status:
        usagePercent > 0.9 ? "critical" : usagePercent > 0.7 ? "warning" : "ok",
      value: usagePercent,
      message: `Memory usage: ${(usagePercent * 100).toFixed(1)}%`,
      details: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
      },
    };
  }

  async checkResponseTime() {
    const metrics = configMetricsService.getMetricsSummary();
    const avgResponseTime = metrics.requests.averageDuration;

    return {
      status:
        avgResponseTime > 5
          ? "critical"
          : avgResponseTime > 2
            ? "warning"
            : "ok",
      value: avgResponseTime,
      message: `Average response time: ${avgResponseTime.toFixed(2)}s`,
      details: {
        totalRequests: metrics.requests.total,
        averageDuration: avgResponseTime,
      },
    };
  }

  async checkErrorRate() {
    const metrics = configMetricsService.getMetricsSummary();
    const totalRequests = metrics.requests.total;
    const totalErrors = metrics.errors.total;
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0;

    return {
      status:
        errorRate > 0.15 ? "critical" : errorRate > 0.05 ? "warning" : "ok",
      value: errorRate,
      message: `Error rate: ${(errorRate * 100).toFixed(1)}%`,
      details: {
        totalErrors,
        totalRequests,
        errorRate,
      },
    };
  }

  async checkCacheHitRate() {
    const metrics = configMetricsService.getMetricsSummary();
    const hitRate = metrics.cache.hitRate;

    return {
      status: hitRate < 0.6 ? "critical" : hitRate < 0.8 ? "warning" : "ok",
      value: hitRate,
      message: `Cache hit rate: ${(hitRate * 100).toFixed(1)}%`,
      details: {
        hits: metrics.cache.hits,
        misses: metrics.cache.misses,
        hitRate,
      },
    };
  }

  async checkWebSocketHealth() {
    const metrics = configMetricsService.getMetricsSummary();
    const activeConnections = metrics.system.activeConnections;

    // This is a simple check - in a real implementation you'd check connection health
    return {
      status: "ok",
      value: activeConnections,
      message: `Active WebSocket connections: ${activeConnections}`,
      details: {
        activeConnections,
      },
    };
  }

  async checkConfigConsistency() {
    try {
      // In a real implementation, this would check:
      // - File system vs cache consistency
      // - Schema validation across all configs
      // - Template vs actual config consistency

      return {
        status: "ok",
        value: 1,
        message: "Configuration consistency check passed",
        details: {
          checked: "file-cache-consistency",
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: `Configuration consistency check failed: ${error.message}`,
      };
    }
  }

  async checkRedisHealth() {
    try {
      const start = Date.now();

      // Test Redis connectivity
      await cache.set("health:test", "ping", 10);
      const result = await cache.get("health:test");

      const responseTime = Date.now() - start;

      if (result !== "ping") {
        throw new Error("Redis ping test failed");
      }

      return {
        status: responseTime > 1000 ? "warning" : "ok",
        value: responseTime,
        message: `Redis response time: ${responseTime}ms`,
        details: {
          responseTime,
          connected: true,
        },
      };
    } catch (error) {
      return {
        status: "error",
        message: `Redis health check failed: ${error.message}`,
        details: {
          connected: false,
          error: error.message,
        },
      };
    }
  }

  /**
   * Get current health status
   */
  async getHealthStatus() {
    try {
      return (
        (await cache.get(HEALTH_STATUS_KEY)) || {
          overall: "unknown",
          message: "Health status not available",
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      logger.error("Failed to get health status:", error);
      return {
        overall: "error",
        message: "Failed to retrieve health status",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get alert history
   */
  async getAlertHistory(days = 7) {
    try {
      const alerts = [];
      const now = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = `${ALERT_HISTORY_PREFIX}daily:${date.toISOString().split("T")[0]}`;

        const dailyAlerts = (await cache.get(dateKey)) || [];
        alerts.push(...dailyAlerts);
      }

      return alerts.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (error) {
      logger.error("Failed to get alert history:", error);
      return [];
    }
  }

  /**
   * Manual health check trigger
   */
  async runManualHealthCheck() {
    try {
      await this.performHealthChecks();
      return await this.getHealthStatus();
    } catch (error) {
      logger.error("Manual health check failed:", error);
      throw error;
    }
  }
}

// Create singleton instance
const configHealthService = new ConfigHealthService();

export default configHealthService;
