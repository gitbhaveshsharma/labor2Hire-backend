# 📚 API Reference - Complete API Documentation

Comprehensive documentation for all Remote Configuration System REST API endpoints and WebSocket events.

## 🌐 Base Information

- **Base URL**: `http://localhost:5002/api/config`
- **WebSocket URL**: `ws://localhost:5002/config-socket`
- **API Version**: `2.0.0`
- **Content-Type**: `application/json`
- **Authentication**: JWT Token or API Key

## 🔐 Authentication

### Authentication Methods

#### JWT Token Authentication

```http
Authorization: Bearer <jwt-token>
```

#### API Key Authentication

```http
X-Config-API-Key: <api-key>
```

### Getting JWT Token

```bash
curl -X POST http://localhost:5002/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password"
  }'
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": "24h"
}
```

## 🏥 Health & Status Endpoints

### GET /health

Check service health status.

**Authentication**: None required

**Response**:

```json
{
  "success": true,
  "message": "Configuration service health check",
  "data": {
    "service": "remote-config",
    "status": "healthy",
    "version": "2.0.0",
    "timestamp": "2025-08-10T14:30:00.000Z",
    "health": {
      "overall": "healthy",
      "components": {
        "configManager": "healthy",
        "webSocket": "healthy",
        "redis": "healthy",
        "fileSystem": "healthy"
      }
    },
    "configuration": {
      "totalScreens": 5,
      "loadedScreens": 5,
      "availableScreens": ["Auth", "Home", "Profile", "ChooseLanguage", "App"]
    },
    "websocket": {
      "status": "running",
      "connectedClients": 3,
      "totalConnections": 127,
      "totalBroadcasts": 45
    }
  }
}
```

### GET /health/detailed

Get detailed health information with all system components.

**Authentication**: Read permissions required

**Response**:

```json
{
  "success": true,
  "data": {
    "systemHealth": {
      "overall": "healthy",
      "score": 95,
      "checks": {
        "redis": { "status": "healthy", "responseTime": 12 },
        "fileSystem": { "status": "healthy", "responseTime": 5 },
        "configManager": { "status": "healthy", "loadedConfigs": 5 },
        "webSocket": { "status": "healthy", "activeConnections": 3 }
      }
    },
    "performance": {
      "uptime": 86400,
      "memoryUsage": {
        "rss": 45678912,
        "heapTotal": 23456789,
        "heapUsed": 12345678
      },
      "averageResponseTime": 125
    },
    "timestamp": "2025-08-10T14:30:00.000Z"
  }
}
```

## 📊 Configuration Endpoints

### GET /all

Get all screen configurations.

**Authentication**: Read permissions required

**Response**:

```json
{
  "success": true,
  "message": "All configurations retrieved successfully",
  "data": {
    "configs": {
      "Auth": {
        "screenType": "Auth",
        "metadata": {
          "screenTitle": "Authentication",
          "version": "1.2.3"
        },
        "components": [...]
      },
      "Home": {
        "screenType": "Home",
        "metadata": {
          "screenTitle": "Home Dashboard",
          "version": "1.1.0"
        },
        "components": [...]
      }
    },
    "totalScreens": 2,
    "availableScreens": ["Auth", "Home", "Profile", "ChooseLanguage", "App"],
    "timestamp": "2025-08-10T14:30:00.000Z"
  }
}
```

### GET /screen/:screenName

Get configuration for a specific screen.

**Parameters**:

- `screenName` (path): Name of the screen (Auth, Home, Profile, etc.)

**Authentication**: Read permissions required

**Example**:

```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:5002/api/config/screen/Auth
```

**Response**:

```json
{
  "success": true,
  "message": "Configuration retrieved successfully for screen: Auth",
  "data": {
    "screenType": "Auth",
    "metadata": {
      "screenTitle": "Authentication",
      "description": "User login and registration screen",
      "version": "1.2.3",
      "lastUpdated": "2025-08-10T14:30:00.000Z"
    },
    "globalStyles": {
      "backgroundColor": "#f0f8ff",
      "primaryColor": "#007bff"
    },
    "components": [
      {
        "type": "SafeAreaView",
        "style": { "flex": 1, "backgroundColor": "#f0f8ff" },
        "children": [...]
      }
    ],
    "_metadata": {
      "source": "cache",
      "loadedAt": "2025-08-10T14:30:00.000Z",
      "cacheHit": true
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

**Error Response** (404):

```json
{
  "success": false,
  "message": "Screen configuration not found: InvalidScreen",
  "error": "SCREEN_NOT_FOUND",
  "availableScreens": ["Auth", "Home", "Profile", "ChooseLanguage", "App"],
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### POST /update

Update a single configuration value.

**Authentication**: Write permissions required

**Request Body**:

```json
{
  "screen": "Auth",
  "key": "globalStyles.backgroundColor",
  "value": "#ffffff"
}
```

**Example**:

```bash
curl -X POST http://localhost:5002/api/config/update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "screen": "Auth",
    "key": "globalStyles.backgroundColor",
    "value": "#ffffff"
  }'
```

**Response**:

```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "screen": "Auth",
    "key": "globalStyles.backgroundColor",
    "oldValue": "#f0f8ff",
    "newValue": "#ffffff",
    "updatedConfig": {
      "screenType": "Auth",
      "globalStyles": {
        "backgroundColor": "#ffffff"
      }
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### POST /update-bulk

Update multiple configuration values at once.

**Authentication**: Write permissions required

**Request Body**:

```json
{
  "screen": "Auth",
  "updates": {
    "globalStyles.backgroundColor": "#ffffff",
    "globalStyles.primaryColor": "#28a745",
    "metadata.version": "1.3.0"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Bulk configuration update completed successfully",
  "data": {
    "screen": "Auth",
    "updatedKeys": [
      "globalStyles.backgroundColor",
      "globalStyles.primaryColor",
      "metadata.version"
    ],
    "failedKeys": [],
    "totalUpdates": 3,
    "updatedConfig": {
      // Full updated configuration
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### POST /reload/:screenName

Reload configuration from template file.

**Parameters**:

- `screenName` (path): Name of the screen to reload

**Authentication**: Write permissions required

**Example**:

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://localhost:5002/api/config/reload/Auth
```

**Response**:

```json
{
  "success": true,
  "message": "Screen configuration reloaded successfully",
  "data": {
    "screen": "Auth",
    "reloadedAt": "2025-08-10T14:30:00.000Z",
    "templateVersion": "1.2.3",
    "changes": {
      "modified": ["globalStyles.backgroundColor"],
      "added": ["features.newFeature"],
      "removed": []
    },
    "config": {
      // Reloaded configuration
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

## 📈 Monitoring Endpoints

### GET /stats

Get configuration service statistics.

**Authentication**: Read permissions required

**Response**:

```json
{
  "success": true,
  "message": "Configuration service statistics retrieved successfully",
  "data": {
    "configuration": {
      "totalScreens": 5,
      "loadedScreens": 5,
      "availableScreens": ["Auth", "Home", "Profile", "ChooseLanguage", "App"],
      "lastConfigUpdate": "2025-08-10T14:30:00.000Z"
    },
    "websocket": {
      "status": "running",
      "connectedClients": 3,
      "totalConnections": 127,
      "totalBroadcasts": 45,
      "lastBroadcast": "2025-08-10T14:25:00.000Z"
    },
    "performance": {
      "uptime": 86400,
      "memoryUsage": {
        "rss": 45678912,
        "heapTotal": 23456789,
        "heapUsed": 12345678
      },
      "cpuUsage": {
        "user": 123456,
        "system": 67890
      }
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### GET /metrics

Get Prometheus-compatible metrics.

**Authentication**: Read/Stats permissions required

**Response** (text/plain):

```
# HELP config_requests_total Total number of configuration requests
# TYPE config_requests_total counter
config_requests_total{screen="Auth",operation="get-screen"} 127
config_requests_total{screen="Home",operation="get-screen"} 89

# HELP config_updates_total Total number of configuration updates
# TYPE config_updates_total counter
config_updates_total{screen="Auth",operation="update"} 12
config_updates_total{screen="Home",operation="update"} 8

# HELP websocket_connections_active Active WebSocket connections
# TYPE websocket_connections_active gauge
websocket_connections_active 3

# HELP config_response_time_seconds Configuration response time
# TYPE config_response_time_seconds histogram
config_response_time_seconds_bucket{le="0.1"} 45
config_response_time_seconds_bucket{le="0.5"} 89
config_response_time_seconds_bucket{le="1.0"} 127
```

### GET /metrics/summary

Get metrics summary in JSON format.

**Authentication**: Read/Stats permissions required

**Response**:

```json
{
  "success": true,
  "message": "Metrics summary retrieved successfully",
  "data": {
    "requests": {
      "total": 1534,
      "successful": 1521,
      "failed": 13,
      "successRate": 99.15
    },
    "updates": {
      "total": 89,
      "successful": 87,
      "failed": 2,
      "successRate": 97.75
    },
    "cache": {
      "hits": 1245,
      "misses": 289,
      "hitRate": 81.17
    },
    "websocket": {
      "activeConnections": 3,
      "totalConnections": 127,
      "totalBroadcasts": 45
    },
    "performance": {
      "averageResponseTime": 0.125,
      "medianResponseTime": 0.089,
      "p95ResponseTime": 0.456
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

## 🧪 Testing Endpoints

### POST /test-broadcast

Send a test broadcast to all connected WebSocket clients.

**Authentication**: Write permissions required

**Request Body**:

```json
{
  "message": "Test broadcast message",
  "screen": "Auth"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Test broadcast sent successfully",
  "data": {
    "broadcastMessage": "Test broadcast message",
    "targetScreen": "Auth",
    "connectedClients": 3,
    "timestamp": "2025-08-10T14:30:00.000Z"
  }
}
```

### GET /websocket/stats

Get WebSocket connection statistics.

**Authentication**: Read permissions required

**Response**:

```json
{
  "success": true,
  "message": "WebSocket statistics retrieved successfully",
  "data": {
    "serverStatus": "running",
    "connectedClients": 3,
    "totalConnections": 127,
    "totalBroadcasts": 45,
    "lastBroadcast": "2025-08-10T14:25:00.000Z",
    "clientDetails": [
      {
        "id": "socket_123",
        "connectedAt": "2025-08-10T14:00:00.000Z",
        "lastActivity": "2025-08-10T14:29:00.000Z",
        "userAgent": "React Native/0.72"
      }
    ]
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

## 🔧 Advanced Endpoints

### POST /template/process

Process a template with custom variables.

**Authentication**: Write permissions required

**Request Body**:

```json
{
  "template": {
    "screenType": "{{SCREEN_TYPE}}",
    "title": "{{TITLE}}",
    "backgroundColor": "{{BG_COLOR}}"
  },
  "variables": {
    "SCREEN_TYPE": "CustomScreen",
    "TITLE": "My Custom Screen",
    "BG_COLOR": "#f0f0f0"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "Template processed successfully",
  "data": {
    "originalTemplate": {
      "screenType": "{{SCREEN_TYPE}}",
      "title": "{{TITLE}}",
      "backgroundColor": "{{BG_COLOR}}"
    },
    "processedTemplate": {
      "screenType": "CustomScreen",
      "title": "My Custom Screen",
      "backgroundColor": "#f0f0f0"
    },
    "variables": {
      "SCREEN_TYPE": "CustomScreen",
      "TITLE": "My Custom Screen",
      "BG_COLOR": "#f0f0f0"
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### GET /version/:screenName

Get version history for a screen.

**Parameters**:

- `screenName` (path): Name of the screen

**Authentication**: Read permissions required

**Response**:

```json
{
  "success": true,
  "message": "Version history retrieved successfully",
  "data": {
    "screen": "Auth",
    "versions": [
      {
        "version": "1.2.3",
        "timestamp": "2025-08-10T14:30:00.000Z",
        "author": "admin",
        "changes": ["Updated background color", "Added new button"],
        "hash": "abc123def456"
      },
      {
        "version": "1.2.2",
        "timestamp": "2025-08-09T10:15:00.000Z",
        "author": "developer",
        "changes": ["Fixed button alignment"],
        "hash": "def456ghi789"
      }
    ],
    "totalVersions": 12,
    "currentVersion": "1.2.3"
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### POST /version/:screenName/rollback

Rollback screen to a previous version.

**Parameters**:

- `screenName` (path): Name of the screen

**Request Body**:

```json
{
  "version": "1.2.2"
}
```

**Authentication**: Write/Rollback permissions required

**Response**:

```json
{
  "success": true,
  "message": "Configuration rolled back successfully",
  "data": {
    "screen": "Auth",
    "fromVersion": "1.2.3",
    "toVersion": "1.2.2",
    "rolledBackAt": "2025-08-10T14:30:00.000Z",
    "changes": {
      "reverted": ["Background color change", "New button addition"],
      "restored": ["Previous button alignment"]
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

## 💾 Cache Management

### GET /cache/status

Get cache status for all screens.

**Authentication**: Read permissions required

**Response**:

```json
{
  "success": true,
  "message": "Cache status retrieved successfully",
  "data": {
    "Auth": {
      "cached": true,
      "cacheHit": true,
      "lastUpdated": "2025-08-10T14:30:00.000Z",
      "size": 2048,
      "ttl": 3600
    },
    "Home": {
      "cached": true,
      "cacheHit": false,
      "lastUpdated": "2025-08-10T14:25:00.000Z",
      "size": 1536,
      "ttl": 3590
    }
  },
  "summary": {
    "totalCached": 5,
    "totalSize": 8192,
    "hitRate": 85.2
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### POST /cache/clear

Clear configuration cache.

**Authentication**: Write/Admin permissions required

**Request Body** (optional):

```json
{
  "screen": "Auth" // Optional: clear specific screen, omit to clear all
}
```

**Response**:

```json
{
  "success": true,
  "message": "Configuration cache cleared and refreshed for screen: Auth",
  "data": {
    "screen": "Auth",
    "refreshedConfig": {
      // Updated configuration
    },
    "timestamp": "2025-08-10T14:30:00.000Z"
  }
}
```

## 🔄 Backup & Restore

### GET /backup

List available backups.

**Authentication**: Read/Backup permissions required

**Response**:

```json
{
  "success": true,
  "message": "Backup list retrieved successfully",
  "data": {
    "backups": [
      {
        "id": "backup_20250810_1430",
        "timestamp": "2025-08-10T14:30:00.000Z",
        "size": 10485760,
        "screens": ["Auth", "Home", "Profile"],
        "type": "manual"
      },
      {
        "id": "backup_20250810_0900",
        "timestamp": "2025-08-10T09:00:00.000Z",
        "size": 10240000,
        "screens": ["Auth", "Home", "Profile"],
        "type": "automatic"
      }
    ],
    "totalBackups": 15,
    "totalSize": 157286400
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### POST /backup/create

Create a manual backup.

**Authentication**: Write/Backup permissions required

**Response**:

```json
{
  "success": true,
  "message": "Backup created successfully",
  "data": {
    "backup": {
      "id": "backup_20250810_1430",
      "timestamp": "2025-08-10T14:30:00.000Z",
      "metadata": {
        "screens": ["Auth", "Home", "Profile"],
        "size": 10485760,
        "creator": "admin"
      }
    }
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### POST /backup/restore

Restore from backup.

**Authentication**: Write/Backup permissions required

**Request Body**:

```json
{
  "backupId": "backup_20250810_1430"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Configuration restored from backup successfully",
  "data": {
    "backupId": "backup_20250810_1430",
    "restoredScreens": ["Auth", "Home", "Profile"],
    "restoredAt": "2025-08-10T14:30:00.000Z"
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

## 🔌 WebSocket Events

### Client → Server Events

#### connect

Establish connection to the server.

```javascript
socket.connect();
```

#### ping

Send ping to check connection health.

```javascript
socket.emit("ping");
```

#### subscribe_to_screen

Subscribe to updates for a specific screen.

```javascript
socket.emit("subscribe_to_screen", { screenName: "Auth" });
```

#### unsubscribe_from_screen

Unsubscribe from screen updates.

```javascript
socket.emit("unsubscribe_from_screen", { screenName: "Auth" });
```

### Server → Client Events

#### connection_established

Sent when connection is successfully established.

```javascript
socket.on("connection_established", (data) => {
  console.log("Connected:", data);
  // data: { clientId, timestamp, serverVersion }
});
```

#### config_update

Sent when a configuration is updated.

```javascript
socket.on("config_update", (data) => {
  console.log("Config updated:", data);
  // data: { type, screen, config, timestamp, version }
});
```

#### full_config_sync

Sent for complete configuration synchronization.

```javascript
socket.on("full_config_sync", (data) => {
  console.log("Full sync:", data);
  // data: { type, configs, timestamp, reason }
});
```

#### pong

Response to ping request.

```javascript
socket.on("pong", (data) => {
  console.log("Pong received:", data.timestamp);
});
```

#### auth_error

Sent when authentication fails.

```javascript
socket.on("auth_error", (data) => {
  console.error("Auth error:", data.message);
});
```

#### config_error

Sent when configuration loading fails.

```javascript
socket.on("config_error", (data) => {
  console.error("Config error:", data.message);
});
```

## ❌ Error Responses

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation failed
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily unavailable

### Error Response Format

```json
{
  "success": false,
  "message": "Detailed error message",
  "error": "ERROR_CODE",
  "details": {
    "field": "Additional error details",
    "code": "VALIDATION_FAILED"
  },
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

### Validation Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "screen",
      "message": "Screen name is required",
      "code": "REQUIRED"
    },
    {
      "field": "value",
      "message": "Value must be a string",
      "code": "TYPE_ERROR"
    }
  ],
  "timestamp": "2025-08-10T14:30:00.000Z"
}
```

## 🔗 Related Documentation

- [Authentication & Security](./13-security-auth.md) - Security implementation details
- [Installation & Setup](./03-installation-setup.md) - API server setup
- [Real-time Updates](./11-realtime-updates.md) - WebSocket implementation
- [Troubleshooting](./16-troubleshooting.md) - API troubleshooting guide

---

**API Reference Complete! 📚**

Use this comprehensive reference to integrate with the Remote Configuration System APIs.
