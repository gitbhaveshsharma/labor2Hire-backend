/**
 * Labor2Hire Monolithic Backend Application
 * Main application entry point with modular architecture
 *
 * @author Labor2Hire Team
 * @version 1.0.0
 * @description Monolithic backend with modular structure for Labor2Hire platform
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { createRequire } from "module";
import dotenv from "dotenv";

// Create require function for CommonJS modules
const require = createRequire(import.meta.url);

// Load environment variables first
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "..", ".env") });

// Debug: Log if env file was loaded
console.log("Environment variables loaded:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("MONGODB_URI present:", !!process.env.MONGODB_URI);
console.log(
  "MONGODB_URI value:",
  process.env.MONGODB_URI?.substring(0, 50) + "..."
);

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createServer } from "http";

// Import configurations
import databaseConfig from "./config/database.js";
import { logger, requestLogger } from "./config/logger.js";
import redisConfig from "./config/redis.js";

// Import constants
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  RATE_LIMITS,
  ENVIRONMENTS,
} from "./constants/index.js";

// Import modules
import { authRoutes } from "./modules/authentication/index.js";
import { geolocationRoutes } from "./modules/geolocation/index.js";
import {
  negotiationRoutes,
  connectionRoutes,
  configureConnectionController,
  setupSocketIO,
  SocketManager,
} from "./modules/negotiation/index.js";

// Import user-management routes
import { userRoutes } from "./modules/user-management/index.js";

// Import middlewares
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFoundHandler } from "./middlewares/notFoundHandler.js";
import { securityMiddleware } from "./middlewares/security.js";
import { validationMiddleware } from "./middlewares/validation.js";
import { enhancedTokenValidation } from "./middlewares/tokenSecurity.js";

/**
 * Application class following singleton pattern
 */
class Application {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = process.env.PORT || 5000;
    this.environment = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
    this.database = databaseConfig;
    this.redis = redisConfig;
    this.io = null;
    this.socketManager = null;
  }
  /**
   * Initialize application configurations
   */
  async initialize() {
    try {
      logger.info("Initializing Labor2Hire application...", {
        environment: this.environment,
        port: this.port,
        nodeVersion: process.version,
        pid: process.pid,
      });

      await this.setupDatabase();
      await this.setupRedis();
      this.setupMiddlewares();
      this.setupSocketIO();
      this.setupRoutes();
      this.setupErrorHandling();
      this.setupGracefulShutdown();

      logger.info("Application initialization completed successfully");
    } catch (error) {
      logger.error("Failed to initialize application", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  }

  /**
   * Setup database connection
   */
  async setupDatabase() {
    try {
      await this.database.connect();
      logger.info("Database setup completed");
    } catch (error) {
      logger.error("Database setup failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Setup Redis connection
   */
  async setupRedis() {
    try {
      await this.redis.connect();
      logger.info("Redis setup completed");
    } catch (error) {
      logger.warn("Redis setup failed, continuing without cache", {
        error: error.message,
      });
    }
  }

  /**
   * Setup Socket.IO server
   */
  setupSocketIO() {
    try {
      this.io = setupSocketIO(this.server);
      this.socketManager = new SocketManager(this.io);

      // Configure connection controller with socket manager
      configureConnectionController(this.socketManager);

      logger.info("Socket.IO setup completed");
    } catch (error) {
      logger.error("Socket.IO setup failed", { error: error.message });
      throw error;
    }
  }

  /**
   * Setup application middlewares
   */
  setupMiddlewares() {
    // Security middlewares
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin:
          this.environment === ENVIRONMENTS.PRODUCTION
            ? process.env.ALLOWED_ORIGINS?.split(",") || []
            : ["http://localhost:3000", "http://localhost:5173"],
        credentials: true,
        optionsSuccessStatus: 200,
      })
    );

    // Compression
    this.app.use(compression());

    // Rate limiting
    this.app.use(
      "/api/",
      rateLimit({
        windowMs: RATE_LIMITS.GENERAL.WINDOW_MS,
        max: RATE_LIMITS.GENERAL.MAX,
        message: {
          success: false,
          message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        },
        standardHeaders: true,
        legacyHeaders: false,
      })
    );

    // Body parsing
    this.app.use(
      express.json({
        limit: "10mb",
        verify: (req, res, buf) => {
          req.rawBody = buf;
        },
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: "10mb",
      })
    );

    // Logging
    this.app.use(
      morgan("combined", {
        stream: {
          write: (message) => logger.info(message.trim()),
        },
      })
    );

    // Request logger with correlation ID
    this.app.use(requestLogger); // Custom security middleware
    this.app.use(securityMiddleware);

    // Enhanced token security middleware for authenticated routes
    this.app.use("/api/", enhancedTokenValidation);

    // Global validation middleware
    this.app.use(validationMiddleware);

    logger.info("Middlewares setup completed");
  }

  /**
   * Setup application routes with modular approach
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Labor2Hire API is running",
        timestamp: new Date().toISOString(),
        environment: this.environment,
        version: process.env.npm_package_version || "1.0.0",
        uptime: process.uptime(),
      });
    });

    // API documentation
    this.app.get("/api", (req, res) => {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Labor2Hire API v1.0",
        documentation: "/api/docs",
        modules: [
          "authentication",
          "user-management",
          "job-matching",
          "geolocation",
          "notification",
          "payment",
        ],
      });
    }); // Module routes
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/user-profiles", userRoutes);
    this.app.use("/api/geolocation", geolocationRoutes);
    this.app.use("/api/negotiations", negotiationRoutes);
    this.app.use("/api/connections", connectionRoutes);

    // Remove temporary endpoints since we now have proper routes
    logger.info("Routes setup completed");
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);

    // Unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Promise Rejection", {
        reason: reason?.message || reason,
        promise: promise.toString(),
        stack: reason?.stack,
      });
    });

    // Uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception", {
        error: error.message,
        stack: error.stack,
      });
      this.gracefulShutdown("UNCAUGHT_EXCEPTION");
    });

    logger.info("Error handling setup completed");
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];

    signals.forEach((signal) => {
      process.on(signal, () => {
        logger.info(`Received ${signal}, initiating graceful shutdown...`);
        this.gracefulShutdown(signal);
      });
    });
  }

  /**
   * Graceful shutdown handler
   * @param {string} signal - The signal that triggered shutdown
   */
  async gracefulShutdown(signal) {
    logger.info("Starting graceful shutdown...", { signal });
    try {
      // Close Socket.IO server
      if (this.io) {
        this.io.close();
        logger.info("Socket.IO server closed");
      }

      // Close server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        logger.info("HTTP server closed");
      }

      // Close database connection
      await this.database.disconnect();
      logger.info("Database connection closed");

      // Close Redis connection
      await this.redis.disconnect();
      logger.info("Redis connection closed");

      logger.info("Graceful shutdown completed");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  }
  /**
   * Start the application server
   */
  async start() {
    try {
      await this.initialize();

      this.server.listen(this.port, () => {
        logger.info(`Labor2Hire server started successfully`, {
          port: this.port,
          environment: this.environment,
          pid: process.pid,
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
          socketIO: this.io ? "enabled" : "disabled",
        });
      });

      // Handle server errors
      this.server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error("Server error", { error: error.message });
        }
        process.exit(1);
      });
    } catch (error) {
      logger.error("Failed to start server", {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  }
}

// Create and start application
const app = new Application();
app.start();

export default app;
