/**
 * @fileoverview Notification service for job matching notifications
 * @module services/NotificationService
 * @author Labor2Hire Team
 */

import logger from "../../../config/logger.js";

/**
 * NotificationService handles job match notifications to laborers
 */
export class NotificationService {
  constructor(socketManager) {
    this.socketManager = socketManager;
  }

  /**
   * Process search data and send notifications to matched laborers
   * @param {Object} searchData - Search data containing matched laborers
   * @returns {Promise<Object>} Processing results
   */
  async handleNotification(searchData) {
    try {
      if (
        !searchData ||
        !searchData.matchedLaborers ||
        !Array.isArray(searchData.matchedLaborers)
      ) {
        logger.error("Invalid search data received", { searchData });
        return { success: false, error: "Invalid search data" };
      }

      logger.info("Processing new search data", {
        employerName: searchData.employerName,
        matchedLaborersCount: searchData.matchedLaborers.length,
      });

      const {
        searchId,
        employerName,
        wage,
        description,
        matchedLaborers,
        employerId,
      } = searchData;

      const results = await this.sendNotificationsToLaborers({
        searchId,
        employerName,
        wage,
        description,
        matchedLaborers,
        employerId,
      });

      const sentCount = results.filter((result) => result.success).length;
      const totalCount = results.length;

      logger.info(
        `Notifications processed: ${sentCount} sent, ${totalCount - sentCount} failed/queued`
      );

      return {
        success: true,
        sentCount,
        totalCount,
        results,
      };
    } catch (error) {
      logger.error("Error processing search data", {
        error: error.message,
        stack: error.stack,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notifications to matched laborers
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Array>} Array of results
   */
  async sendNotificationsToLaborers(notificationData) {
    const {
      searchId,
      employerName,
      wage,
      description,
      matchedLaborers,
      employerId,
    } = notificationData;

    const notificationPromises = matchedLaborers.map(async (laborer) => {
      try {
        if (!laborer || !laborer.userId) {
          logger.warn("Invalid laborer data in matchedLaborers", { laborer });
          return {
            success: false,
            laborerId: null,
            error: "Invalid laborer data",
          };
        }

        const notification = this.createNotification({
          searchId: searchId || "unknown_searchId",
          userId: laborer.userId,
          employerId,
          employerName,
          laborerName: laborer.name,
          wage: wage || 0,
          description: description || "Job request",
          distance: laborer.distance || 0,
          skills: laborer.skills || [],
        });

        logger.info("Sending match notification", {
          userId: laborer.userId,
          laborerName: laborer.name,
        });

        const result = await this.socketManager.sendNotificationToLaborer(
          laborer.userId,
          notification
        );

        return {
          success: result.success,
          laborerId: laborer.userId,
          laborerName: laborer.name,
          error: result.error || null,
        };
      } catch (error) {
        logger.error("Error sending notification to laborer", {
          laborerId: laborer?.userId,
          error: error.message,
        });
        return {
          success: false,
          laborerId: laborer?.userId,
          error: error.message,
        };
      }
    });

    return Promise.all(notificationPromises);
  }

  /**
   * Create notification object
   * @param {Object} data - Notification data
   * @returns {Object} Formatted notification
   */
  createNotification(data) {
    const {
      searchId,
      userId,
      employerId,
      employerName,
      laborerName,
      wage,
      description,
      distance,
      skills,
    } = data;

    return {
      searchId,
      userId,
      employerId,
      employerName,
      laborerName,
      wage,
      description,
      notificationId: `${userId}_${employerId}_${Date.now()}`,
      senderId: employerId,
      receiverId: userId,
      senderType: "employer",
      timestamp: new Date().toISOString(),
      distance,
      skills,
    };
  }

  /**
   * Get notification statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      timestamp: new Date().toISOString(),
      connectedLaborers: this.socketManager.getConnectedLaborersCount(),
      connectedEmployers: this.socketManager.getConnectedEmployersCount(),
    };
  }
}

export default NotificationService;
