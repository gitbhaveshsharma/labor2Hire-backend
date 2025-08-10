# 🛠️ Installation & Setup - Complete Setup Guide

Comprehensive installation and configuration guide for the Remote Configuration System.

## 🎯 Prerequisites

### System Requirements

- **Node.js 18+** - Required for backend server
- **Redis Server** - Required for caching and real-time features
- **Git** - For version control
- **VS Code** (recommended) - For development

### Development Environment

```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version   # Should be 8+

# Check Redis installation
redis-cli ping  # Should return PONG
```

## 📦 Installation Steps

### Step 1: Install Dependencies

```bash
# Navigate to the backend directory
cd labor2Hire-Backend

# Install required dependencies
npm install express socket.io redis ajv ajv-formats
npm install winston morgan helmet cors compression
npm install express-validator express-rate-limit
npm install jsonwebtoken crypto

# Install development dependencies
npm install --save-dev nodemon jest supertest
```

### Step 2: Environment Configuration

Create `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5002

# Database
MONGODB_URI=mongodb://localhost:27017/labor2hire
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
CONFIG_API_KEYS=config-api-key-1,config-api-key-2,config-api-key-3

# Remote Configuration
WEBSOCKET_PORT=5002
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
ADDITIONAL_SCREENS=CustomScreen1,CustomScreen2

# Monitoring
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
ALERT_WEBHOOK_URL=https://hooks.slack.com/your-webhook

# File Paths
CONFIG_BASE_PATH=src/modules/remote-config
TEMPLATES_DIR=src/modules/remote-config/templates
SCHEMAS_DIR=src/modules/remote-config/schemas
CONFIGS_DIR=src/modules/remote-config/configs

# Performance
CACHE_TTL=3600
MAX_CONNECTIONS=1000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### Step 3: Directory Structure Setup

```bash
# Create the required directory structure
mkdir -p src/modules/remote-config/{configs,schemas,templates,doc,middleware,services,tests}

# Verify directory structure
tree src/modules/remote-config/
```

Expected structure:

```
src/modules/remote-config/
├── configManager.js          # Core configuration manager
├── websocketServer.js        # WebSocket server
├── routes.js                 # REST API routes
├── index.js                  # Module entry point
├── configs/                  # Generated configuration files
├── schemas/                  # JSON schemas for validation
├── templates/                # Configuration templates
├── doc/                      # Documentation files
├── middleware/               # Authentication & security
├── services/                 # Support services
└── tests/                    # Test files
```

### Step 4: Redis Setup

#### Option A: Local Redis Installation

**Windows:**

```powershell
# Using Chocolatey
choco install redis-64

# Start Redis service
redis-server
```

**macOS:**

```bash
# Using Homebrew
brew install redis

# Start Redis service
brew services start redis
```

**Linux (Ubuntu/Debian):**

```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### Option B: Docker Redis

```bash
# Run Redis in Docker
docker run -d --name redis-config -p 6379:6379 redis:7-alpine

# Verify Redis is running
docker exec redis-config redis-cli ping
```

### Step 5: Database Setup (MongoDB)

#### Option A: Local MongoDB

```bash
# Install MongoDB Community Edition
# Follow official MongoDB installation guide for your OS

# Start MongoDB service
mongod
```

#### Option B: Docker MongoDB

```bash
# Run MongoDB in Docker
docker run -d --name mongodb-config -p 27017:27017 mongo:7

# Verify MongoDB is running
docker exec mongodb-config mongosh --eval "db.runCommand('ping')"
```

### Step 6: Application Integration

In your main application file (`app.js` or `server.js`):

```javascript
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";

// Import remote config module
import {
  configRoutes,
  initializeRemoteConfigModule,
} from "./src/modules/remote-config/index.js";

const app = express();
const server = createServer(app);

// Middleware setup
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
  })
);
app.use(compression());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Setup remote configuration
async function setupRemoteConfig() {
  try {
    const configModule = await initializeRemoteConfigModule(server);

    console.log("✅ Remote Configuration Module initialized");
    console.log(
      `📡 WebSocket server running on port ${process.env.PORT || 5002}`
    );

    // Register configuration routes
    app.use("/api/config", configRoutes);

    // Health check endpoint
    app.get("/health/config", async (req, res) => {
      try {
        const health = await configModule.configManager.getConfigStats();
        res.json({
          success: true,
          service: "remote-config",
          data: health,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
        });
      }
    });
  } catch (error) {
    console.error("❌ Remote config setup failed:", error);
    process.exit(1);
  }
}

// Initialize application
async function startApplication() {
  try {
    // Setup remote configuration
    await setupRemoteConfig();

    // Start server
    const PORT = process.env.PORT || 5002;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(
        `📡 WebSocket endpoint: ws://localhost:${PORT}/config-socket`
      );
      console.log(`🏥 Health check: http://localhost:${PORT}/health/config`);
    });
  } catch (error) {
    console.error("❌ Application startup failed:", error);
    process.exit(1);
  }
}

// Start the application
startApplication();
```

## 🔧 Configuration Files Setup

### Step 7: Create Initial Templates

Create your first template file:

**File:** `src/modules/remote-config/templates/Auth.template.json`

```json
{
  "screenType": "Auth",
  "metadata": {
    "screenTitle": "Authentication",
    "description": "User login and registration screen",
    "version": "{{VERSION}}",
    "lastUpdated": "{{TIMESTAMP}}"
  },
  "globalStyles": {
    "backgroundColor": "#f0f8ff"
  },
  "components": [
    {
      "type": "SafeAreaView",
      "style": { "flex": 1, "backgroundColor": "#f0f8ff" },
      "children": [
        {
          "type": "Text",
          "props": { "text": "Welcome to Labor2Hire" },
          "style": {
            "fontSize": 32,
            "fontWeight": "bold",
            "textAlign": "center",
            "marginBottom": 20
          }
        }
      ]
    }
  ]
}
```

### Step 8: Create Schema Files

Create validation schema:

**File:** `src/modules/remote-config/schemas/Auth.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Authentication Screen Configuration Schema",
  "type": "object",
  "required": ["screenType", "metadata", "components"],
  "properties": {
    "screenType": {
      "type": "string",
      "enum": ["Auth"]
    },
    "metadata": {
      "type": "object",
      "required": ["screenTitle", "description"],
      "properties": {
        "screenTitle": { "type": "string" },
        "description": { "type": "string" },
        "version": { "type": "string" },
        "lastUpdated": { "type": "string" }
      }
    },
    "components": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": { "type": "string" },
          "props": { "type": "object" },
          "style": { "type": "object" },
          "children": { "type": "array" }
        }
      }
    }
  }
}
```

## 🧪 Testing the Installation

### Step 9: Verify Installation

```bash
# Start the development server
npm run dev

# In another terminal, test the endpoints
curl http://localhost:5002/health/config

# Test WebSocket connection (if wscat is installed)
npm install -g wscat
wscat -c ws://localhost:5002/config-socket
```

Expected responses:

**Health Check:**

```json
{
  "success": true,
  "service": "remote-config",
  "data": {
    "totalScreens": 1,
    "loadedScreens": 1,
    "availableScreens": ["Auth"]
  }
}
```

**WebSocket Connection:**

```
Connected (press CTRL+C to quit)
< {"type":"connection_established","data":{"clientId":"client_123","timestamp":"2025-08-10T..."}}
```

### Step 10: Test Configuration API

```bash
# Get all configurations
curl -H "Authorization: Bearer your-jwt-token" \
     http://localhost:5002/api/config/all

# Get specific screen configuration
curl http://localhost:5002/api/config/screen/Auth

# Update configuration
curl -X POST \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-jwt-token" \
     -d '{"screen":"Auth","key":"backgroundColor","value":"#ffffff"}' \
     http://localhost:5002/api/config/update
```

## 📱 Frontend Integration

### Step 11: Install Frontend Dependencies

```bash
# Navigate to your React Native project
cd Labor2Hire

# Install required packages
npm install @react-native-async-storage/async-storage
npm install react-native-vector-icons
npm install socket.io-client
```

### Step 12: Configure Frontend Client

Create the configuration client:

**File:** `src/services/ConfigClient.ts`

```typescript
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

class ConfigClient {
  private socket: any;
  private configs: Record<string, any> = {};
  private baseUrl: string;

  constructor() {
    this.baseUrl = "http://localhost:5002";
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io(`${this.baseUrl}/config-socket`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Connected to config server");
    });

    this.socket.on("config_update", (data: any) => {
      this.handleConfigUpdate(data);
    });
  }

  async getScreenConfig(screenName: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/config/screen/${screenName}`
      );
      const result = await response.json();

      if (result.success) {
        this.configs[screenName] = result.data;
        return result.data;
      }

      throw new Error(result.message);
    } catch (error) {
      console.error("Failed to fetch config:", error);
      return this.getFallbackConfig(screenName);
    }
  }

  private handleConfigUpdate(data: any) {
    this.configs[data.screen] = data.config;
    // Trigger UI update
    console.log("Configuration updated:", data.screen);
  }

  private getFallbackConfig(screenName: string) {
    return {
      screenType: screenName,
      components: [
        {
          type: "Text",
          props: { text: "Loading..." },
          style: { textAlign: "center", padding: 20 },
        },
      ],
    };
  }
}

export default new ConfigClient();
```

## 🔍 Troubleshooting Installation

### Common Issues

#### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping

# Start Redis if not running
redis-server

# Check Redis logs
redis-cli monitor
```

#### MongoDB Connection Failed

```bash
# Check MongoDB status
mongosh --eval "db.runCommand('ping')"

# Start MongoDB if not running
mongod

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

#### Port Already in Use

```bash
# Find process using port 5002
lsof -i :5002

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=5003
```

#### Permission Errors

```bash
# Fix file permissions
chmod -R 755 src/modules/remote-config/

# Fix directory ownership
chown -R $USER:$USER src/modules/remote-config/
```

## 🎯 Next Steps

After successful installation:

1. **Create your first screen** → [Creating New Screens](./07-creating-screens.md)
2. **Add components** → [Adding Components](./08-adding-components.md)
3. **Style your UI** → [Styling & Theming](./09-styling-theming.md)
4. **Set up navigation** → [Actions & Navigation](./10-actions-navigation.md)
5. **Test real-time updates** → [Real-time Updates](./11-realtime-updates.md)

## 📞 Getting Help

If you encounter issues during installation:

1. Check [Troubleshooting Guide](./16-troubleshooting.md)
2. Review [Common Workflows](./15-common-workflows.md)
3. Contact the development team

---

**Installation Complete! 🎉**

Your Remote Configuration System is now ready for development.
