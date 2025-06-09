/**
 * @fileoverview Redis configuration and connection management
 * @module config/redis
 * @author Labor2Hire Team
 */

import { createClient } from 'redis';
import { logger } from './logger.js';
import { ENVIRONMENTS } from '../constants/index.js';

/**
 * Redis client configuration and management
 */
class RedisConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionOptions = this._getConnectionOptions();
  }

  /**
   * Get Redis connection options
   * @private
   * @returns {Object} Redis connection options
   */
  _getConnectionOptions() {
    const options = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 10000,
        lazyConnect: true,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.error('Redis reconnection failed after 3 attempts');
            return false;
          }
          return Math.min(retries * 50, 1000);
        },
      },
    };

    // Add password if provided
    if (process.env.REDIS_PASSWORD) {
      options.password = process.env.REDIS_PASSWORD;
    }

    // Additional options for production
    if (process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION) {
      options.socket.tls = process.env.REDIS_TLS === 'true';
    }

    return options;
  }

  /**
   * Connect to Redis
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      if (this.isConnected && this.client?.isOpen) {
        logger.warn('Redis connection already established');
        return;
      }

      logger.info('Connecting to Redis...', {
        url: this.connectionOptions.url,
        environment: process.env.NODE_ENV,
      });

      this.client = createClient(this.connectionOptions);
      
      // Set up event listeners
      this._setupEventListeners();

      await this.client.connect();
      this.isConnected = true;

      logger.info('Successfully connected to Redis', {
        host: this.client.options?.socket?.host || 'localhost',
        port: this.client.options?.socket?.port || 6379,
      });

    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (!this.client || !this.isConnected) {
        logger.warn('No active Redis connection to close');
        return;
      }

      await this.client.quit();
      this.isConnected = false;
      logger.info('Successfully disconnected from Redis');
    } catch (error) {
      logger.error('Error disconnecting from Redis', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get Redis client instance
   * @returns {Object|null} Redis client
   */
  getClient() {
    if (!this.isConnected || !this.client?.isOpen) {
      logger.warn('Redis client is not connected');
      return null;
    }
    return this.client;
  }

  /**
   * Check if Redis is connected
   * @returns {boolean} Connection status
   */
  isRedisConnected() {
    return this.isConnected && this.client?.isOpen;
  }

  /**
   * Get Redis health status
   * @returns {Object} Health status information
   */
  async getHealthStatus() {
    try {
      if (!this.isConnected || !this.client?.isOpen) {
        return {
          status: 'disconnected',
          isHealthy: false,
          error: 'Redis client not connected',
        };
      }

      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;

      return {
        status: 'connected',
        isHealthy: true,
        responseTime: `${responseTime}ms`,
        host: this.client.options?.socket?.host || 'localhost',
        port: this.client.options?.socket?.port || 6379,
      };
    } catch (error) {
      return {
        status: 'error',
        isHealthy: false,
        error: error.message,
      };
    }
  }

  /**
   * Set up Redis event listeners
   * @private
   */
  _setupEventListeners() {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', {
        error: error.message,
      });
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.warn('Redis client connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  /**
   * Set a value in Redis with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 3600) {
    try {
      if (!this.isRedisConnected()) {
        logger.warn('Redis not connected, skipping cache set');
        return false;
      }

      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await this.client.setEx(key, ttl, stringValue);
      
      logger.debug('Cache set successful', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Error setting cache', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Get a value from Redis
   * @param {string} key - Cache key
   * @param {boolean} parseJson - Whether to parse as JSON
   * @returns {Promise<any>} Cached value or null
   */
  async get(key, parseJson = true) {
    try {
      if (!this.isRedisConnected()) {
        logger.warn('Redis not connected, skipping cache get');
        return null;
      }

      const value = await this.client.get(key);
      if (value === null) return null;

      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch {
          return value; // Return as string if JSON parsing fails
        }
      }

      return value;
    } catch (error) {
      logger.error('Error getting cache', {
        key,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Delete a key from Redis
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (!this.isRedisConnected()) {
        logger.warn('Redis not connected, skipping cache delete');
        return false;
      }

      await this.client.del(key);
      logger.debug('Cache delete successful', { key });
      return true;
    } catch (error) {
      logger.error('Error deleting cache', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Check if a key exists in Redis
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Existence status
   */
  async exists(key) {
    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Error checking cache existence', {
        key,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Flush all Redis data (use with caution)
   * @returns {Promise<boolean>} Success status
   */
  async flushAll() {
    if (process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION) {
      throw new Error('Cannot flush Redis in production environment');
    }

    try {
      if (!this.isRedisConnected()) {
        return false;
      }

      await this.client.flushAll();
      logger.info('Redis cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Error flushing Redis cache', {
        error: error.message,
      });
      return false;
    }
  }
}

// Create and export singleton instance
const redisConfig = new RedisConfig();

/**
 * Initialize Redis connection
 * @returns {Promise<void>}
 */
export const connectRedis = async () => {
  await redisConfig.connect();
};

/**
 * Close Redis connection
 * @returns {Promise<void>}
 */
export const disconnectRedis = async () => {
  await redisConfig.disconnect();
};

/**
 * Get Redis client instance
 * @returns {Object|null} Redis client
 */
export const getRedisClient = () => {
  return redisConfig.getClient();
};

/**
 * Get Redis health status
 * @returns {Promise<Object>} Health status
 */
export const getRedisHealth = async () => {
  return await redisConfig.getHealthStatus();
};

/**
 * Cache helper functions
 */
export const cache = {
  set: (key, value, ttl) => redisConfig.set(key, value, ttl),
  get: (key, parseJson) => redisConfig.get(key, parseJson),
  del: (key) => redisConfig.del(key),
  exists: (key) => redisConfig.exists(key),
  flushAll: () => redisConfig.flushAll(),
};

export default redisConfig;
