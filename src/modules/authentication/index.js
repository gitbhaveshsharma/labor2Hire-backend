/**
 * Authentication Module Index
 * Exports all authentication module components
 */

// Models
export { default as User } from './models/User.js';

// Services
export * as authService from './services/authService.js';

// Controllers
export * as authController from './controllers/authController.js';

// Validators
export * from './validators/authValidators.js';

// Routes
export { default as authRoutes } from './routes/authRoutes.js';

// Module metadata
export const moduleInfo = {
  name: 'authentication',
  version: '1.0.0',
  description: 'Handles user authentication, authorization, and profile management',
  endpoints: [
    'POST /api/auth/register',
    'POST /api/auth/login',
    'POST /api/auth/refresh',
    'POST /api/auth/logout',
    'GET /api/auth/profile',
    'PUT /api/auth/profile',
    'PUT /api/auth/location',
    'PUT /api/auth/toggle-status',
    'PUT /api/auth/change-password',
    'POST /api/auth/forgot-password',
    'POST /api/auth/reset-password',
    'POST /api/auth/users/bulk',
    'GET /api/auth/verify'
  ],
  dependencies: [
    'bcryptjs',
    'jsonwebtoken',
    'express-validator',
    'mongoose'
  ],
  features: [
    'User registration and login',
    'JWT-based authentication',
    'Password hashing and validation',
    'Location tracking',
    'Role-based access control',
    'Account status management',
    'Password reset functionality',
    'Refresh token support',
    'Rate limiting',
    'Input validation and sanitization'
  ]
};
