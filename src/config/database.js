/**
 * @fileoverview Database configuration and connection management
 * @module config/database
 * @author Labor2Hire Team
 */

import mongoose from "mongoose";
import { logger } from "./logger.js";
import { ENVIRONMENTS } from "../constants/index.js";

/**
 * Database connection configuration
 */
class DatabaseConfig {
  constructor() {
    this.isConnected = false;
    this.options = this._getConnectionOptions();
  }

  /**
   * Get the appropriate connection string based on environment
   * @private
   * @returns {string} MongoDB connection string
   */
  _getConnectionString() {
    const env = process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;

    // Debug logging
    console.log("Environment:", env);
    console.log("MONGODB_URI:", process.env.MONGODB_URI);
    console.log("MONGODB_TEST_URI:", process.env.MONGODB_TEST_URI);

    switch (env) {
      case ENVIRONMENTS.TESTING:
        return (
          process.env.MONGODB_TEST_URI ||
          "mongodb://localhost:27017/labor2hire_test"
        );
      case ENVIRONMENTS.PRODUCTION:
        return (
          process.env.MONGODB_URI ||
          "mongodb://localhost:27017/labor2hire_production"
        );
      default:
        return (
          process.env.MONGODB_URI ||
          "mongodb://localhost:27017/labor2hire_development"
        );
    }
  }

  /**
   * Get MongoDB connection options
   * @private
   * @returns {Object} Connection options
   */ _getConnectionOptions() {
    return {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      bufferCommands: false, // Disable mongoose buffering
    };
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise<void>}
   */ async connect() {
    try {
      if (this.isConnected) {
        logger.warn("Database connection already established");
        return;
      }

      // Get connection string dynamically
      const connectionString = this._getConnectionString();

      logger.info("Connecting to MongoDB...", {
        uri: connectionString.replace(/\/\/.*@/, "//***:***@"), // Mask credentials
        environment: process.env.NODE_ENV,
      });

      await mongoose.connect(connectionString, this.options);

      this.isConnected = true;
      logger.info("Successfully connected to MongoDB", {
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
      });

      // Set up connection event listeners
      this._setupEventListeners();
    } catch (error) {
      logger.error("Failed to connect to MongoDB", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (!this.isConnected) {
        logger.warn("No active database connection to close");
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;
      logger.info("Successfully disconnected from MongoDB");
    } catch (error) {
      logger.error("Error disconnecting from MongoDB", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if database is connected
   * @returns {boolean} Connection status
   */
  isConnectedToDatabase() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database connection health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    const readyState = mongoose.connection.readyState;
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    return {
      status: states[readyState] || "unknown",
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      readyState,
      isHealthy: readyState === 1,
    };
  }

  /**
   * Setup database connection event listeners
   * @private
   */
  _setupEventListeners() {
    // Connection opened
    mongoose.connection.on("connected", () => {
      logger.info("Mongoose connected to MongoDB");
    });

    // Connection error
    mongoose.connection.on("error", (error) => {
      logger.error("Mongoose connection error", {
        error: error.message,
      });
    });

    // Connection disconnected
    mongoose.connection.on("disconnected", () => {
      logger.warn("Mongoose disconnected from MongoDB");
      this.isConnected = false;
    });

    // Connection reconnected
    mongoose.connection.on("reconnected", () => {
      logger.info("Mongoose reconnected to MongoDB");
      this.isConnected = true;
    });

    // If the Node process ends, close the Mongoose connection
    process.on("SIGINT", async () => {
      await this.gracefulShutdown("SIGINT");
    });

    process.on("SIGTERM", async () => {
      await this.gracefulShutdown("SIGTERM");
    });
  }

  /**
   * Gracefully shutdown database connection
   * @param {string} signal - Process signal received
   */
  async gracefulShutdown(signal) {
    logger.info(`Received ${signal}. Closing MongoDB connection gracefully...`);

    try {
      await this.disconnect();
      logger.info("MongoDB connection closed through app termination");
      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown", {
        error: error.message,
      });
      process.exit(1);
    }
  }

  /**
   * Drop database (use with caution - mainly for testing)
   * @returns {Promise<void>}
   */
  async dropDatabase() {
    if (process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION) {
      throw new Error("Cannot drop database in production environment");
    }

    try {
      await mongoose.connection.db.dropDatabase();
      logger.info("Database dropped successfully");
    } catch (error) {
      logger.error("Error dropping database", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create database indexes
   * @returns {Promise<void>}
   */
  async createIndexes() {
    try {
      // This will be called by models when they are initialized
      logger.info("Database indexes will be created by model initialization");
    } catch (error) {
      logger.error("Error creating database indexes", {
        error: error.message,
      });
      throw error;
    }
  }
}

// Create and export singleton instance
const databaseConfig = new DatabaseConfig();

/**
 * Initialize database connection
 * @returns {Promise<void>}
 */
export const connectDB = async () => {
  await databaseConfig.connect();
};

/**
 * Close database connection
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  await databaseConfig.disconnect();
};

/**
 * Get database health status
 * @returns {Object} Health status
 */
export const getDBHealth = () => {
  return databaseConfig.getHealthStatus();
};

/**
 * Check if database is connected
 * @returns {boolean} Connection status
 */
export const isDBConnected = () => {
  return databaseConfig.isConnectedToDatabase();
};

export default databaseConfig;
