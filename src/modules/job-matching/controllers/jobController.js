/**
 * Job Controller for Labor2Hire Platform
 * Handles HTTP requests for job matching, creation, booking, and management
 * Maintains the exact same logic as the original job-matching-service controller
 */

import * as jobService from "../services/jobService.js";
import { logger } from "../../../config/logger.js";
import redisClient from "../../../config/redis.js";
import { fetchFromRedis } from "../utils/redisUtils.js";

// Global function to generate headers - same as original
const generateHeaders = (req) => {
  return {
    Authorization: `Bearer ${req.header("Authorization").split(" ")[1]}`,
  };
};

/**
 * Create or update a job.
 * Same logic as original controller
 */
export const createJob = async (req, res, next) => {
  try {
    const { body, user } = req;
    const jobData = { ...body, userId: user.id };
    const job = await jobService.createOrUpdateJob(jobData);
    logger.info(`Job created or updated: ${job._id}`);
    res.status(200).json({ success: true, job });
  } catch (error) {
    logger.error(`Error creating or updating job: ${error.message}`, error);
    next(error);
  }
};

/**
 * Fetch nearby laborers in real-time using the Geolocation Service.
 * Same logic as original controller
 */
export const searchLaborers = async (req, res, next) => {
  const { longitude, latitude, radius, skills, description, wage } = req.body;

  if (!longitude || !latitude || !radius || !description || !wage) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required body parameters" });
  }

  const headers = generateHeaders(req);

  try {
    const parsedSkills = skills ? skills.split(",") : [];
    const laborers = await jobService.findLaborers(req, {
      longitude: parseFloat(longitude),
      latitude: parseFloat(latitude),
      radius: parseFloat(radius),
      skills: parsedSkills,
      description,
      wage,
      headers,
    });
    logger.info(`Laborers found: ${laborers.length}`);
    res.status(200).json({ success: true, laborers });
  } catch (error) {
    logger.error(`Error searching laborers: ${error.message}`, error);
    next(error);
  }
};

/**
 * Confirm job with PIN - same logic as original
 */
export const confirmJobWithPin = async (req, res, next) => {
  const { jobId, pin } = req.body;

  if (!jobId || !pin) {
    return res
      .status(400)
      .json({ success: false, message: "Missing jobId or PIN" });
  }

  try {
    // Fetch booking data from Redis using job ID
    const bookingData = await redisClient.get(jobId);

    if (!bookingData) {
      return res
        .status(404)
        .json({ success: false, message: "Booking data not found or expired" });
    }

    const parsedData = JSON.parse(bookingData);

    if (parsedData.booking.pin !== parseInt(pin)) {
      return res.status(400).json({ success: false, message: "Invalid PIN" });
    }

    // Move data to MongoDB - same structure as original
    const jobData = {
      employerId: parsedData.employerId,
      laborerId: parsedData.booking.laborerId,
      title: "Job Title",
      description: "Job Description",
      status: "confirmed",
      confirmedAt: new Date(),
    };

    const job = await jobService.saveJob(jobData);

    // Remove booking data from Redis - same cleanup as original
    await redisClient.del(jobId);

    res.status(200).json({ success: true, job });
  } catch (error) {
    next(error);
  }
};

/**
 * Expire old jobs (can be triggered via cron).
 * Same logic as original controller
 */
export const expireJobs = async (req, res, next) => {
  try {
    const expiredJobsCount = await jobService.expireJobs();
    logger.info(`${expiredJobsCount} jobs expired`);
    res
      .status(200)
      .json({ success: true, message: `${expiredJobsCount} jobs expired` });
  } catch (error) {
    logger.error(`Error expiring jobs: ${error.message}`, error);
    next(error);
  }
};

/**
 * Book a laborer for a job.
 * Same logic as original controller
 */
export const bookLaborer = async (req, res, next) => {
  const { searchId, laborerId, wage, negotiationStatus } = req.body; // Include negotiationStatus

  if (!searchId || !laborerId || !wage || !negotiationStatus) {
    logger.warn("Missing searchId, laborerId, wage, or negotiationStatus");
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  const headers = generateHeaders(req);
  try {
    logger.info(
      `Attempting to book laborer: ${laborerId} for searchId: ${searchId}`
    );
    const bookingDetails = await jobService.bookLaborer(
      searchId,
      laborerId,
      wage,
      negotiationStatus,
      headers
    );
    logger.info(
      `Laborer booked successfully: ${laborerId} for searchId: ${searchId}`
    );
    res.status(200).json({ success: true, bookingDetails });
  } catch (error) {
    logger.error(`Error booking laborer: ${error.message}`, error);
    if (error.message.includes("Invalid laborerId")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid laborerId" });
    }
    if (error.message.includes("ongoing booking")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * Controller function to get search data by searchId
 * Same logic as original controller
 */
export const SearchData = async (req, res) => {
  const { searchId } = req.params;

  try {
    // Fetch all keys matching the pattern
    const keys = await redisClient.keys(`search:${searchId}:*`);
    logger.info(`Keys found for searchId ${searchId}: ${keys}`);

    if (keys.length === 0) {
      logger.warn(`Search data not found or expired for searchId: ${searchId}`);
      return res.status(404).json({
        success: false,
        message: "Search data not found or expired",
      });
    }

    let searchData = null;
    for (const key of keys) {
      // Fetch search data using utility function
      searchData = await fetchFromRedis(key);
      logger.info(`Data retrieved for key ${key}: ${searchData}`);

      if (searchData) {
        logger.info(`Search data retrieved for key: ${key}`);
        return res.status(200).json({
          success: true,
          data: searchData,
        });
      }
    }

    logger.warn(`Search data not found or expired for searchId: ${searchId}`);
    return res.status(404).json({
      success: false,
      message: "Search data not found or expired",
    });
  } catch (error) {
    logger.error(`Error retrieving search data: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: "Error fetching data from Redis",
    });
  }
};

/**
 * Get job statistics for analytics
 */
export const getJobStats = async (req, res, next) => {
  try {
    const { user } = req;
    const isEmployer = user.role === 'employer';
    const filter = isEmployer ? { employerId: user.id } : { laborerId: user.id };
    
    const stats = await Promise.all([
      jobService.Job.countDocuments({ ...filter, status: 'pending' }),
      jobService.Job.countDocuments({ ...filter, status: 'confirmed' }),
      jobService.Job.countDocuments({ ...filter, status: 'completed' }),
      jobService.Job.countDocuments({ ...filter, status: 'expired' })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        pending: stats[0],
        confirmed: stats[1],
        completed: stats[2],
        expired: stats[3],
        total: stats.reduce((sum, count) => sum + count, 0)
      }
    });
  } catch (error) {
    logger.error(`Error fetching job stats: ${error.message}`, error);
    next(error);
  }
};

/**
 * Get job history for user
 */
export const getJobHistory = async (req, res, next) => {
  try {
    const { user } = req;
    const { page = 1, limit = 10, status } = req.query;
    const isEmployer = user.role === 'employer';
    
    const filter = isEmployer ? { employerId: user.id } : { laborerId: user.id };
    if (status) filter.status = status;

    const jobs = await Job.find(filter)
      .populate(isEmployer ? 'laborerId' : 'employerId', 'name phoneNumber')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Job.countDocuments(filter);

    res.status(200).json({
      success: true,
      jobs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error(`Error fetching job history: ${error.message}`, error);
    next(error);
  }
};
