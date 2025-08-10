# 🔐 Security & Authentication - Enterprise Security Guide

Comprehensive security implementation for the Remote Configuration System with authentication, authorization, and security best practices.

## 🎯 Security Overview

The Remote Configuration System implements enterprise-grade security measures to protect configuration data and ensure only authorized access to sensitive operations.

### Security Layers

```mermaid
graph TB
    Internet[Internet] --> WAF[Web Application Firewall]
    WAF --> RateLimit[Rate Limiting]
    RateLimit --> Auth[Authentication]
    Auth --> Authz[Authorization]
    Authz --> Validation[Input Validation]
    Validation --> Sanitization[Data Sanitization]
    Sanitization --> Audit[Audit Logging]
    Audit --> App[Application]
```

### Security Features

- 🔐 **Multi-factor Authentication**: JWT + API Key options
- 🛡️ **Role-based Access Control**: Granular permissions
- 🔍 **Input Validation**: Comprehensive data validation
- 🧹 **Data Sanitization**: XSS and injection prevention
- 📊 **Audit Logging**: Complete activity tracking
- 🚦 **Rate Limiting**: DDoS protection
- 🔒 **Data Encryption**: In-transit and at-rest encryption

## 🔐 Authentication Methods

### JWT Token Authentication

#### Token Structure

```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "user123",
    "username": "admin",
    "role": "admin",
    "permissions": ["read", "write", "admin"],
    "iat": 1691668800,
    "exp": 1691755200,
    "iss": "labor2hire-config",
    "aud": "config-service"
  },
  "signature": "..."
}
```

#### Getting a JWT Token

```bash
# Login to get JWT token
curl -X POST http://localhost:5002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "securePassword123"
  }'
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h",
  "user": {
    "id": "user123",
    "username": "admin",
    "role": "admin",
    "permissions": ["read", "write", "admin"]
  }
}
```

#### Using JWT Token

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     http://localhost:5002/api/config/screen/Auth
```

#### Token Refresh

```bash
curl -X POST http://localhost:5002/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

### API Key Authentication

#### API Key Format

```
X-Config-API-Key: config_live_1234567890abcdef1234567890abcdef
```

#### Creating API Keys

```bash
curl -X POST http://localhost:5002/auth/api-keys \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App Production",
    "permissions": ["read", "write"],
    "environment": "production",
    "expiresIn": "365d"
  }'
```

Response:

```json
{
  "success": true,
  "apiKey": {
    "id": "key_123",
    "key": "config_live_1234567890abcdef1234567890abcdef",
    "name": "Mobile App Production",
    "permissions": ["read", "write"],
    "environment": "production",
    "createdAt": "2025-08-10T14:30:00.000Z",
    "expiresAt": "2026-08-10T14:30:00.000Z"
  }
}
```

#### Using API Keys

```bash
curl -H "X-Config-API-Key: config_live_1234567890abcdef1234567890abcdef" \
     http://localhost:5002/api/config/screen/Auth
```

## 🛡️ Authorization & Permissions

### Permission Levels

#### Read Permissions

- View configurations
- Get health status
- Access metrics (read-only)
- List available screens

#### Write Permissions

- Update configurations
- Reload configurations
- Clear cache
- Process templates

#### Admin Permissions

- Manage API keys
- Access detailed health information
- View audit logs
- Perform system operations

#### Backup Permissions

- Create backups
- List backups
- Restore from backups

### Role-Based Access Control

```javascript
const roles = {
  viewer: {
    permissions: ["read"],
    description: "Read-only access to configurations",
  },
  editor: {
    permissions: ["read", "write"],
    description: "Read and modify configurations",
  },
  admin: {
    permissions: ["read", "write", "admin", "backup"],
    description: "Full system access",
  },
  service: {
    permissions: ["read"],
    description: "Service-to-service communication",
  },
};
```

### Permission Checking

```javascript
// Middleware example
export const authorizeConfigOperation = (requiredPermissions = []) => {
  return (req, res, next) => {
    const userPermissions = req.configAuth?.permissions || [];
    const userRole = req.configAuth?.role;

    // Check if user has required permissions
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        required: requiredPermissions,
        userRole: userRole,
        userPermissions: userPermissions,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
};
```

## 🔒 Authentication Implementation

### JWT Authentication Middleware

```javascript
import jwt from "jsonwebtoken";
import { cache } from "../../../config/redis.js";

export const authenticateConfigAccess = async (req, res, next) => {
  try {
    const token = extractToken(req);
    const apiKey = req.get("X-Config-API-Key");

    if (token) {
      await authenticateJwtToken(req, res, next, token);
    } else if (apiKey) {
      await authenticateApiKey(req, res, next, apiKey);
    } else {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "MISSING_AUTH",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      error: "AUTH_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

async function authenticateJwtToken(req, res, next, token) {
  try {
    // Check if token is blacklisted
    const blacklisted = await cache.get(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        message: "Token has been revoked",
        error: "TOKEN_REVOKED",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is expired
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
        error: "TOKEN_EXPIRED",
      });
    }

    // Load user permissions
    const userPermissions = await loadUserPermissions(decoded.userId);

    req.configAuth = {
      type: "jwt",
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      permissions: userPermissions,
      token: token,
    };

    // Log authentication
    await logAuthEvent("jwt_auth_success", {
      userId: decoded.userId,
      role: decoded.role,
      ip: req.ip,
    });

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
        error: "TOKEN_EXPIRED",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
        error: "INVALID_TOKEN",
      });
    }

    throw error;
  }
}

async function authenticateApiKey(req, res, next, apiKey) {
  try {
    // Check API key format
    if (!apiKey.startsWith("config_")) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key format",
        error: "INVALID_API_KEY_FORMAT",
      });
    }

    // Load API key details from cache/database
    const keyDetails = await loadApiKeyDetails(apiKey);

    if (!keyDetails) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key",
        error: "INVALID_API_KEY",
      });
    }

    // Check if API key is active
    if (!keyDetails.active) {
      return res.status(401).json({
        success: false,
        message: "API key has been deactivated",
        error: "API_KEY_DEACTIVATED",
      });
    }

    // Check expiration
    if (keyDetails.expiresAt && new Date() > new Date(keyDetails.expiresAt)) {
      return res.status(401).json({
        success: false,
        message: "API key has expired",
        error: "API_KEY_EXPIRED",
      });
    }

    // Check rate limiting for this API key
    const rateLimitCheck = await checkApiKeyRateLimit(apiKey);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: "Rate limit exceeded for API key",
        error: "RATE_LIMIT_EXCEEDED",
        retryAfter: rateLimitCheck.retryAfter,
      });
    }

    req.configAuth = {
      type: "apiKey",
      apiKey: apiKey,
      keyId: keyDetails.id,
      name: keyDetails.name,
      permissions: keyDetails.permissions,
      environment: keyDetails.environment,
    };

    // Log API key usage
    await logAuthEvent("api_key_auth_success", {
      keyId: keyDetails.id,
      name: keyDetails.name,
      ip: req.ip,
    });

    // Update last used timestamp
    await updateApiKeyLastUsed(keyDetails.id);

    next();
  } catch (error) {
    console.error("API key authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "API key authentication failed",
      error: "API_KEY_AUTH_ERROR",
    });
  }
}
```

### Token Management

#### Token Blacklisting

```javascript
export async function blacklistToken(token, reason = "manual_revoke") {
  try {
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn > 0) {
      await cache.setex(
        `blacklist:${token}`,
        expiresIn,
        JSON.stringify({
          reason,
          blacklistedAt: new Date().toISOString(),
        })
      );
    }

    await logAuthEvent("token_blacklisted", {
      userId: decoded.userId,
      reason,
      expiresIn,
    });

    return true;
  } catch (error) {
    console.error("Failed to blacklist token:", error);
    return false;
  }
}
```

#### Token Refresh

```javascript
export async function refreshJwtToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if refresh token is blacklisted
    const blacklisted = await cache.get(`refresh_blacklist:${refreshToken}`);
    if (blacklisted) {
      throw new Error("Refresh token has been revoked");
    }

    // Generate new access token
    const newToken = jwt.sign(
      {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    return {
      token: newToken,
      expiresIn: "24h",
    };
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
}
```

## 🔍 Input Validation & Sanitization

### Input Sanitization Middleware

```javascript
export const sanitizeConfigInput = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === "object") {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize route parameters
    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error("Input sanitization error:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid input data",
      error: "INPUT_SANITIZATION_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
};

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" ? sanitizeObject(item) : sanitizeValue(item)
    );
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key name
      const sanitizedKey = sanitizeValue(key);

      // Recursively sanitize value
      if (typeof value === "object") {
        sanitized[sanitizedKey] = sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = sanitizeValue(value);
      }
    }
    return sanitized;
  }

  return sanitizeValue(obj);
}

function sanitizeValue(value) {
  if (typeof value !== "string") {
    return value;
  }

  // Remove potentially dangerous characters
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove script tags
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/[<>'"]/g, "") // Remove HTML characters
    .trim();
}
```

### Request Validation

```javascript
import { body, param, query, validationResult } from "express-validator";

// Validation rules for configuration updates
export const validateConfigUpdate = [
  body("screen")
    .notEmpty()
    .withMessage("Screen name is required")
    .isString()
    .withMessage("Screen name must be a string")
    .isLength({ min: 2, max: 50 })
    .withMessage("Screen name must be between 2 and 50 characters")
    .matches(/^[a-zA-Z][a-zA-Z0-9]*$/)
    .withMessage(
      "Screen name must start with a letter and contain only alphanumeric characters"
    ),

  body("key")
    .notEmpty()
    .withMessage("Configuration key is required")
    .isString()
    .withMessage("Configuration key must be a string")
    .isLength({ min: 1, max: 100 })
    .withMessage("Key must be between 1 and 100 characters")
    .matches(/^[a-zA-Z][a-zA-Z0-9._]*$/)
    .withMessage(
      "Key must start with a letter and contain only alphanumeric characters, dots, and underscores"
    ),

  body("value")
    .exists()
    .withMessage("Configuration value is required")
    .custom((value) => {
      // Validate JSON if it's a string that looks like JSON
      if (
        typeof value === "string" &&
        (value.startsWith("{") || value.startsWith("["))
      ) {
        try {
          JSON.parse(value);
        } catch (error) {
          throw new Error("Value must be valid JSON if providing JSON string");
        }
      }
      return true;
    }),
];

// Error handling middleware
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
      timestamp: new Date().toISOString(),
    });
  }
  next();
};
```

## 🚦 Rate Limiting

### Rate Limiting Configuration

```javascript
import rateLimit from "express-rate-limit";

// General rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
    error: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key if available, otherwise IP
    return req.configAuth?.apiKey || req.ip;
  },
});

// Strict rate limiting for write operations
export const writeOperationsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Limit to 100 write operations per 5 minutes
  message: {
    success: false,
    message: "Too many write operations, please slow down",
    error: "WRITE_RATE_LIMIT_EXCEEDED",
  },
  skip: (req) => {
    // Skip rate limiting for admin users
    return req.configAuth?.role === "admin";
  },
});

// API key specific rate limiting
export async function checkApiKeyRateLimit(apiKey) {
  const key = `rate_limit:api_key:${apiKey}`;
  const current = await cache.get(key);

  const limit = 1000; // 1000 requests per hour
  const window = 3600; // 1 hour in seconds

  if (current === null) {
    await cache.setex(key, window, 1);
    return { allowed: true, remaining: limit - 1 };
  }

  const count = parseInt(current);
  if (count >= limit) {
    const ttl = await cache.ttl(key);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: ttl,
    };
  }

  await cache.incr(key);
  return {
    allowed: true,
    remaining: limit - count - 1,
  };
}
```

## 📊 Security Monitoring & Audit Logging

### Audit Event Logging

```javascript
import { logger } from "../../../config/logger.js";

const AUDIT_LOG_PREFIX = "config:audit:";

export class SecurityAuditLogger {
  constructor() {
    this.securityEvents = [
      "auth_success",
      "auth_failure",
      "permission_denied",
      "config_access",
      "config_update",
      "admin_operation",
      "suspicious_activity",
      "rate_limit_exceeded",
    ];
  }

  async logSecurityEvent(event, data, context = {}) {
    const auditEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      event: event,
      severity: this.getEventSeverity(event),
      data: this.sanitizeLogData(data),
      context: {
        ip: context.ip,
        userAgent: context.userAgent,
        userId: context.userId,
        sessionId: context.sessionId,
        requestId: context.requestId,
      },
      source: "remote-config-security",
    };

    // Log to file
    logger.info("Security Event", auditEvent);

    // Store in Redis for analysis
    await this.storeAuditEvent(auditEvent);

    // Send alert for high-severity events
    if (auditEvent.severity === "high" || auditEvent.severity === "critical") {
      await this.sendSecurityAlert(auditEvent);
    }
  }

  async logAuthEvent(operation, data, context = {}) {
    await this.logSecurityEvent(`auth_${operation}`, data, context);
  }

  async logConfigAccess(operation, data, context = {}) {
    await this.logSecurityEvent(`config_${operation}`, data, context);
  }

  async logSuspiciousActivity(description, data, context = {}) {
    await this.logSecurityEvent(
      "suspicious_activity",
      {
        description,
        ...data,
      },
      context
    );
  }

  getEventSeverity(event) {
    const severityMap = {
      auth_failure: "medium",
      permission_denied: "medium",
      suspicious_activity: "high",
      admin_operation: "high",
      config_update: "low",
      rate_limit_exceeded: "medium",
    };

    return severityMap[event] || "low";
  }

  sanitizeLogData(data) {
    // Remove sensitive information from logs
    const sanitized = { ...data };

    // Remove passwords, tokens, etc.
    const sensitiveFields = ["password", "token", "apiKey", "secret"];
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    });

    return sanitized;
  }

  async storeAuditEvent(auditEvent) {
    try {
      const key = `${AUDIT_LOG_PREFIX}${auditEvent.id}`;
      await cache.setex(key, 86400 * 30, JSON.stringify(auditEvent)); // 30 days

      // Add to event list for querying
      const listKey = `${AUDIT_LOG_PREFIX}events:${auditEvent.event}`;
      await cache.lpush(listKey, auditEvent.id);
      await cache.expire(listKey, 86400 * 30); // 30 days
    } catch (error) {
      logger.error("Failed to store audit event:", error);
    }
  }

  async sendSecurityAlert(auditEvent) {
    try {
      // Send to monitoring service, Slack, email, etc.
      const alertPayload = {
        title: `Security Alert: ${auditEvent.event}`,
        severity: auditEvent.severity,
        timestamp: auditEvent.timestamp,
        description: `Security event detected in Remote Configuration System`,
        details: auditEvent.data,
        context: auditEvent.context,
      };

      // Implementation depends on your alerting system
      // await sendToSlack(alertPayload);
      // await sendEmail(alertPayload);

      logger.warn("Security Alert Sent", alertPayload);
    } catch (error) {
      logger.error("Failed to send security alert:", error);
    }
  }

  generateEventId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton instance
const securityAuditLogger = new SecurityAuditLogger();
export default securityAuditLogger;
```

### Security Health Monitoring

```javascript
export class SecurityHealthMonitor {
  constructor() {
    this.metrics = {
      authFailures: 0,
      rateLimitHits: 0,
      suspiciousActivities: 0,
      lastSecurityEvent: null,
    };

    this.thresholds = {
      authFailures: 10, // per 5 minutes
      rateLimitHits: 50, // per 5 minutes
      suspiciousActivities: 5, // per hour
    };
  }

  async checkSecurityHealth() {
    const healthStatus = {
      overall: "healthy",
      checks: {},
    };

    // Check authentication failure rate
    const authFailures = await this.getRecentAuthFailures();
    healthStatus.checks.authFailures = {
      status:
        authFailures < this.thresholds.authFailures ? "healthy" : "warning",
      count: authFailures,
      threshold: this.thresholds.authFailures,
    };

    // Check rate limiting hits
    const rateLimitHits = await this.getRecentRateLimitHits();
    healthStatus.checks.rateLimiting = {
      status:
        rateLimitHits < this.thresholds.rateLimitHits ? "healthy" : "warning",
      count: rateLimitHits,
      threshold: this.thresholds.rateLimitHits,
    };

    // Check for suspicious activities
    const suspiciousActivities = await this.getRecentSuspiciousActivities();
    healthStatus.checks.suspiciousActivity = {
      status:
        suspiciousActivities < this.thresholds.suspiciousActivities
          ? "healthy"
          : "critical",
      count: suspiciousActivities,
      threshold: this.thresholds.suspiciousActivities,
    };

    // Determine overall health
    const checks = Object.values(healthStatus.checks);
    if (checks.some((check) => check.status === "critical")) {
      healthStatus.overall = "critical";
    } else if (checks.some((check) => check.status === "warning")) {
      healthStatus.overall = "warning";
    }

    return healthStatus;
  }

  async getRecentAuthFailures() {
    // Implementation to count auth failures in last 5 minutes
    const key = `${AUDIT_LOG_PREFIX}events:auth_failure`;
    const events = await cache.lrange(key, 0, -1);

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let count = 0;

    for (const eventId of events) {
      const eventData = await cache.get(`${AUDIT_LOG_PREFIX}${eventId}`);
      if (eventData) {
        const event = JSON.parse(eventData);
        if (new Date(event.timestamp).getTime() > fiveMinutesAgo) {
          count++;
        }
      }
    }

    return count;
  }
}
```

## 🔒 Data Encryption

### Environment Variables Encryption

```javascript
import crypto from "crypto";

export class ConfigEncryption {
  constructor() {
    this.algorithm = "aes-256-gcm";
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateKey();
  }

  generateKey() {
    return crypto.randomBytes(32).toString("hex");
  }

  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.secretKey);
      cipher.setAAD(Buffer.from("remote-config", "utf8"));

      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString("hex"),
        authTag: authTag.toString("hex"),
      };
    } catch (error) {
      throw new Error("Encryption failed");
    }
  }

  decrypt(encryptedData) {
    try {
      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
      decipher.setAAD(Buffer.from("remote-config", "utf8"));
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

      let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error("Decryption failed");
    }
  }
}
```

## 🛡️ Security Best Practices

### Environment Security

```bash
# .env.example - Security configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-token-secret-different-from-jwt
ENCRYPTION_KEY=your-encryption-key-32-bytes-hex
CONFIG_API_KEYS=key1,key2,key3

# Security Headers
HELMET_CSP_DIRECTIVES=default-src 'self'
CORS_ORIGIN=https://yourdomain.com,https://api.yourdomain.com
TRUSTED_PROXIES=127.0.0.1,::1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL=true

# Audit Logging
AUDIT_LOG_RETENTION_DAYS=90
SECURITY_ALERT_WEBHOOK=https://hooks.slack.com/your-webhook
```

### Security Headers Middleware

```javascript
import helmet from "helmet";

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: true,
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: "no-referrer",
  xssFilter: true,
});
```

### Secure Configuration Storage

```javascript
// Store sensitive configurations encrypted
export async function storeSecureConfig(key, config) {
  const encryption = new ConfigEncryption();
  const encrypted = encryption.encrypt(JSON.stringify(config));

  await cache.setex(`secure:${key}`, 3600, JSON.stringify(encrypted));
}

export async function getSecureConfig(key) {
  const encryptedData = await cache.get(`secure:${key}`);
  if (!encryptedData) return null;

  const encryption = new ConfigEncryption();
  const encrypted = JSON.parse(encryptedData);
  const decrypted = encryption.decrypt(encrypted);

  return JSON.parse(decrypted);
}
```

## 🔗 Related Documentation

- [API Reference](./12-api-reference.md) - Authentication endpoints
- [Installation & Setup](./03-installation-setup.md) - Security setup
- [Performance & Monitoring](./14-performance-monitoring.md) - Security monitoring
- [Troubleshooting](./16-troubleshooting.md) - Security troubleshooting

---

**Security First! 🛡️**

Implement these security measures to protect your Remote Configuration System from threats.
