/**
 * @fileoverview User Profile Controller - REST API endpoints for user profile management
 * @module controllers/userController
 * @author Labor2Hire Team
 */

import UserService from "../services/userService.js";
import User from "../../authentication/models/User.js";
import { logger } from "../../../config/logger.js";
import {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "../../../constants/index.js";
import { asyncHandler } from "../../../middlewares/errorHandler.js";
import {
  ValidationError,
  AuthorizationError,
} from "../../../middlewares/errorHandler.js";
import {
  createRoleBasedUserProfileSchema,
  updateRoleBasedUserProfileSchema,
} from "../validators/userValidator.js";

/**
 * User Controller Class
 * Handles HTTP requests for user profile management
 */
class UserController {
  constructor() {
    // Fix the instantiation - UserService might be a default export
    this.userService = new UserService();
    // Or if UserService is not a class but an object with methods:
    // this.userService = UserService;
  }
  /**
   * Create user profile
   * @route POST /api/user-profiles
   * @access Private
   */
  createProfile = asyncHandler(async (req, res) => {
    const { id: userId, role } = req.user;
    const profileData = { ...req.body, userId };

    logger.info("Creating user profile", { userId, role });

    // Use role-based validation
    const roleBasedValidator = createRoleBasedUserProfileSchema(role);
    const { error } = roleBasedValidator.validate(profileData);

    if (error) {
      throw new ValidationError("Validation failed", error.details);
    }

    const result = await this.userService.createUserProfile(profileData);

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "User profile created successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });
  /**
   * Get own user profile (extracted from token)
   * @route GET /api/user-profiles/me
   * @access Private
   */
  getOwnProfile = asyncHandler(async (req, res) => {
    const { id: userId, role } = req.user;

    logger.info("Retrieving own user profile", { userId });

    const result = await this.userService.getUserProfileByUserId(userId, {
      includeEncrypted: false, // Users cannot see their own encrypted documents via this endpoint
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Own profile retrieved successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get user profile by ID
   * @route GET /api/user-profiles/:profileId
   * @access Private
   */
  getProfile = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { includeEncrypted = false } = req.query;
    const { id: userId, role } = req.user;

    // Only admins can access encrypted documents
    const options = {
      includeEncrypted: role === "admin" && includeEncrypted === "true",
    };

    logger.info("Retrieving user profile", {
      profileId,
      userId,
      includeEncrypted: options.includeEncrypted,
    });

    const result = await this.userService.getUserProfileById(
      profileId,
      options
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "User profile retrieved successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  }); /**
   * Update user profile
   * @route PUT /api/user-profiles/:profileId
   * @access Private
   */
  updateProfile = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const updateData = req.body;
    const { id: userId, role } = req.user;

    logger.info("Updating user profile", {
      profileId,
      userId,
      updateFields: Object.keys(updateData),
    });

    // Use role-based validation for profile updates
    const roleBasedValidator = updateRoleBasedUserProfileSchema(role);
    const { error } = roleBasedValidator.validate(updateData);

    if (error) {
      throw new ValidationError("Validation failed", error.details);
    }

    const result = await this.userService.updateUserProfile(
      profileId,
      updateData,
      {
        validateUniqueness: true,
      }
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "User profile updated successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Delete user profile
   * @route DELETE /api/user-profiles/:profileId
   * @access Private (Admin only)
   */
  deleteProfile = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { id: userId, role } = req.user;

    logger.info("Deleting user profile", { profileId, userId, role });

    const result = await this.userService.deleteUserProfile(profileId, {
      softDelete: true,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "User profile deleted successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Search user profiles
   * @route GET /api/user-profiles/search
   * @access Private
   */
  searchProfiles = asyncHandler(async (req, res) => {
    const searchCriteria = req.query;
    const { id: userId, role } = req.user;

    logger.info("Searching user profiles", {
      userId,
      criteria: searchCriteria,
    });

    const result = await this.userService.searchUserProfiles(searchCriteria, {
      includeStats: true,
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Search completed successfully",
      data: result.data,
      pagination: result.pagination,
      stats: result.stats,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Add skill to user profile
   * @route POST /api/user-profiles/:profileId/skills
   * @access Private
   */
  addSkill = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const skillData = req.body;
    const { id: userId } = req.user;

    logger.info("Adding skill to profile", {
      profileId,
      userId,
      skill: skillData.name,
    });

    const result = await this.userService.manageSkill(
      profileId,
      skillData,
      "add"
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Skill added successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Remove skill from user profile
   * @route DELETE /api/user-profiles/:profileId/skills/:skillName
   * @access Private
   */
  removeSkill = asyncHandler(async (req, res) => {
    const { profileId, skillName } = req.params;
    const { id: userId } = req.user;

    logger.info("Removing skill from profile", {
      profileId,
      userId,
      skillName,
    });

    const result = await this.userService.manageSkill(
      profileId,
      { name: skillName },
      "remove"
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Skill removed successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Update skill in user profile
   * @route PUT /api/user-profiles/:profileId/skills/:skillName
   * @access Private
   */
  updateSkill = asyncHandler(async (req, res) => {
    const { profileId, skillName } = req.params;
    const skillData = { ...req.body, name: skillName };
    const { id: userId } = req.user;

    logger.info("Updating skill in profile", { profileId, userId, skillName });

    const result = await this.userService.manageSkill(
      profileId,
      skillData,
      "update"
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Skill updated successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  }); /**
   * Add verification document to own profile
   * @route POST /api/user-profiles/documents
   * @access Private
   */
  addVerificationDocumentToOwnProfile = asyncHandler(async (req, res) => {
    const documentData = req.body;
    const { id: userId } = req.user;

    logger.info("Adding verification document to own profile", {
      userId,
      documentType: documentData.type,
    });

    // First, find the user's profile
    const userProfile = await this.userService.getUserProfileByUserId(userId);
    if (!userProfile.data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: "User profile not found. Please create a profile first.",
        timestamp: new Date().toISOString(),
      });
    }

    const result = await this.userService.addVerificationDocument(
      userProfile.data._id,
      documentData
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Verification document added successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Add verification document (Admin only)
   * @route POST /api/user-profiles/:profileId/documents
   * @access Private (Admin only)
   */
  addVerificationDocument = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const documentData = req.body;
    const { id: userId } = req.user;

    logger.info("Adding verification document", {
      profileId,
      userId,
      documentType: documentData.type,
    });

    const result = await this.userService.addVerificationDocument(
      profileId,
      documentData
    );

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Verification document added successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  }); /**
   * Get decrypted document from own profile
   * @route POST /api/user-profiles/documents/:documentId/decrypt
   * @access Private
   */
  getOwnDecryptedDocument = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { password } = req.body;
    const { id: userId } = req.user;

    if (!password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Password is required to decrypt your document",
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("Retrieving own decrypted document", {
      documentId,
      userId,
    });

    const result = await this.userService.getOwnDecryptedDocument(
      userId,
      documentId,
      password
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Document decrypted successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get decrypted document (Admin only)
   * @route GET /api/user-profiles/:profileId/documents/:documentId/decrypt
   * @access Private (Admin only)
   */
  getDecryptedDocument = asyncHandler(async (req, res) => {
    const { profileId, documentId } = req.params;
    const { id: userId, role } = req.user;

    logger.info("Retrieving decrypted document", {
      profileId,
      documentId,
      userId,
      role,
    });

    const result = await this.userService.getDecryptedDocument(
      profileId,
      documentId
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Document decrypted successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Update verification status (Admin only)
   * @route PUT /api/user-profiles/:profileId/documents/:documentId/verify
   * @access Private (Admin only)
   */
  updateVerificationStatus = asyncHandler(async (req, res) => {
    const { profileId, documentId } = req.params;
    const { status } = req.body;
    const { id: userId, role } = req.user;

    logger.info("Updating verification status", {
      profileId,
      documentId,
      status,
      userId,
    });

    const result = await this.userService.updateVerificationStatus(
      profileId,
      documentId,
      status
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Verification status updated successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get user statistics
   * @route GET /api/user-profiles/:profileId/statistics
   * @access Private
   */
  getUserStatistics = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { id: userId } = req.user;

    logger.info("Retrieving user statistics", { profileId, userId });

    const result = await this.userService.getUserStatistics(profileId);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "User statistics retrieved successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });
  /**
   * Search profiles by location (geospatial)
   * @route GET /api/user-profiles/search/nearby
   * @access Private
   */
  searchNearby = asyncHandler(async (req, res) => {
    const {
      latitude,
      longitude,
      radius = 10,
      page = 1,
      limit = 10,
    } = req.query;
    const { id: userId } = req.user;

    logger.info("Searching nearby profiles", {
      latitude,
      longitude,
      radius,
      userId,
    });

    const searchCriteria = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseFloat(radius),
      },
      page: parseInt(page),
      limit: parseInt(limit),
    };

    const result = await this.userService.searchUserProfiles(searchCriteria);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Nearby search completed successfully",
      data: result.data,
      pagination: result.pagination,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get profile completeness analysis
   * @route GET /api/user-profiles/:profileId/completeness
   * @access Private
   */
  getProfileCompleteness = asyncHandler(async (req, res) => {
    const { profileId } = req.params;
    const { id: userId } = req.user;

    logger.info("Getting profile completeness analysis", { profileId, userId });

    const result = await this.userService.getUserProfileById(profileId);
    const profile = result.data;

    // Calculate detailed completeness breakdown
    const completeness = {
      overall: profile.profileCompleteness,
      breakdown: {
        personalInfo: this._calculatePersonalInfoCompleteness(
          profile.personalInfo
        ),
        contactInfo: this._calculateContactInfoCompleteness(
          profile.contactInfo
        ),
        location: this._calculateLocationCompleteness(profile.location),
        professionalInfo: this._calculateProfessionalInfoCompleteness(
          profile.professionalInfo
        ),
        verification: this._calculateVerificationCompleteness(
          profile.verification
        ),
      },
      suggestions: this._getCompletnessSuggestions(profile),
    };

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Profile completeness analysis retrieved successfully",
      data: completeness,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Helper method to calculate personal info completeness
   * @private
   */
  _calculatePersonalInfoCompleteness(personalInfo) {
    if (!personalInfo) return 0;

    const fields = ["firstName", "lastName", "dateOfBirth", "gender"];
    const completed = fields.filter((field) => personalInfo[field]).length;
    return Math.round((completed / fields.length) * 100);
  }

  /**
   * Helper method to calculate contact info completeness
   * @private
   */ _calculateContactInfoCompleteness(contactInfo) {
    if (!contactInfo) return 0;

    // For street laborers, phone number is required, email is optional
    // Phone number is 100% of contact completeness
    return contactInfo.phoneNumber ? 100 : 0;
  }

  /**
   * Helper method to calculate location completeness
   * @private
   */
  _calculateLocationCompleteness(location) {
    if (!location || !location.address) return 0;

    const fields = ["city", "state", "country"];
    const completed = fields.filter((field) => location.address[field]).length;
    const hasCoordinates =
      location.coordinates && location.coordinates.length === 2;

    return Math.round(
      ((completed + (hasCoordinates ? 1 : 0)) / (fields.length + 1)) * 100
    );
  }

  /**
   * Helper method to calculate professional info completeness
   * @private
   */ _calculateProfessionalInfoCompleteness(professionalInfo) {
    if (!professionalInfo) return 0;

    let score = 0;
    if (
      professionalInfo.workCategories &&
      professionalInfo.workCategories.length > 0
    )
      score += 25;
    if (professionalInfo.skills && professionalInfo.skills.length > 0)
      score += 25;
    if (professionalInfo.experienceLevel) score += 25;
    if (professionalInfo.dailyRate && professionalInfo.dailyRate.amount)
      score += 25;

    return score;
  }

  /**
   * Helper method to calculate verification completeness
   * @private
   */
  _calculateVerificationCompleteness(verification) {
    if (!verification) return 0;

    let score = 0;
    if (verification.isEmailVerified) score += 40;
    if (verification.isPhoneVerified) score += 30;
    if (verification.isIdentityVerified) score += 30;

    return score;
  }

  /**
   * Helper method to get completeness suggestions
   * @private
   */ _getCompletnessSuggestions(profile) {
    const suggestions = [];

    // Personal info suggestions
    if (!profile.personalInfo?.firstName)
      suggestions.push("Add your first name");
    if (!profile.personalInfo?.lastName) suggestions.push("Add your last name");
    if (!profile.personalInfo?.dateOfBirth)
      suggestions.push("Add your date of birth");
    if (!profile.personalInfo?.gender) suggestions.push("Add your gender");

    // Contact info suggestions - email is optional for street laborers
    if (!profile.contactInfo?.phoneNumber)
      suggestions.push("Add your phone number");

    // Location suggestions
    if (!profile.location?.address?.city) suggestions.push("Add your city");
    if (!profile.location?.address?.state)
      suggestions.push("Add your state/province");
    if (!profile.location?.coordinates)
      suggestions.push("Enable location services for better job matching");

    // Professional info suggestions for street laborers
    if (!profile.professionalInfo?.workCategories?.length)
      suggestions.push(
        "Add your work categories (construction, cleaning, etc.)"
      );
    if (!profile.professionalInfo?.skills?.length)
      suggestions.push("Add your skills");
    if (!profile.professionalInfo?.experienceLevel)
      suggestions.push("Add your experience level");
    if (!profile.professionalInfo?.languages?.length)
      suggestions.push("Add languages you speak");
    if (!profile.professionalInfo?.dailyRate?.amount)
      suggestions.push("Add your daily rate");

    // Verification suggestions for Indian documents
    if (!profile.verification?.isPhoneVerified)
      suggestions.push("Verify your phone number");
    if (!profile.verification?.isIdentityVerified)
      suggestions.push(
        "Upload Indian identity verification documents (Aadhar/PAN)"
      );

    return suggestions;
  }

  /**
   * Update own verification document
   * @route PUT /api/user-profiles/documents/:documentId
   * @access Private
   */ updateOwnDocument = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { password, ...updateData } = req.body;
    const { id: userId } = req.user;

    if (!password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Password is required to update your document",
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("Updating own verification document", {
      documentId,
      userId,
      updateData: {
        ...updateData,
        documentNumber: updateData.documentNumber ? "***HIDDEN***" : undefined,
      },
    });

    const result = await this.userService.updateOwnDocument(
      userId,
      documentId,
      updateData,
      password
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Document updated successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });
  /**
   * Delete own verification document
   * @route DELETE /api/user-profiles/documents/:documentId
   * @access Private
   */
  deleteOwnDocument = asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const { password } = req.body;
    const { id: userId } = req.user;

    if (!password) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Password is required to delete your document",
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("Deleting own verification document", {
      documentId,
      userId,
    });

    const result = await this.userService.deleteOwnDocument(
      userId,
      documentId,
      password
    );

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Document deleted successfully",
      data: result.data,
      timestamp: new Date().toISOString(),
    });
  });
}

export default UserController;
