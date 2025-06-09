/**
 * @fileoverview Negotiation module entry point
 * @module modules/negotiation
 * @author Labor2Hire Team
 */

import negotiationRoutes from "./routes/negotiationRoutes.js";
import connectionRoutes, {
  configureConnectionController,
} from "./routes/connectionRoutes.js";
import { setupSocketIO, SocketManager } from "./services/SocketManager.js";
import NegotiationService from "./services/NegotiationService.js";
import { NotificationService } from "./services/NotificationService.js";
import {
  NegotiationMessage,
  NegotiationConversation,
} from "./models/Negotiation.js";

// Export individual components
export {
  negotiationRoutes,
  connectionRoutes,
  setupSocketIO,
  SocketManager,
  NegotiationService,
  NotificationService,
  NegotiationMessage,
  NegotiationConversation,
  configureConnectionController,
};

// Export default module configuration
export default {
  routes: {
    negotiation: negotiationRoutes,
    connection: connectionRoutes,
  },
  services: {
    SocketManager,
    NegotiationService,
    NotificationService,
  },
  models: {
    NegotiationMessage,
    NegotiationConversation,
  },
  setup: {
    socketSetup: setupSocketIO,
    configureConnectionController,
  },
};
