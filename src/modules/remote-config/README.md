# Remote Configuration System

A comprehensive Node.js backend for real-time remote configuration management. This system allows you to dynamically update application configurations and broadcast changes to all connected clients in real-time using WebSocket connections.

## 🚀 Features

- **Real-time Configuration Updates**: Instant broadcasting of configuration changes via WebSocket
- **JSON File Storage**: Persistent configuration storage in JSON files
- **In-Memory Caching**: Fast access to configurations with in-memory storage
- **Schema Validation**: Enforced configuration structure and type validation
- **Bulk Updates**: Update multiple configuration keys in a single operation
- **Client Connection Management**: Track and manage WebSocket client connections
- **Comprehensive Logging**: Detailed logging for debugging and monitoring
- **Graceful Shutdown**: Proper cleanup of connections and resources
- **Health Checks**: Monitor service health and performance metrics
- **API Documentation**: Built-in API documentation and usage examples

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [WebSocket Events](#websocket-events)
- [Configuration Structure](#configuration-structure)
- [Usage Examples](#usage-examples)
- [Client Integration](#client-integration)
- [Security](#security)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

## 🛠 Installation

1. **Prerequisites**:

   - Node.js (v16 or higher)
   - npm or yarn

2. **Install Dependencies**:

   ```bash
   npm install express socket.io cors helmet compression morgan express-validator winston
   ```

3. **Setup Configuration Files**:
   The system will automatically create default configuration files in the `configs/` directory if they don't exist.

## 🚀 Quick Start

### 1. Start the Server

```bash
# Start the remote configuration server
node src/modules/remote-config/server.js
```

The server will start on port 5002 (or PORT environment variable) and will:

- Load all configuration files into memory
- Initialize the WebSocket server
- Setup HTTP API endpoints

### 2. Access the Service

- **HTTP API**: `http://localhost:5002`
- **WebSocket**: `ws://localhost:5002/config-socket`
- **Health Check**: `http://localhost:5002/api/config/health`
- **API Documentation**: `http://localhost:5002/api/config/docs`

### 3. Test the System

```bash
# Get all configurations
curl http://localhost:5002/api/config/all

# Update a configuration
curl -X POST http://localhost:5002/api/config/update \
  -H "Content-Type: application/json" \
  -d '{
    "screen": "Auth",
    "key": "backgroundColor",
    "value": "#ff0000"
  }'
```

## 📡 API Endpoints

### Configuration Management

| Method | Endpoint                         | Description                        |
| ------ | -------------------------------- | ---------------------------------- |
| `GET`  | `/api/config/health`             | Service health check               |
| `GET`  | `/api/config/all`                | Get all screen configurations      |
| `GET`  | `/api/config/screen/:screenName` | Get specific screen configuration  |
| `POST` | `/api/config/update`             | Update single configuration key    |
| `POST` | `/api/config/update-bulk`        | Update multiple configuration keys |
| `POST` | `/api/config/reload/:screenName` | Reload configuration from file     |
| `GET`  | `/api/config/stats`              | Get service statistics             |
| `POST` | `/api/config/test-broadcast`     | Send test broadcast to clients     |
| `GET`  | `/api/config/websocket/stats`    | Get WebSocket statistics           |

### Request/Response Examples

#### Update Single Configuration

**Request:**

```json
POST /api/config/update
{
  "screen": "Auth",
  "key": "backgroundColor",
  "value": "#ffffff"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Configuration updated successfully for screen: Auth",
  "data": {
    "screen": "Auth",
    "key": "backgroundColor",
    "value": "#ffffff",
    "updatedConfig": { ... },
    "lastUpdated": "2025-06-22T10:30:00.000Z"
  }
}
```

#### Bulk Update

**Request:**

```json
POST /api/config/update-bulk
{
  "screen": "Auth",
  "updates": {
    "backgroundColor": "#ffffff",
    "primaryColor": "#007bff",
    "loginButton": {
      "text": "Sign In",
      "backgroundColor": "#007bff"
    }
  }
}
```

## 🔌 WebSocket Events

### Client to Server Events

| Event                 | Description                           | Data                  |
| --------------------- | ------------------------------------- | --------------------- |
| `requestFullConfig`   | Request complete configuration sync   | None                  |
| `requestScreenConfig` | Request specific screen configuration | `screenName` (string) |
| `ping`                | Health check ping                     | None                  |

### Server to Client Events

| Event                | Description                  | Data                                      |
| -------------------- | ---------------------------- | ----------------------------------------- |
| `fullConfigSync`     | Complete configuration data  | `{ configs, timestamp, serverVersion }`   |
| `screenConfigUpdate` | Updated screen configuration | `{ screen, config, timestamp, updateId }` |
| `testMessage`        | Test broadcast message       | `{ type, message, data, timestamp }`      |
| `pong`               | Health check response        | `{ timestamp }`                           |
| `error`              | Error message                | `{ message, timestamp }`                  |
| `serverShutdown`     | Server shutdown notice       | `{ reason, timestamp, message }`          |

## 📱 Configuration Structure

### Auth Screen Configuration

```json
{
  "screenTitle": "Welcome to Labor2Hire",
  "backgroundColor": "#ffffff",
  "primaryColor": "#007bff",
  "loginButton": {
    "text": "Sign In",
    "backgroundColor": "#007bff",
    "textColor": "#ffffff",
    "enabled": true
  },
  "features": {
    "biometricLogin": false,
    "rememberMe": true,
    "autoLogin": false
  },
  "version": "1.0.0",
  "lastUpdated": "2025-06-22T00:00:00Z"
}
```

### Home Screen Configuration

```json
{
  "screenTitle": "Dashboard",
  "backgroundColor": "#f8f9fa",
  "navigationBar": {
    "style": "bottom",
    "backgroundColor": "#ffffff",
    "items": [
      {
        "id": "jobs",
        "label": "Jobs",
        "icon": "briefcase",
        "enabled": true
      }
    ]
  },
  "features": {
    "darkMode": false,
    "realTimeUpdates": true
  },
  "version": "1.0.0",
  "lastUpdated": "2025-06-22T00:00:00Z"
}
```

## 💡 Usage Examples

### Node.js Client

```javascript
import { ConfigClient } from "./client-example.js";

const client = new ConfigClient({
  serverUrl: "http://localhost:5002",
  onConfigUpdate: (screen, config) => {
    console.log(`Configuration updated for ${screen}`);
    // Update your app's UI based on new config
    updateAppUI(screen, config);
  },
});

client.connect();
```

### Web Client (JavaScript)

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:5002", {
  path: "/config-socket",
});

socket.on("connect", () => {
  console.log("Connected to config server");
  socket.emit("requestFullConfig");
});

socket.on("screenConfigUpdate", (data) => {
  console.log("Config updated:", data.screen);
  // Apply configuration changes
  applyConfigChanges(data.screen, data.config);
});
```

### React Hook Example

```javascript
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function useRemoteConfig(serverUrl = "http://localhost:5002") {
  const [configs, setConfigs] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(serverUrl, { path: "/config-socket" });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("requestFullConfig");
    });

    socket.on("fullConfigSync", (data) => {
      setConfigs(data.configs);
    });

    socket.on("screenConfigUpdate", (data) => {
      setConfigs((prev) => ({
        ...prev,
        [data.screen]: data.config,
      }));
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => socket.disconnect();
  }, [serverUrl]);

  return { configs, connected };
}
```

## 🔐 Security

### Authentication (Optional)

The system supports authentication middleware. Uncomment the authentication line in `routes.js`:

```javascript
// Uncomment to enable authentication
router.use(authMiddleware.authenticate);
```

### Rate Limiting

Built-in rate limiting prevents abuse:

- 100 requests per minute per IP
- Configurable limits per endpoint

### Input Validation

All API inputs are validated using express-validator:

- Screen name validation
- Configuration key validation
- Value type checking
- Schema enforcement

### CORS Configuration

Configure allowed origins in environment variables:

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,https://yourapp.com
```

## ⚡ Performance

### Optimizations

1. **In-Memory Caching**: All configurations are cached in memory for fast access
2. **Compression**: HTTP responses are compressed using gzip
3. **Connection Pooling**: Efficient WebSocket connection management
4. **Bulk Operations**: Support for updating multiple keys in one operation

### Monitoring

Monitor performance using the stats endpoint:

```bash
curl http://localhost:5002/api/config/stats
```

Response includes:

- Memory usage
- Connection counts
- Performance metrics
- Uptime statistics

## 🔧 Environment Variables

```bash
# Server Configuration
PORT=5002
HOST=0.0.0.0
NODE_ENV=production

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket Configuration
WS_PING_TIMEOUT=60000
WS_PING_INTERVAL=25000
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**

   ```bash
   # Check if server is running
   curl http://localhost:5002/api/config/health

   # Check CORS settings
   # Ensure your client domain is in ALLOWED_ORIGINS
   ```

2. **Configuration Not Updating**

   ```bash
   # Check configuration file permissions
   ls -la configs/

   # Reload configuration from file
   curl -X POST http://localhost:5002/api/config/reload/Auth
   ```

3. **High Memory Usage**

   ```bash
   # Check stats for memory usage
   curl http://localhost:5002/api/config/stats

   # Consider reducing client connections or configuration size
   ```

### Debug Mode

Enable debug logging:

```bash
DEBUG=remote-config:* node src/modules/remote-config/server.js
```

### Health Check

Monitor service health:

```bash
# Basic health check
curl http://localhost:5002/api/config/health

# Detailed statistics
curl http://localhost:5002/api/config/stats
```

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/
COPY configs/ ./configs/

EXPOSE 5002
CMD ["node", "src/modules/remote-config/server.js"]
```

### Process Management

Use PM2 for production:

```bash
npm install -g pm2

# Start server
pm2 start src/modules/remote-config/server.js --name "config-server"

# Monitor
pm2 monit

# View logs
pm2 logs config-server
```

### Load Balancing

For horizontal scaling, use Redis for shared state:

```javascript
// Future enhancement: Redis adapter for Socket.IO
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## 📈 Monitoring and Analytics

### Metrics Collection

The system provides comprehensive metrics:

- **Connection Metrics**: Active connections, total connections, connection duration
- **Configuration Metrics**: Update frequency, configuration size, error rates
- **Performance Metrics**: Response times, memory usage, CPU usage
- **Error Tracking**: Error rates, error types, failed operations

### Integration with Monitoring Tools

Example integration with monitoring services:

```javascript
// Example: Send metrics to monitoring service
setInterval(() => {
  const stats = configWebSocketServer.getConnectionStats();
  sendMetricsToMonitoring("config_service", stats);
}, 60000);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation at `/api/config/docs`

---

**Made with ❤️ by the Labor2Hire Team**
