/**
 * Prometheus Metrics Service for Configuration Management
 * @author Labor2Hire Team
 */

import { logger } from "../../../config/logger.js";

// Mock Prometheus client for demonstration
// In production, you would use the actual 'prom-client' package
class PrometheusClient {
  constructor() {
    this.metrics = new Map();
    this.registry = new Map();
  }

  register(metric) {
    this.registry.set(metric.name, metric);
  }

  getMetricsString() {
    let output = "";
    for (const [name, metric] of this.registry) {
      output += `# HELP ${name} ${metric.help}\n`;
      output += `# TYPE ${name} ${metric.type}\n`;

      if (metric.type === "counter" || metric.type === "gauge") {
        output += `${name} ${metric.value}\n`;
      } else if (metric.type === "histogram") {
        for (const [bucket, count] of Object.entries(metric.buckets)) {
          output += `${name}_bucket{le="${bucket}"} ${count}\n`;
        }
        output += `${name}_count ${metric.count}\n`;
        output += `${name}_sum ${metric.sum}\n`;
      }
      output += "\n";
    }
    return output;
  }
}

const client = new PrometheusClient();

/**
 * Configuration Metrics Service
 */
export class ConfigMetricsService {
  constructor() {
    this.initializeMetrics();
  }

  /**
   * Initialize Prometheus metrics
   */
  initializeMetrics() {
    // Counter metrics
    this.configRequestsTotal = {
      name: "config_requests_total",
      help: "Total number of configuration requests",
      type: "counter",
      value: 0,
      labels: {},
    };

    this.configUpdatesTotal = {
      name: "config_updates_total",
      help: "Total number of configuration updates",
      type: "counter",
      value: 0,
      labels: {},
    };

    this.configErrorsTotal = {
      name: "config_errors_total",
      help: "Total number of configuration errors",
      type: "counter",
      value: 0,
      labels: {},
    };

    this.configCacheHitsTotal = {
      name: "config_cache_hits_total",
      help: "Total number of configuration cache hits",
      type: "counter",
      value: 0,
    };

    this.configCacheMissesTotal = {
      name: "config_cache_misses_total",
      help: "Total number of configuration cache misses",
      type: "counter",
      value: 0,
    };

    // Gauge metrics
    this.configActiveConnections = {
      name: "config_active_connections",
      help: "Number of active WebSocket connections",
      type: "gauge",
      value: 0,
    };

    this.configLoadedScreens = {
      name: "config_loaded_screens",
      help: "Number of loaded configuration screens",
      type: "gauge",
      value: 0,
    };

    this.configMemoryUsage = {
      name: "config_memory_usage_bytes",
      help: "Memory usage of configuration service in bytes",
      type: "gauge",
      value: 0,
    };

    // Histogram metrics
    this.configRequestDuration = {
      name: "config_request_duration_seconds",
      help: "Duration of configuration requests in seconds",
      type: "histogram",
      buckets: {
        0.1: 0,
        0.25: 0,
        0.5: 0,
        1: 0,
        2.5: 0,
        5: 0,
        10: 0,
        "+Inf": 0,
      },
      sum: 0,
      count: 0,
    };

    this.configUpdateDuration = {
      name: "config_update_duration_seconds",
      help: "Duration of configuration updates in seconds",
      type: "histogram",
      buckets: {
        0.1: 0,
        0.25: 0,
        0.5: 0,
        1: 0,
        2.5: 0,
        5: 0,
        10: 0,
        "+Inf": 0,
      },
      sum: 0,
      count: 0,
    };

    // Register all metrics
    Object.getOwnPropertyNames(this).forEach((prop) => {
      if (this[prop] && typeof this[prop] === "object" && this[prop].name) {
        client.register(this[prop]);
      }
    });

    logger.info("Configuration metrics initialized");
  }

  /**
   * Record configuration request
   */
  recordConfigRequest(screen, operation, duration = 0) {
    try {
      // Increment request counter
      this.configRequestsTotal.value++;

      // Record request duration
      this.recordHistogram(this.configRequestDuration, duration);

      logger.debug(
        `Recorded config request: ${screen}/${operation} (${duration}s)`
      );
    } catch (error) {
      logger.error("Failed to record config request metric:", error);
    }
  }

  /**
   * Record configuration update
   */
  recordConfigUpdate(screen, operation, duration = 0, success = true) {
    try {
      // Increment update counter
      this.configUpdatesTotal.value++;

      // Record update duration
      this.recordHistogram(this.configUpdateDuration, duration);

      // Record error if failed
      if (!success) {
        this.configErrorsTotal.value++;
      }

      logger.debug(
        `Recorded config update: ${screen}/${operation} (${duration}s, success: ${success})`
      );
    } catch (error) {
      logger.error("Failed to record config update metric:", error);
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(screen) {
    try {
      this.configCacheHitsTotal.value++;
      logger.debug(`Recorded cache hit for screen: ${screen}`);
    } catch (error) {
      logger.error("Failed to record cache hit metric:", error);
    }
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(screen) {
    try {
      this.configCacheMissesTotal.value++;
      logger.debug(`Recorded cache miss for screen: ${screen}`);
    } catch (error) {
      logger.error("Failed to record cache miss metric:", error);
    }
  }

  /**
   * Update active connections
   */
  updateActiveConnections(count) {
    try {
      this.configActiveConnections.value = count;
      logger.debug(`Updated active connections: ${count}`);
    } catch (error) {
      logger.error("Failed to update active connections metric:", error);
    }
  }

  /**
   * Update loaded screens count
   */
  updateLoadedScreens(count) {
    try {
      this.configLoadedScreens.value = count;
      logger.debug(`Updated loaded screens: ${count}`);
    } catch (error) {
      logger.error("Failed to update loaded screens metric:", error);
    }
  }

  /**
   * Update memory usage
   */
  updateMemoryUsage() {
    try {
      const memUsage = process.memoryUsage();
      this.configMemoryUsage.value = memUsage.heapUsed;
      logger.debug(`Updated memory usage: ${memUsage.heapUsed} bytes`);
    } catch (error) {
      logger.error("Failed to update memory usage metric:", error);
    }
  }

  /**
   * Record error
   */
  recordError(screen, operation, errorType = "unknown") {
    try {
      this.configErrorsTotal.value++;
      logger.debug(`Recorded error for ${screen}/${operation}: ${errorType}`);
    } catch (error) {
      logger.error("Failed to record error metric:", error);
    }
  }

  /**
   * Record histogram value
   */
  recordHistogram(histogram, value) {
    try {
      histogram.sum += value;
      histogram.count++;

      // Update buckets
      for (const [bucket, _] of Object.entries(histogram.buckets)) {
        if (bucket === "+Inf" || value <= parseFloat(bucket)) {
          histogram.buckets[bucket]++;
        }
      }
    } catch (error) {
      logger.error("Failed to record histogram value:", error);
    }
  }

  /**
   * Get metrics for Prometheus scraping
   */
  getMetrics() {
    try {
      // Update memory usage before returning metrics
      this.updateMemoryUsage();

      return client.getMetricsString();
    } catch (error) {
      logger.error("Failed to get metrics:", error);
      return "# Error retrieving metrics\n";
    }
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    try {
      return {
        requests: {
          total: this.configRequestsTotal.value,
          averageDuration:
            this.configRequestDuration.count > 0
              ? this.configRequestDuration.sum /
                this.configRequestDuration.count
              : 0,
        },
        updates: {
          total: this.configUpdatesTotal.value,
          averageDuration:
            this.configUpdateDuration.count > 0
              ? this.configUpdateDuration.sum / this.configUpdateDuration.count
              : 0,
        },
        cache: {
          hits: this.configCacheHitsTotal.value,
          misses: this.configCacheMissesTotal.value,
          hitRate:
            this.configCacheHitsTotal.value +
              this.configCacheMissesTotal.value >
            0
              ? this.configCacheHitsTotal.value /
                (this.configCacheHitsTotal.value +
                  this.configCacheMissesTotal.value)
              : 0,
        },
        errors: {
          total: this.configErrorsTotal.value,
        },
        system: {
          activeConnections: this.configActiveConnections.value,
          loadedScreens: this.configLoadedScreens.value,
          memoryUsage: this.configMemoryUsage.value,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Failed to get metrics summary:", error);
      return { error: "Failed to retrieve metrics summary" };
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  resetMetrics() {
    try {
      this.configRequestsTotal.value = 0;
      this.configUpdatesTotal.value = 0;
      this.configErrorsTotal.value = 0;
      this.configCacheHitsTotal.value = 0;
      this.configCacheMissesTotal.value = 0;
      this.configActiveConnections.value = 0;
      this.configLoadedScreens.value = 0;
      this.configMemoryUsage.value = 0;

      // Reset histograms
      this.configRequestDuration.sum = 0;
      this.configRequestDuration.count = 0;
      Object.keys(this.configRequestDuration.buckets).forEach((key) => {
        this.configRequestDuration.buckets[key] = 0;
      });

      this.configUpdateDuration.sum = 0;
      this.configUpdateDuration.count = 0;
      Object.keys(this.configUpdateDuration.buckets).forEach((key) => {
        this.configUpdateDuration.buckets[key] = 0;
      });

      logger.info("Configuration metrics reset");
    } catch (error) {
      logger.error("Failed to reset metrics:", error);
    }
  }
}

// Create singleton instance
const configMetricsService = new ConfigMetricsService();

export default configMetricsService;

/**
 * Performance monitoring middleware
 */
export const performanceMonitoringMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = (Date.now() - startTime) / 1000;
    const success = res.statusCode < 400;

    // Extract screen and operation from request
    const screen = req.params.screenName || req.body.screen || "unknown";
    const operation = req.route?.path || req.path || "unknown";

    // Record metrics based on request type
    if (req.method === "GET") {
      configMetricsService.recordConfigRequest(screen, operation, duration);
    } else if (["POST", "PUT", "PATCH"].includes(req.method)) {
      configMetricsService.recordConfigUpdate(
        screen,
        operation,
        duration,
        success
      );
    }

    if (!success) {
      configMetricsService.recordError(
        screen,
        operation,
        `http_${res.statusCode}`
      );
    }

    originalEnd.apply(this, args);
  };

  next();
};
