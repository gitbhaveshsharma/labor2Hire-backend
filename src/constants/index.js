/**
 * @fileoverview Constants used throughout the application
 * @module constants
 * @author Labor2Hire Team
 */

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

// User Roles
export const USER_ROLES = {
  EMPLOYER: 'employer',
  LABORER: 'laborer',
  ADMIN: 'admin',
};

// Job Status
export const JOB_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
};

// Application Status
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  JOB_POSTED: 'job_posted',
  APPLICATION_RECEIVED: 'application_received',
  APPLICATION_ACCEPTED: 'application_accepted',
  APPLICATION_REJECTED: 'application_rejected',
  JOB_STARTED: 'job_started',
  JOB_COMPLETED: 'job_completed',
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_SENT: 'payment_sent',
  SYSTEM_ALERT: 'system_alert',
};

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid phone number or password',
  TOKEN_EXPIRED: 'Token has expired. Please log in again',
  TOKEN_INVALID: 'Invalid token provided',
  ACCESS_DENIED: 'Access denied. Insufficient permissions',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User with this phone number already exists',
  
  // Validation
  VALIDATION_FAILED: 'Validation failed',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
  INVALID_INPUT_FORMAT: 'Invalid input format',
  INVALID_COORDINATES: 'Invalid coordinates provided',
  INVALID_PHONE_NUMBER: 'Invalid phone number format',
  
  // General
  INTERNAL_ERROR: 'Internal server error occurred',
  NOT_FOUND: 'Resource not found',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
  OPERATION_FAILED: 'Operation failed. Please try again',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  USER_REGISTERED: 'User registered successfully',
  USER_LOGGED_IN: 'User logged in successfully',
  LOCATION_UPDATED: 'Location updated successfully',
  STATUS_TOGGLED: 'Status toggled successfully',
  JOB_CREATED: 'Job created successfully',
  JOB_UPDATED: 'Job updated successfully',
  APPLICATION_SUBMITTED: 'Application submitted successfully',
  PAYMENT_PROCESSED: 'Payment processed successfully',
};

// Validation Constraints
export const VALIDATION_CONSTRAINTS = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  PHONE_NUMBER_LENGTH: 10,
  OTP_LENGTH: 6,
  JOB_TITLE_MAX_LENGTH: 100,
  JOB_DESCRIPTION_MAX_LENGTH: 2000,
  MAX_LATITUDE: 90,
  MIN_LATITUDE: -90,
  MAX_LONGITUDE: 180,
  MIN_LONGITUDE: -180,
  MAX_SEARCH_RADIUS: 50, // km
  MIN_SEARCH_RADIUS: 0.1, // km
};

// Database Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  JOBS: 'jobs',
  APPLICATIONS: 'applications',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  REVIEWS: 'reviews',
  CATEGORIES: 'categories',
};

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  USER_LOCATION: (userId) => `user:location:${userId}`,
  NEARBY_LABORERS: (lat, lng, radius) => `laborers:nearby:${lat}:${lng}:${radius}`,
  JOB_DETAILS: (jobId) => `job:details:${jobId}`,
  USER_APPLICATIONS: (userId) => `user:applications:${userId}`,
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  USER_PROFILE: 3600, // 1 hour
  USER_LOCATION: 300, // 5 minutes
  NEARBY_LABORERS: 180, // 3 minutes
  JOB_DETAILS: 1800, // 30 minutes
  USER_APPLICATIONS: 600, // 10 minutes
};

// File Upload Configuration
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif'],
  UPLOAD_PATH: 'uploads/',
  PROFILE_PICTURE_PATH: 'uploads/profiles/',
  JOB_IMAGE_PATH: 'uploads/jobs/',
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

// Rate Limiting
export const RATE_LIMITS = {
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 5, // 5 attempts per window
  },
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 100, // 100 requests per window
  },
  PASSWORD_RESET: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX: 3, // 3 attempts per hour
  },
};

// Application Events
export const EVENTS = {
  USER_REGISTERED: 'user:registered',
  USER_LOGGED_IN: 'user:logged_in',
  JOB_CREATED: 'job:created',
  JOB_UPDATED: 'job:updated',
  APPLICATION_SUBMITTED: 'application:submitted',
  PAYMENT_PROCESSED: 'payment:processed',
  NOTIFICATION_SENT: 'notification:sent',
};

// Environment Types
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'testing',
  STAGING: 'staging',
  PRODUCTION: 'production',
};

// Default Values
export const DEFAULTS = {
  LANGUAGE_PREFERENCE: 'en',
  WALLET_BALANCE: 0,
  IS_ACTIVE: false,
  LOCATION_COORDINATES: [0, 0],
  SEARCH_RADIUS: 10, // km
};
