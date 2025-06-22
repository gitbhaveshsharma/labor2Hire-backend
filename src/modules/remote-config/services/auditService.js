/**
 * Configuration Audit Logging Service
 * Comprehensive audit trail for all configuration changes
 * @author Labor2Hire Team
 */

import { logger } from "../../../config/logger.js";
import { cache } from "../../../config/redis.js";

const AUDIT_LOG_PREFIX = "config:audit:";
const AUDIT_STATS_KEY = "config:audit:stats";

/**
 * Configuration audit logger
 */
export class ConfigAuditLogger {
  constructor() {
    this.auditQueue = [];
    this.processingQueue = false;
  }

  /**
   * Log configuration change audit event
   */
  async logConfigChange(operation, data, context = {}) {
    try {
      const auditEvent = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        operation,
        data: this.sanitizeAuditData(data),
        context: this.sanitizeAuditContext(context),
        severity: this.getOperationSeverity(operation),
        category: "config-change",
      };

      // Add to queue for processing
      this.auditQueue.push(auditEvent);

      // Process queue if not already processing
      if (!this.processingQueue) {
        this.processAuditQueue();
      }

      // Log immediately for critical operations
      if (auditEvent.severity === "critical") {
        await this.logAuditEventImmediately(auditEvent);
      }
    } catch (error) {
      logger.error("Failed to log configuration audit event:", error);
    }
  }

  /**
   * Log configuration access audit event
   */
  async logConfigAccess(operation, data, context = {}) {
    try {
      const auditEvent = {
        id: `access_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        operation,
        data: this.sanitizeAuditData(data),
        context: this.sanitizeAuditContext(context),
        severity: "info",
        category: "config-access",
      };

      // Store in Redis for recent access tracking
      const accessKey = `${AUDIT_LOG_PREFIX}access:${auditEvent.id}`;
      await cache.set(accessKey, auditEvent, 86400); // 24 hours

      // Log to application logger
      logger.info("Configuration access audit", auditEvent);
    } catch (error) {
      logger.error("Failed to log configuration access audit:", error);
    }
  }

  /**
   * Log security-related configuration events
   */
  async logSecurityEvent(event, data, context = {}) {
    try {
      const auditEvent = {
        id: `security_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        event,
        data: this.sanitizeAuditData(data),
        context: this.sanitizeAuditContext(context),
        severity: "warning",
        category: "config-security",
      };

      // Store in Redis with longer retention for security events
      const securityKey = `${AUDIT_LOG_PREFIX}security:${auditEvent.id}`;
      await cache.set(securityKey, auditEvent, 604800); // 7 days

      // Log immediately for security events
      await this.logAuditEventImmediately(auditEvent);
    } catch (error) {
      logger.error("Failed to log configuration security audit:", error);
    }
  }

  /**
   * Process the audit queue
   */
  async processAuditQueue() {
    if (this.processingQueue || this.auditQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      const batch = this.auditQueue.splice(0, 50); // Process in batches of 50

      for (const auditEvent of batch) {
        await this.persistAuditEvent(auditEvent);
        await this.updateAuditStats(auditEvent);
      }
    } catch (error) {
      logger.error("Failed to process audit queue:", error);
    } finally {
      this.processingQueue = false;

      // Process remaining items if any
      if (this.auditQueue.length > 0) {
        setTimeout(() => this.processAuditQueue(), 1000);
      }
    }
  }

  /**
   * Persist audit event to Redis
   */
  async persistAuditEvent(auditEvent) {
    try {
      const eventKey = `${AUDIT_LOG_PREFIX}${auditEvent.category}:${auditEvent.id}`;
      const ttl = this.getTtlForCategory(auditEvent.category);

      await cache.set(eventKey, auditEvent, ttl);

      // Add to daily index for efficient querying
      const dateKey = `${AUDIT_LOG_PREFIX}daily:${new Date().toISOString().split("T")[0]}`;
      const dailyEvents = (await cache.get(dateKey)) || [];
      dailyEvents.push(auditEvent.id);
      await cache.set(dateKey, dailyEvents, 604800); // 7 days
    } catch (error) {
      logger.error("Failed to persist audit event:", error);
    }
  }

  /**
   * Update audit statistics
   */
  async updateAuditStats(auditEvent) {
    try {
      const stats = (await cache.get(AUDIT_STATS_KEY)) || {
        totalEvents: 0,
        eventsByCategory: {},
        eventsBySeverity: {},
        lastUpdated: null,
      };

      stats.totalEvents++;
      stats.eventsByCategory[auditEvent.category] =
        (stats.eventsByCategory[auditEvent.category] || 0) + 1;
      stats.eventsBySeverity[auditEvent.severity] =
        (stats.eventsBySeverity[auditEvent.severity] || 0) + 1;
      stats.lastUpdated = new Date().toISOString();

      await cache.set(AUDIT_STATS_KEY, stats, 86400); // 24 hours
    } catch (error) {
      logger.error("Failed to update audit stats:", error);
    }
  }

  /**
   * Log audit event immediately (for critical events)
   */
  async logAuditEventImmediately(auditEvent) {
    try {
      // Log to application logger with appropriate level
      const logLevel = this.getLogLevelForSeverity(auditEvent.severity);
      logger[logLevel]("Configuration audit event", auditEvent);

      // Store in Redis immediately
      await this.persistAuditEvent(auditEvent);
      await this.updateAuditStats(auditEvent);

      // Send alert for critical events
      if (auditEvent.severity === "critical") {
        await this.sendCriticalAlert(auditEvent);
      }
    } catch (error) {
      logger.error("Failed to log audit event immediately:", error);
    }
  }

  /**
   * Send critical alert for high-severity events
   */
  async sendCriticalAlert(auditEvent) {
    try {
      // In a real implementation, this would send notifications via email, Slack, etc.
      logger.error("CRITICAL CONFIGURATION EVENT", {
        event: auditEvent,
        alert: true,
        requiresImmediate: "attention",
      });

      // Store alert for monitoring systems
      const alertKey = `${AUDIT_LOG_PREFIX}alerts:${auditEvent.id}`;
      await cache.set(
        alertKey,
        {
          ...auditEvent,
          alertSent: true,
          alertTimestamp: new Date().toISOString(),
        },
        604800
      ); // 7 days
    } catch (error) {
      logger.error("Failed to send critical alert:", error);
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats() {
    try {
      const stats = (await cache.get(AUDIT_STATS_KEY)) || {
        totalEvents: 0,
        eventsByCategory: {},
        eventsBySeverity: {},
        lastUpdated: null,
      };

      return {
        ...stats,
        queueSize: this.auditQueue.length,
        processingQueue: this.processingQueue,
      };
    } catch (error) {
      logger.error("Failed to get audit stats:", error);
      return {
        error: "Failed to retrieve audit statistics",
        queueSize: this.auditQueue.length,
        processingQueue: this.processingQueue,
      };
    }
  }

  /**
   * Get recent audit events
   */
  async getRecentAuditEvents(limit = 50, category = null) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      const todayKey = `${AUDIT_LOG_PREFIX}daily:${today}`;
      const yesterdayKey = `${AUDIT_LOG_PREFIX}daily:${yesterday}`;

      const [todayEvents, yesterdayEvents] = await Promise.all([
        cache.get(todayKey) || [],
        cache.get(yesterdayKey) || [],
      ]);

      const eventIds = [...todayEvents, ...yesterdayEvents].slice(0, limit * 2);
      const events = [];

      for (const eventId of eventIds) {
        const eventKey = `${AUDIT_LOG_PREFIX}*:${eventId}`;
        const pattern = eventKey.replace("*", category || "*");

        // In a real implementation, you'd use Redis SCAN or similar
        // For now, try each category
        const categories = [
          "config-change",
          "config-access",
          "config-security",
        ];
        for (const cat of categories) {
          if (category && cat !== category) continue;

          const key = `${AUDIT_LOG_PREFIX}${cat}:${eventId}`;
          const event = await cache.get(key);
          if (event) {
            events.push(event);
            break;
          }
        }

        if (events.length >= limit) break;
      }

      return events.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    } catch (error) {
      logger.error("Failed to get recent audit events:", error);
      return [];
    }
  }

  /**
   * Sanitize audit data to remove sensitive information
   */
  sanitizeAuditData(data) {
    if (!data || typeof data !== "object") {
      return data;
    }

    const sanitized = { ...data };

    // Remove sensitive fields
    const sensitiveFields = ["password", "token", "secret", "key", "apiKey"];
    sensitiveFields.forEach((field) => {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  /**
   * Sanitize audit context information
   */
  sanitizeAuditContext(context) {
    return {
      userId: context.userId || "anonymous",
      userRole: context.userRole || "unknown",
      ip: context.ip || "unknown",
      userAgent: context.userAgent
        ? context.userAgent.substring(0, 100)
        : "unknown",
      requestId: context.requestId || null,
      sessionId: context.sessionId || null,
      method: context.method || null,
      url: context.url || null,
      timestamp: context.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Get operation severity level
   */
  getOperationSeverity(operation) {
    const severityMap = {
      "config-create": "info",
      "config-read": "info",
      "config-update": "warning",
      "config-delete": "critical",
      "config-bulk-update": "warning",
      "config-reload": "warning",
      "config-export": "info",
      "config-import": "critical",
      "unauthorized-access": "critical",
      "authentication-failed": "warning",
      "rate-limit-exceeded": "warning",
    };

    return severityMap[operation] || "info";
  }

  /**
   * Get log level for severity
   */
  getLogLevelForSeverity(severity) {
    const levelMap = {
      info: "info",
      warning: "warn",
      critical: "error",
    };

    return levelMap[severity] || "info";
  }

  /**
   * Get TTL for audit category
   */
  getTtlForCategory(category) {
    const ttlMap = {
      "config-change": 604800, // 7 days
      "config-access": 86400, // 1 day
      "config-security": 2592000, // 30 days
    };

    return ttlMap[category] || 86400;
  }
}

// Create singleton instance
const configAuditLogger = new ConfigAuditLogger();

export default configAuditLogger;
