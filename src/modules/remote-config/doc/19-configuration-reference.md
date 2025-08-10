# ⚙️ Configuration Reference - Complete Settings Guide

Comprehensive reference for all configuration options, environment variables, and settings in the Remote Configuration System.

## 🎯 Configuration Overview

The Remote Configuration System supports multiple configuration methods for maximum flexibility and environment-specific customization.

### Configuration Hierarchy

```mermaid
graph TD
    EnvVar[Environment Variables] --> Config[Runtime Configuration]
    Files[Configuration Files] --> Config
    CLI[Command Line Args] --> Config
    Default[Default Values] --> Config

    Config --> Validation[Schema Validation]
    Validation --> App[Application Runtime]

    Redis[Redis Config] --> Cache[Cache Layer]
    Templates[Template Config] --> Processing[Template Processing]
    WebSocket[WebSocket Config] --> RealTime[Real-time Updates]
```

### Configuration Precedence

1. **Command Line Arguments** (highest priority)
2. **Environment Variables**
3. **Configuration Files** (.env, config.json)
4. **Default Values** (lowest priority)

## 🌍 Environment Variables

### Core Application Settings

```bash
# Application Configuration
NODE_ENV=development|staging|production
PORT=5002
HOST=localhost
APP_NAME=labor2hire-backend

# Application URLs
BASE_URL=http://localhost:5002
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Process Configuration
CLUSTER_MODE=false
WORKER_COUNT=auto
PM2_INSTANCES=max
GRACEFUL_SHUTDOWN_TIMEOUT=10000
```

### Database & Storage Configuration

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_USERNAME=default
REDIS_CLUSTER_MODE=false
REDIS_SENTINEL_HOSTS=sentinel1:26379,sentinel2:26379

# Redis Connection Pool
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY=1000
REDIS_CONNECT_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=5000
REDIS_LAZY_CONNECT=true

# Redis Performance
REDIS_MAX_MEMORY_POLICY=allkeys-lru
REDIS_KEY_PREFIX=config:
REDIS_PIPELINE_ENABLED=true
REDIS_COMPRESSION_ENABLED=true
REDIS_COMPRESSION_THRESHOLD=1024

# File Storage (for backups and exports)
STORAGE_TYPE=local|s3|gcs
STORAGE_PATH=./storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=config-backups

# Database (if using additional database)
DATABASE_URL=postgresql://user:password@localhost:5432/labor2hire_config
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_TIMEOUT=30000
```

### Security Configuration

```bash
# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-token-secret-different-from-jwt
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=labor2hire-config
JWT_AUDIENCE=config-service

# API Key Configuration
API_KEY_PREFIX=config_
API_KEY_LENGTH=32
API_KEY_DEFAULT_EXPIRY=365d
API_KEY_MAX_REQUESTS_PER_HOUR=1000

# Encryption
ENCRYPTION_KEY=your-encryption-key-32-bytes-hex
ENCRYPTION_ALGORITHM=aes-256-gcm
HASH_ROUNDS=12

# Security Headers
HELMET_ENABLED=true
CORS_ENABLED=true
CORS_CREDENTIALS=true
CSRF_PROTECTION=false
RATE_LIMITING_ENABLED=true

# Session Configuration
SESSION_SECRET=your-session-secret
SESSION_TIMEOUT=86400000
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
```

### Cache Configuration

```bash
# Cache Settings
CACHE_ENABLED=true
CACHE_DEFAULT_TTL=3600
CACHE_MAX_KEYS=10000
CACHE_MEMORY_LIMIT=256mb

# Cache TTL by Type
CACHE_TTL_STATIC=86400
CACHE_TTL_DYNAMIC=300
CACHE_TTL_USER=900
CACHE_TTL_TEMPORARY=60

# Cache Strategies
CACHE_COMPRESSION=true
CACHE_SERIALIZATION=json
CACHE_INVALIDATION_STRATEGY=ttl
CACHE_WARMING_ENABLED=true
CACHE_WARMING_INTERVAL=3600000

# Cache Performance
CACHE_PIPELINE_SIZE=100
CACHE_BATCH_SIZE=50
CACHE_CONCURRENT_OPERATIONS=10
```

### Logging Configuration

```bash
# Logging Settings
LOG_LEVEL=info|debug|warn|error
LOG_FORMAT=json|simple
LOG_FILE_ENABLED=true
LOG_CONSOLE_ENABLED=true
LOG_FILE_PATH=./logs
LOG_FILE_MAX_SIZE=10mb
LOG_FILE_MAX_FILES=5

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_DETAILED=true
SECURITY_LOG_ENABLED=true

# Log Categories
LOG_REQUESTS=true
LOG_RESPONSES=false
LOG_ERRORS=true
LOG_PERFORMANCE=true
LOG_CACHE_OPERATIONS=false
LOG_WEBSOCKET_EVENTS=false

# External Logging
SYSLOG_ENABLED=false
SYSLOG_HOST=localhost
SYSLOG_PORT=514
SYSLOG_FACILITY=16

# Error Tracking
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ENVIRONMENT=development
ERROR_REPORTING_ENABLED=true
```

### WebSocket Configuration

```bash
# WebSocket Server
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=5003
WEBSOCKET_PATH=/socket.io
WEBSOCKET_CORS_ORIGIN=*
WEBSOCKET_TRANSPORTS=websocket,polling

# WebSocket Performance
WEBSOCKET_PING_TIMEOUT=5000
WEBSOCKET_PING_INTERVAL=25000
WEBSOCKET_MAX_HTTP_BUFFER_SIZE=1e6
WEBSOCKET_COMPRESSION=true

# Real-time Updates
REALTIME_UPDATES_ENABLED=true
REALTIME_DEBOUNCE_DELAY=100
REALTIME_BATCH_SIZE=10
REALTIME_MAX_LISTENERS=1000

# Broadcasting
BROADCAST_ADAPTER=memory|redis
BROADCAST_REDIS_HOST=localhost
BROADCAST_REDIS_PORT=6379
BROADCAST_NAMESPACE=/config
```

### Performance & Monitoring

```bash
# Performance Settings
PERFORMANCE_MONITORING_ENABLED=true
METRICS_COLLECTION_ENABLED=true
METRICS_COLLECTION_INTERVAL=30000
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=60000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL=true
RATE_LIMIT_STORE=memory|redis

# Request Timeout
REQUEST_TIMEOUT=30000
GRACEFUL_SHUTDOWN_TIMEOUT=10000
KEEP_ALIVE_TIMEOUT=5000

# Memory Management
MAX_MEMORY_USAGE=512mb
GARBAGE_COLLECTION_INTERVAL=60000
MEMORY_MONITORING_ENABLED=true

# Performance Thresholds
RESPONSE_TIME_THRESHOLD_WARNING=500
RESPONSE_TIME_THRESHOLD_CRITICAL=1000
ERROR_RATE_THRESHOLD_WARNING=5
ERROR_RATE_THRESHOLD_CRITICAL=10
```

### Development & Debug Settings

```bash
# Development Mode
DEBUG_MODE=true
VERBOSE_LOGGING=true
HOT_RELOAD_ENABLED=true
WATCH_FILES=true

# Debug Features
DEBUG_CACHE_OPERATIONS=false
DEBUG_WEBSOCKET_EVENTS=false
DEBUG_TEMPLATE_PROCESSING=false
DEBUG_SCHEMA_VALIDATION=false

# Testing
TEST_MODE=false
MOCK_DATA_ENABLED=false
SEED_DATA_ENABLED=false
RESET_DATA_ON_START=false

# Profiling
PROFILING_ENABLED=false
PROFILING_SAMPLE_RATE=0.1
MEMORY_PROFILING=false
CPU_PROFILING=false
```

## 📁 Configuration Files

### Main Configuration File (config.json)

```json
{
  "app": {
    "name": "Labor2Hire Remote Config",
    "version": "1.0.0",
    "environment": "development",
    "timezone": "UTC"
  },
  "server": {
    "port": 5002,
    "host": "localhost",
    "bodyLimit": "10mb",
    "timeout": 30000
  },
  "cache": {
    "redis": {
      "host": "localhost",
      "port": 6379,
      "db": 0,
      "maxRetries": 3,
      "retryDelay": 1000
    },
    "ttl": {
      "default": 3600,
      "static": 86400,
      "dynamic": 300,
      "user": 900
    },
    "compression": {
      "enabled": true,
      "threshold": 1024,
      "algorithm": "gzip"
    }
  },
  "websocket": {
    "enabled": true,
    "port": 5003,
    "path": "/socket.io",
    "corsOrigin": "*",
    "transports": ["websocket", "polling"],
    "pingTimeout": 5000,
    "pingInterval": 25000
  },
  "security": {
    "jwt": {
      "secret": "${JWT_SECRET}",
      "expiresIn": "24h",
      "issuer": "labor2hire-config",
      "audience": "config-service"
    },
    "apiKeys": {
      "prefix": "config_",
      "length": 32,
      "defaultExpiry": "365d"
    },
    "rateLimit": {
      "windowMs": 900000,
      "maxRequests": 1000,
      "skipSuccessful": true
    },
    "cors": {
      "origin": ["http://localhost:3000"],
      "credentials": true,
      "methods": ["GET", "POST", "PUT", "DELETE"],
      "allowedHeaders": ["Content-Type", "Authorization", "X-Config-API-Key"]
    }
  },
  "logging": {
    "level": "info",
    "format": "json",
    "file": {
      "enabled": true,
      "path": "./logs",
      "maxSize": "10mb",
      "maxFiles": 5
    },
    "console": {
      "enabled": true,
      "colorize": true
    },
    "audit": {
      "enabled": true,
      "retentionDays": 90
    }
  },
  "monitoring": {
    "performance": {
      "enabled": true,
      "metricsInterval": 30000,
      "historySize": 1000
    },
    "health": {
      "enabled": true,
      "checkInterval": 60000,
      "endpoints": ["/health", "/health/detailed"]
    },
    "alerts": {
      "enabled": true,
      "thresholds": {
        "responseTime": { "warning": 500, "critical": 1000 },
        "errorRate": { "warning": 5, "critical": 10 },
        "cacheHitRate": { "warning": 80, "critical": 70 }
      }
    }
  },
  "templates": {
    "enabled": true,
    "engine": "handlebars",
    "cacheTtl": 3600,
    "maxDepth": 10,
    "allowUnsafeCode": false
  },
  "validation": {
    "enabled": true,
    "strict": true,
    "coerceTypes": true,
    "removeAdditional": true,
    "allErrors": false
  },
  "backup": {
    "enabled": true,
    "interval": 86400000,
    "retention": 30,
    "compression": true,
    "storage": {
      "type": "local",
      "path": "./backups"
    }
  }
}
```

### Environment-Specific Configurations

#### Development Configuration (config.development.json)

```json
{
  "app": {
    "environment": "development"
  },
  "server": {
    "port": 5002
  },
  "logging": {
    "level": "debug",
    "console": {
      "enabled": true,
      "colorize": true
    }
  },
  "cache": {
    "ttl": {
      "default": 300,
      "static": 3600
    }
  },
  "security": {
    "rateLimit": {
      "maxRequests": 10000
    }
  },
  "monitoring": {
    "performance": {
      "metricsInterval": 10000
    }
  }
}
```

#### Production Configuration (config.production.json)

```json
{
  "app": {
    "environment": "production"
  },
  "server": {
    "port": 80,
    "host": "0.0.0.0"
  },
  "logging": {
    "level": "warn",
    "console": {
      "enabled": false
    },
    "file": {
      "enabled": true,
      "path": "/var/log/labor2hire-config"
    }
  },
  "cache": {
    "redis": {
      "host": "redis.production.com",
      "password": "${REDIS_PASSWORD}",
      "maxRetries": 5
    },
    "ttl": {
      "default": 3600,
      "static": 86400
    }
  },
  "security": {
    "cors": {
      "origin": ["https://yourdomain.com", "https://api.yourdomain.com"]
    },
    "rateLimit": {
      "maxRequests": 1000
    }
  },
  "monitoring": {
    "performance": {
      "metricsInterval": 30000
    },
    "alerts": {
      "enabled": true,
      "webhookUrl": "${ALERT_WEBHOOK_URL}"
    }
  },
  "backup": {
    "storage": {
      "type": "s3",
      "bucket": "labor2hire-config-backups",
      "region": "us-east-1"
    }
  }
}
```

## 🎛️ Runtime Configuration API

### Configuration Management Endpoints

```javascript
// Get current configuration
GET /api/admin/config
{
  "success": true,
  "config": {
    "app": { /* app settings */ },
    "cache": { /* cache settings */ },
    "security": { /* security settings */ }
  }
}

// Update configuration
PUT /api/admin/config
{
  "cache": {
    "ttl": {
      "default": 7200
    }
  }
}

// Reset configuration to defaults
POST /api/admin/config/reset
{
  "success": true,
  "message": "Configuration reset to defaults"
}

// Reload configuration from files
POST /api/admin/config/reload
{
  "success": true,
  "message": "Configuration reloaded successfully"
}
```

### Dynamic Configuration Updates

```javascript
// Configuration change handler
export async function updateConfiguration(newConfig) {
  try {
    // Validate new configuration
    const validation = await validateConfiguration(newConfig);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
    }

    // Apply configuration changes
    const changes = await applyConfigurationChanges(newConfig);

    // Notify all services of configuration changes
    await notifyConfigurationChange(changes);

    // Log configuration change
    logger.info("Configuration updated", {
      changes,
      updatedBy: "admin",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      changes,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error("Configuration update failed:", error);
    throw error;
  }
}

async function applyConfigurationChanges(newConfig) {
  const changes = [];

  // Update cache settings
  if (newConfig.cache) {
    await updateCacheConfiguration(newConfig.cache);
    changes.push("cache");
  }

  // Update logging settings
  if (newConfig.logging) {
    await updateLoggingConfiguration(newConfig.logging);
    changes.push("logging");
  }

  // Update security settings
  if (newConfig.security) {
    await updateSecurityConfiguration(newConfig.security);
    changes.push("security");
  }

  // Update monitoring settings
  if (newConfig.monitoring) {
    await updateMonitoringConfiguration(newConfig.monitoring);
    changes.push("monitoring");
  }

  return changes;
}
```

## 🔧 Template Configuration

### Template Engine Settings

```javascript
export const templateConfig = {
  // Handlebars configuration
  handlebars: {
    // Helper functions
    helpers: {
      eq: (a, b) => a === b,
      ne: (a, b) => a !== b,
      gt: (a, b) => a > b,
      lt: (a, b) => a < b,
      and: (a, b) => a && b,
      or: (a, b) => a || b,
      not: (a) => !a,
      json: (obj) => JSON.stringify(obj),
      dateFormat: (date, format) => moment(date).format(format),
      default: (value, defaultValue) => value || defaultValue,
    },

    // Partial templates
    partials: {
      header: "components/header",
      footer: "components/footer",
      navigation: "components/navigation",
      button: "components/button",
    },

    // Security settings
    strict: true,
    allowProtoPropertiesByDefault: false,
    allowProtoMethodsByDefault: false,

    // Performance settings
    cache: true,
    cacheTtl: 3600000, // 1 hour
    precompile: true,
  },

  // Template processing limits
  limits: {
    maxDepth: 10,
    maxIterations: 1000,
    maxTemplateSize: 1048576, // 1MB
    maxOutputSize: 10485760, // 10MB
    timeout: 5000, // 5 seconds
  },

  // Template validation
  validation: {
    enabled: true,
    strictMode: true,
    allowedTags: [
      "div",
      "span",
      "p",
      "h1",
      "h2",
      "h3",
      "button",
      "input",
      "form",
    ],
    allowedAttributes: ["class", "id", "data-*", "style"],
    sanitizeHtml: true,
  },
};
```

### Schema Validation Configuration

```javascript
export const validationConfig = {
  // AJV configuration
  ajv: {
    allErrors: false,
    verbose: false,
    strict: true,
    coerceTypes: true,
    removeAdditional: true,
    useDefaults: true,
    addUsedSchema: false,
  },

  // Custom validation rules
  customKeywords: [
    {
      keyword: "isValidScreenName",
      type: "string",
      schemaType: "boolean",
      compile: (schemaVal) => {
        return function validate(data) {
          if (!schemaVal) return true;
          return /^[a-zA-Z][a-zA-Z0-9]*$/.test(data);
        };
      },
    },
    {
      keyword: "isValidComponentType",
      type: "string",
      schemaType: "boolean",
      compile: (schemaVal) => {
        return function validate(data) {
          if (!schemaVal) return true;
          const validTypes = ["button", "input", "text", "image", "container"];
          return validTypes.includes(data);
        };
      },
    },
  ],

  // Schema caching
  cache: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 100, // Max schemas in cache
  },

  // Validation performance
  performance: {
    timeout: 1000, // 1 second
    maxComplexity: 1000,
    enableOptimizations: true,
  },
};
```

## 📊 Monitoring Configuration

### Metrics Collection Settings

```javascript
export const metricsConfig = {
  // Collection settings
  collection: {
    enabled: true,
    interval: 30000, // 30 seconds
    historySize: 1000, // Keep last 1000 data points
    aggregationWindow: 300000, // 5 minutes
  },

  // Metric types to collect
  metrics: {
    requests: {
      enabled: true,
      trackResponseTime: true,
      trackStatusCodes: true,
      trackUserAgents: false,
      trackIPs: false,
    },
    cache: {
      enabled: true,
      trackHitRate: true,
      trackOperationTime: true,
      trackMemoryUsage: true,
    },
    websocket: {
      enabled: true,
      trackConnections: true,
      trackMessages: true,
      trackLatency: true,
    },
    system: {
      enabled: true,
      trackMemory: true,
      trackCPU: true,
      trackUptime: true,
    },
  },

  // Alert thresholds
  alerts: {
    responseTime: {
      warning: 500,
      critical: 1000,
      consecutiveChecks: 3,
    },
    errorRate: {
      warning: 5,
      critical: 10,
      windowMinutes: 15,
    },
    cacheHitRate: {
      warning: 80,
      critical: 70,
      windowMinutes: 10,
    },
    memoryUsage: {
      warning: 80,
      critical: 90,
      consecutiveChecks: 2,
    },
  },

  // Export configuration
  export: {
    prometheus: {
      enabled: false,
      endpoint: "/metrics",
      prefix: "labor2hire_config_",
    },
    influxdb: {
      enabled: false,
      host: "localhost",
      port: 8086,
      database: "labor2hire_metrics",
    },
    statsd: {
      enabled: false,
      host: "localhost",
      port: 8125,
      prefix: "labor2hire.config.",
    },
  },
};
```

## 🔒 Security Configuration Reference

### Authentication Settings

```javascript
export const authConfig = {
  // JWT settings
  jwt: {
    algorithm: "HS256",
    secret: process.env.JWT_SECRET,
    expiresIn: "24h",
    issuer: "labor2hire-config",
    audience: "config-service",
    clockTolerance: 10, // seconds
    ignoreExpiration: false,
    ignoreNotBefore: false,
  },

  // Refresh token settings
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: "7d",
    length: 32,
    algorithm: "HS256",
  },

  // API key settings
  apiKey: {
    prefix: "config_",
    length: 32,
    algorithm: "sha256",
    defaultExpiry: "365d",
    maxKeysPerUser: 10,
    rateLimit: {
      windowMs: 3600000, // 1 hour
      maxRequests: 1000,
    },
  },

  // Session settings
  session: {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 86400000, // 24 hours
      sameSite: "lax",
    },
  },
};
```

### Permission Configuration

```javascript
export const permissionConfig = {
  // Role definitions
  roles: {
    viewer: {
      permissions: ["read"],
      description: "Read-only access to configurations",
      inherits: [],
    },
    editor: {
      permissions: ["read", "write"],
      description: "Read and modify configurations",
      inherits: ["viewer"],
    },
    admin: {
      permissions: ["read", "write", "admin", "backup"],
      description: "Full system access",
      inherits: ["editor"],
    },
    service: {
      permissions: ["read"],
      description: "Service-to-service communication",
      inherits: [],
    },
  },

  // Permission definitions
  permissions: {
    read: {
      description: "Read configurations and health status",
      resources: ["config:*", "health:*", "metrics:basic"],
    },
    write: {
      description: "Modify configurations",
      resources: ["config:write", "cache:clear", "template:process"],
    },
    admin: {
      description: "Administrative operations",
      resources: ["admin:*", "user:*", "apikey:*", "audit:*"],
    },
    backup: {
      description: "Backup and restore operations",
      resources: ["backup:create", "backup:restore", "backup:list"],
    },
  },

  // Resource-based access control
  resources: {
    patterns: [
      "config:screen:{screenName}",
      "config:global:*",
      "admin:health:detailed",
      "metrics:performance:*",
      "audit:logs:*",
    ],
    wildcards: ["*", "**"],
    caseSensitive: false,
  },
};
```

## 🔧 Configuration Validation Schema

### Main Configuration Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "app": {
      "type": "object",
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "environment": {
          "type": "string",
          "enum": ["development", "staging", "production"]
        },
        "timezone": { "type": "string", "default": "UTC" }
      },
      "required": ["name", "version", "environment"]
    },
    "server": {
      "type": "object",
      "properties": {
        "port": { "type": "integer", "minimum": 1, "maximum": 65535 },
        "host": { "type": "string", "format": "hostname" },
        "bodyLimit": { "type": "string", "pattern": "^\\d+[kmg]?b$" },
        "timeout": { "type": "integer", "minimum": 1000 }
      },
      "required": ["port"]
    },
    "cache": {
      "type": "object",
      "properties": {
        "redis": {
          "type": "object",
          "properties": {
            "host": { "type": "string" },
            "port": { "type": "integer", "minimum": 1, "maximum": 65535 },
            "db": { "type": "integer", "minimum": 0, "maximum": 15 },
            "password": { "type": "string" },
            "maxRetries": { "type": "integer", "minimum": 0 },
            "retryDelay": { "type": "integer", "minimum": 100 }
          },
          "required": ["host", "port"]
        },
        "ttl": {
          "type": "object",
          "properties": {
            "default": { "type": "integer", "minimum": 60 },
            "static": { "type": "integer", "minimum": 300 },
            "dynamic": { "type": "integer", "minimum": 60 },
            "user": { "type": "integer", "minimum": 60 }
          }
        }
      },
      "required": ["redis"]
    },
    "security": {
      "type": "object",
      "properties": {
        "jwt": {
          "type": "object",
          "properties": {
            "secret": { "type": "string", "minLength": 32 },
            "expiresIn": { "type": "string", "pattern": "^\\d+[smhd]$" },
            "issuer": { "type": "string" },
            "audience": { "type": "string" }
          },
          "required": ["secret"]
        },
        "rateLimit": {
          "type": "object",
          "properties": {
            "windowMs": { "type": "integer", "minimum": 60000 },
            "maxRequests": { "type": "integer", "minimum": 1 }
          }
        }
      }
    }
  },
  "required": ["app", "server", "cache"]
}
```

## 🔗 Related Documentation

- [Installation & Setup](./03-installation-setup.md) - Initial configuration setup
- [Security & Authentication](./13-security-auth.md) - Security configuration
- [Performance & Monitoring](./14-performance-monitoring.md) - Performance settings
- [API Reference](./12-api-reference.md) - Configuration endpoints

---

**Configure with Confidence! ⚙️**

Use this comprehensive reference to configure your Remote Configuration System for optimal performance and security.
