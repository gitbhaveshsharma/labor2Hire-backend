/**
 * @fileoverview User Management Routes - Updated to match actual controller implementation
 * @module routes/userRoutes
 * @author Labor2Hire Team
 */

import express from "express";
import UserController from "../controllers/userController.js";
import {
  authenticate,
  adminOnly,
  ownerOrAdmin,
} from "../../../middlewares/auth.js";
import { strictOwnershipValidation } from "../../../middlewares/tokenSecurity.js";
import { validate } from "../../../middlewares/validation.js";
import {
  createUserProfileValidator,
  updateUserProfileValidator,
  addSkillValidator,
  updateSkillValidator,
  searchUsersValidator,
  addVerificationDocumentValidator,
  updateVerificationStatusValidator,
  nearbySearchValidator,
  decryptOwnDocumentValidator,
  updateOwnDocumentValidator,
  deleteOwnDocumentValidator,
} from "../validators/userValidator.js";

const router = express.Router();

// Initialize controller instance
const userController = new UserController();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * @route   POST /api/user-profiles
 * @desc    Create a new user profile
 * @access  Private
 */
router.post("/", userController.createProfile);

/**
 * @route   GET /api/user-profiles/me
 * @desc    Get own user profile (extracted from token)
 * @access  Private
 */
router.get("/me", userController.getOwnProfile);

/**
 * @route   GET /api/user-profiles/:profileId
 * @desc    Get user profile by profile ID (Admin can access any, users need ownership)
 * @access  Private
 */
router.get(
  "/:profileId",
  ownerOrAdmin,
  strictOwnershipValidation,
  userController.getProfile
);

/**
 * @route   PUT /api/user-profiles/:profileId
 * @desc    Update user profile (Admin can update any, users need ownership)
 * @access  Private
 */
router.put(
  "/:profileId",
  ownerOrAdmin,
  strictOwnershipValidation,
  userController.updateProfile
);

/**
 * @route   DELETE /api/user-profiles/:profileId
 * @desc    Delete user profile (Admin only)
 * @access  Private (Admin only)
 */
router.delete("/:profileId", adminOnly, userController.deleteProfile);

/**
 * @route   GET /api/user-profiles/search
 * @desc    Search user profiles with filters
 * @access  Private
 */
router.get(
  "/search",
  validate(searchUsersValidator),
  userController.searchProfiles
);

/**
 * @route   GET /api/user-profiles/search/nearby
 * @desc    Search profiles by location (geospatial)
 * @access  Private
 */
router.get(
  "/search/nearby",
  validate(nearbySearchValidator),
  userController.searchNearby
);

/**
 * @route   POST /api/user-profiles/:profileId/skills
 * @desc    Add skill to user profile (Admin can add to any, users need ownership)
 * @access  Private
 */
router.post(
  "/:profileId/skills",
  ownerOrAdmin,
  validate(addSkillValidator),
  userController.addSkill
);

/**
 * @route   PUT /api/user-profiles/:profileId/skills/:skillName
 * @desc    Update skill in user profile (Admin can update any, users need ownership)
 * @access  Private
 */
router.put(
  "/:profileId/skills/:skillName",
  ownerOrAdmin,
  validate(updateSkillValidator),
  userController.updateSkill
);

/**
 * @route   DELETE /api/user-profiles/:profileId/skills/:skillName
 * @desc    Remove skill from user profile (Admin can remove from any, users need ownership)
 * @access  Private
 */
router.delete(
  "/:profileId/skills/:skillName",
  ownerOrAdmin,
  userController.removeSkill
);

/**
 * @route   POST /api/user-profiles/documents
 * @desc    Add verification document to own profile
 * @access  Private
 */
router.post(
  "/documents",
  validate(addVerificationDocumentValidator),
  userController.addVerificationDocumentToOwnProfile
);

/**
 * @route   POST /api/user-profiles/:profileId/documents
 * @desc    Add verification document (Admin only)
 * @access  Private (Admin only)
 */
router.post(
  "/:profileId/documents",
  adminOnly,
  validate(addVerificationDocumentValidator),
  userController.addVerificationDocument
);

/**
 * @route   POST /api/user-profiles/documents/:documentId/decrypt
 * @desc    Get decrypted document from own profile (requires password)
 * @access  Private
 */
router.post(
  "/documents/:documentId/decrypt",
  validate(decryptOwnDocumentValidator),
  userController.getOwnDecryptedDocument
);

/**
 * @route   PUT /api/user-profiles/documents/:documentId
 * @desc    Update own verification document
 * @access  Private
 */
router.put(
  "/documents/:documentId",
  validate(updateOwnDocumentValidator),
  userController.updateOwnDocument
);

/**
 * @route   DELETE /api/user-profiles/documents/:documentId
 * @desc    Delete own verification document
 * @access  Private
 */
router.delete(
  "/documents/:documentId",
  validate(deleteOwnDocumentValidator),
  userController.deleteOwnDocument
);

/**
 * @route   GET /api/user-profiles/:profileId/documents/:documentId/decrypt
 * @desc    Get decrypted document (Admin only)
 * @access  Private (Admin only)
 */
router.get(
  "/:profileId/documents/:documentId/decrypt",
  adminOnly,
  userController.getDecryptedDocument
);

/**
 * @route   PUT /api/user-profiles/:profileId/documents/:documentId/verify
 * @desc    Update verification status (Admin only)
 * @access  Private (Admin only)
 */
router.put(
  "/:profileId/documents/:documentId/verify",
  adminOnly,
  validate(updateVerificationStatusValidator),
  userController.updateVerificationStatus
);

/**
 * @route   GET /api/user-profiles/:profileId/statistics
 * @desc    Get user statistics (Admin can access any, users need ownership)
 * @access  Private
 */
router.get(
  "/:profileId/statistics",
  ownerOrAdmin,
  userController.getUserStatistics
);

/**
 * @route   GET /api/user-profiles/:profileId/completeness
 * @desc    Get profile completeness analysis (Admin can access any, users need ownership)
 * @access  Private
 */
router.get(
  "/:profileId/completeness",
  ownerOrAdmin,
  userController.getProfileCompleteness
);

export default router;
