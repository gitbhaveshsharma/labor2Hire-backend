/**
 * @fileoverview User Management Module Index
 * @module modules/user-management
 * @author Labor2Hire Team
 * @description Exports all user management module components and configurations
 */

// Models
export { default as UserProfile } from "./models/UserProfile.js";

// Services
export { default as userService } from "./services/userService.js";

// Controllers
export { default as UserController } from "./controllers/userController.js";

// Validators
export * from "./validators/userValidator.js";

// Utilities
export * from "./utils/encryption.js";

// Routes
export { default as userRoutes } from "./routes/userRoutes.js";

// Module metadata and configuration
export const moduleInfo = {
  name: "user-management",
  version: "1.0.0",
  description:
    "Comprehensive user profile management with skills, document verification, and location services for Indian street laborers",
  author: "Labor2Hire Team", // API endpoints provided by this module
  endpoints: [
    "POST /api/user-profiles",
    "GET /api/user-profiles/me",
    "GET /api/user-profiles/:profileId",
    "PUT /api/user-profiles/:profileId",
    "DELETE /api/user-profiles/:profileId",
    "GET /api/user-profiles/search",
    "GET /api/user-profiles/search/nearby",
    "POST /api/user-profiles/:profileId/skills",
    "PUT /api/user-profiles/:profileId/skills/:skillName",
    "DELETE /api/user-profiles/:profileId/skills/:skillName",
    "POST /api/user-profiles/documents",
    "POST /api/user-profiles/:profileId/documents",
    "POST /api/user-profiles/documents/:documentId/decrypt",
    "PUT /api/user-profiles/documents/:documentId",
    "DELETE /api/user-profiles/documents/:documentId",
    "GET /api/user-profiles/:profileId/documents/:documentId/decrypt",
    "PUT /api/user-profiles/:profileId/documents/:documentId/verify",
    "GET /api/user-profiles/:profileId/statistics",
    "GET /api/user-profiles/:profileId/completeness",
  ],

  // Dependencies required by this module
  dependencies: ["mongoose", "bcryptjs", "crypto", "joi", "express"],
  // Features provided by this module
  features: [
    "User profile CRUD operations",
    "Advanced search with geospatial queries",
    "Skills management for street laborers",
    "Document verification with encryption (Aadhar, PAN, etc.)",
    "Profile completeness analysis",
    "Bulk operations for admin users",
    "Real-time statistics and analytics",
    "Transaction-based data consistency",
    "Comprehensive validation and sanitization",
    "Support for Indian languages and work categories",
  ],

  // Database collections used
  collections: ["userprofiles"],

  // Middleware integrations
  middleware: [
    "authentication",
    "authorization",
    "validation",
    "rate-limiting",
    "error-handling",
  ],

  // Security features
  security: [
    "AES-256-GCM encryption for sensitive documents",
    "Role-based access control",
    "Data sanitization and validation",
    "Secure document handling",
    "Audit logging for sensitive operations",
  ],
};

/**
 * Module configuration function
 * @param {Object} app - Express application instance
 * @param {Object} options - Configuration options
 */
export const configureModule = (app, options = {}) => {
  const {
    prefix = "/api/user-profiles",
    middleware = [],
    enableMetrics = true,
    enableLogging = true,
  } = options;

  // Import routes
  import("./routes/userRoutes.js").then(({ default: routes }) => {
    // Apply module-specific middleware if provided
    middleware.forEach((mw) => app.use(prefix, mw));

    // Mount routes
    app.use(prefix, routes);

    if (enableLogging) {
      console.log(`✅ User Management module configured at ${prefix}`);
    }
  });

  return {
    module: "user-management",
    prefix,
    status: "configured",
    timestamp: new Date().toISOString(),
  };
};

/**
 * Health check function for the module
 */
export const healthCheck = async () => {
  try {
    // Import required dependencies
    const UserProfile = (await import("./models/UserProfile.js")).default;

    // Perform basic connectivity test
    const count = await UserProfile.countDocuments();

    return {
      module: "user-management",
      status: "healthy",
      details: {
        database: "connected",
        totalProfiles: count,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      module: "user-management",
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

// Default export for ES6 module compatibility
export default {
  UserProfile: () => import("./models/UserProfile.js"),
  userService: () => import("./services/userService.js"),
  UserController: () => import("./controllers/userController.js"),
  userRoutes: () => import("./routes/userRoutes.js"),
  moduleInfo,
  configureModule,
  healthCheck,
};
