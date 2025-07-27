/**
 * Remote Configuration System - Comprehensive Test Suite
 * Testing configuration management, WebSocket functionality, and API endpoints
 * @author Labor2Hire Team
 */

import { jest } from "@jest/globals";
import request from "supertest";
import { io as ioClient } from "socket.io-client";
import app from "../../../app.js";
import configManager from "../configManager.js";
import configWebSocketServer from "../websocketServer.js";
import {
  templateEngine,
  versionManager,
  backupService,
} from "../services/advancedServices.js";

// Mock dependencies
jest.mock("../../../config/redis.js");
jest.mock("../../../config/logger.js");

describe("Remote Configuration System", () => {
  let server;
  let clientSocket;
  let serverSocket;

  beforeAll(async () => {
    // Start test server
    server = app.listen(0);
    const port = server.address().port;

    // Create client socket for testing
    clientSocket = ioClient(`http://localhost:${port}`, {
      path: "/config-socket",
      transports: ["websocket"],
    });

    // Wait for connection
    await new Promise((resolve) => {
      clientSocket.on("connect", resolve);
    });
  });

  afterAll(async () => {
    // Cleanup
    if (clientSocket) clientSocket.close();
    if (server) server.close();
  });

  describe("Configuration Manager", () => {
    describe("loadAllConfigs", () => {
      it("should load all configuration files successfully", async () => {
        const configs = await configManager.loadAllConfigs();

        expect(configs).toBeDefined();
        expect(configs instanceof Map).toBe(true);
        expect(configs.size).toBeGreaterThan(0);
      });

      it("should handle missing configuration files gracefully", async () => {
        jest
          .spyOn(configManager, "discoverConfigFiles")
          .mockResolvedValue(["NonExistentScreen"]);

        const configs = await configManager.loadAllConfigs();

        expect(configs).toBeDefined();
        // Should not throw error, should use fallback
      });
    });

    describe("getScreenConfig", () => {
      it("should return configuration for valid screen", () => {
        const config = configManager.getScreenConfig("Auth");

        expect(config).toBeDefined();
        expect(config.screenType).toBe("Auth");
      });

      it("should return null for invalid screen", () => {
        const config = configManager.getScreenConfig("NonExistentScreen");

        expect(config).toBeNull();
      });
    });

    describe("updateConfig", () => {
      it("should update configuration successfully", async () => {
        const screenName = "Auth";
        const key = "backgroundColor";
        const value = "#ffffff";

        const updatedConfig = await configManager.updateConfig(
          screenName,
          key,
          value,
          { userId: "test-user" }
        );

        expect(updatedConfig).toBeDefined();
        expect(updatedConfig[key]).toBe(value);
        expect(updatedConfig.lastUpdated).toBeDefined();
      });

      it("should validate configuration updates", async () => {
        const screenName = "Auth";
        const key = "backgroundColor";
        const invalidValue = "invalid-color";

        await expect(
          configManager.updateConfig(screenName, key, invalidValue)
        ).rejects.toThrow();
      });

      it("should prevent updating protected keys", async () => {
        const screenName = "Auth";
        const protectedKey = "_metadata";
        const value = "test";

        await expect(
          configManager.updateConfig(screenName, protectedKey, value)
        ).rejects.toThrow("Cannot update protected key");
      });
    });

    describe("Circuit Breaker", () => {
      it("should open circuit breaker after multiple failures", async () => {
        // Mock Redis failures
        jest
          .spyOn(configManager, "executeWithCircuitBreaker")
          .mockRejectedValue(new Error("Redis connection failed"));

        // Trigger multiple failures
        for (let i = 0; i < 6; i++) {
          try {
            await configManager.getCachedConfiguration("Auth");
          } catch (error) {
            // Expected to fail
          }
        }

        const breaker = configManager.circuitBreaker.get("redis");
        expect(breaker.state).toBe("OPEN");
      });
    });
  });

  describe("WebSocket Server", () => {
    describe("Connection Management", () => {
      it("should accept client connections", (done) => {
        const testClient = ioClient(
          `http://localhost:${server.address().port}`,
          {
            path: "/config-socket",
          }
        );

        testClient.on("connect", () => {
          expect(testClient.connected).toBe(true);
          testClient.close();
          done();
        });
      });

      it("should send full config sync on connection", (done) => {
        const testClient = ioClient(
          `http://localhost:${server.address().port}`,
          {
            path: "/config-socket",
          }
        );

        testClient.on("fullConfigSync", (data) => {
          expect(data).toBeDefined();
          expect(data.configs).toBeDefined();
          expect(data.timestamp).toBeDefined();
          testClient.close();
          done();
        });
      });

      it("should handle client disconnection gracefully", (done) => {
        const testClient = ioClient(
          `http://localhost:${server.address().port}`,
          {
            path: "/config-socket",
          }
        );

        testClient.on("connect", () => {
          const initialStats = configWebSocketServer.getConnectionStats();

          testClient.close();

          setTimeout(() => {
            const finalStats = configWebSocketServer.getConnectionStats();
            expect(finalStats.connectedClients).toBeLessThan(
              initialStats.connectedClients + 1
            );
            done();
          }, 100);
        });
      });
    });

    describe("Configuration Broadcasting", () => {
      it("should broadcast configuration updates to all clients", (done) => {
        let updateReceived = false;

        clientSocket.on("screenConfigUpdate", (data) => {
          if (!updateReceived) {
            updateReceived = true;
            expect(data.screen).toBe("Auth");
            expect(data.config).toBeDefined();
            expect(data.timestamp).toBeDefined();
            done();
          }
        });

        // Trigger an update
        configWebSocketServer.broadcastConfigUpdate("Auth", {
          screenType: "Auth",
          backgroundColor: "#000000",
        });
      });

      it("should handle broadcast errors gracefully", async () => {
        // Mock io.emit to throw error
        const originalEmit = configWebSocketServer.io.emit;
        configWebSocketServer.io.emit = jest.fn().mockImplementation(() => {
          throw new Error("Broadcast failed");
        });

        await expect(
          configWebSocketServer.broadcastConfigUpdate("Auth", {})
        ).rejects.toThrow("Broadcast failed");

        // Restore original emit
        configWebSocketServer.io.emit = originalEmit;
      });
    });

    describe("Health Monitoring", () => {
      it("should respond to ping requests", (done) => {
        clientSocket.emit("ping");

        clientSocket.on("pong", (data) => {
          expect(data.timestamp).toBeDefined();
          done();
        });
      });

      it("should provide connection statistics", () => {
        const stats = configWebSocketServer.getConnectionStats();

        expect(stats).toBeDefined();
        expect(stats.connectedClients).toBeGreaterThanOrEqual(0);
        expect(stats.totalConnections).toBeGreaterThanOrEqual(0);
        expect(stats.serverStatus).toBe("active");
      });
    });
  });

  describe("REST API Endpoints", () => {
    describe("GET /api/config/health", () => {
      it("should return health status", async () => {
        const response = await request(app)
          .get("/api/config/health")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.service).toBe("remote-config");
        expect(response.body.data.status).toBeDefined();
      });
    });

    describe("GET /api/config/all", () => {
      it("should return all configurations with valid auth", async () => {
        const response = await request(app)
          .get("/api/config/all")
          .set("X-Config-API-Key", "test-api-key")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      });

      it("should reject requests without authentication", async () => {
        await request(app).get("/api/config/all").expect(401);
      });

      it("should reject requests with invalid API key", async () => {
        await request(app)
          .get("/api/config/all")
          .set("X-Config-API-Key", "invalid-key")
          .expect(401);
      });
    });

    describe("GET /api/config/screen/:screenName", () => {
      it("should return specific screen configuration", async () => {
        const response = await request(app)
          .get("/api/config/screen/Auth")
          .set("X-Config-API-Key", "test-api-key")
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.screenType).toBe("Auth");
      });

      it("should return 404 for non-existent screen", async () => {
        await request(app)
          .get("/api/config/screen/NonExistentScreen")
          .set("X-Config-API-Key", "test-api-key")
          .expect(404);
      });

      it("should validate screen name parameter", async () => {
        await request(app)
          .get("/api/config/screen/invalid-screen-name!")
          .set("X-Config-API-Key", "test-api-key")
          .expect(400);
      });
    });

    describe("POST /api/config/update", () => {
      it("should update configuration successfully", async () => {
        const updateData = {
          screen: "Auth",
          key: "backgroundColor",
          value: "#ffffff",
        };

        const response = await request(app)
          .post("/api/config/update")
          .set("X-Config-API-Key", "test-api-key")
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.screen).toBe("Auth");
        expect(response.body.data.key).toBe("backgroundColor");
      });

      it("should validate update data", async () => {
        const invalidData = {
          screen: "", // Invalid screen name
          key: "backgroundColor",
          value: "#ffffff",
        };

        await request(app)
          .post("/api/config/update")
          .set("X-Config-API-Key", "test-api-key")
          .send(invalidData)
          .expect(400);
      });
    });

    describe("POST /api/config/update-bulk", () => {
      it("should update multiple configurations", async () => {
        const bulkData = {
          screen: "Auth",
          updates: {
            backgroundColor: "#ffffff",
            primaryColor: "#007bff",
            screenTitle: "Login",
          },
        };

        const response = await request(app)
          .post("/api/config/update-bulk")
          .set("X-Config-API-Key", "test-api-key")
          .send(bulkData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it("should reject bulk updates with too many changes", async () => {
        const updates = {};
        for (let i = 0; i < 51; i++) {
          updates[`key${i}`] = `value${i}`;
        }

        const bulkData = {
          screen: "Auth",
          updates,
        };

        await request(app)
          .post("/api/config/update-bulk")
          .set("X-Config-API-Key", "test-api-key")
          .send(bulkData)
          .expect(400);
      });
    });

    describe("GET /api/config/metrics", () => {
      it("should return Prometheus metrics", async () => {
        const response = await request(app)
          .get("/api/config/metrics")
          .set("X-Config-API-Key", "test-api-key")
          .expect(200);

        expect(response.text).toContain("config_requests_total");
        expect(response.headers["content-type"]).toBe(
          "text/plain; charset=utf-8"
        );
      });
    });
  });

  describe("Template Engine", () => {
    describe("Variable Processing", () => {
      it("should replace template variables", () => {
        const template = "Hello {{USERNAME}}, today is {{DATE}}";
        const context = { USERNAME: "John" };

        const result = templateEngine.processTemplate(template, context);

        expect(result).toContain("Hello John");
        expect(result).toContain("today is");
      });

      it("should handle nested object templates", () => {
        const template = {
          title: "Welcome {{USER.name}}",
          style: {
            color: "{{THEME.primary}}",
          },
        };

        const context = {
          USER: { name: "Alice" },
          THEME: { primary: "#007bff" },
        };

        const result = templateEngine.processTemplate(template, context);

        expect(result.title).toBe("Welcome Alice");
        expect(result.style.color).toBe("#007bff");
      });

      it("should apply filters to variables", () => {
        const template = "Hello {{USERNAME | uppercase}}";
        const context = { USERNAME: "john" };

        const result = templateEngine.processTemplate(template, context);

        expect(result).toBe("Hello JOHN");
      });
    });

    describe("Custom Variables and Filters", () => {
      it("should register and use custom variables", () => {
        templateEngine.registerVariable("CUSTOM_VAR", () => "custom_value");

        const template = "Value: {{CUSTOM_VAR}}";
        const result = templateEngine.processTemplate(template, {});

        expect(result).toBe("Value: custom_value");
      });

      it("should register and use custom filters", () => {
        templateEngine.registerFilter("double", (value) => value + value);

        const template = "{{TEXT | double}}";
        const context = { TEXT: "hello" };

        const result = templateEngine.processTemplate(template, context);

        expect(result).toBe("hellohello");
      });
    });
  });

  describe("Version Manager", () => {
    describe("Version Creation", () => {
      it("should create configuration versions", async () => {
        const config = { screenType: "Auth", backgroundColor: "#ffffff" };
        const metadata = { userId: "test-user", type: "update" };

        const version = await versionManager.createVersion(
          "Auth",
          config,
          metadata
        );

        expect(version).toBeDefined();
        expect(version.version).toBeDefined();
        expect(version.config).toEqual(config);
        expect(version.metadata.createdBy).toBe("test-user");
      });

      it("should maintain version history", async () => {
        const config1 = { screenType: "Auth", backgroundColor: "#ffffff" };
        const config2 = { screenType: "Auth", backgroundColor: "#000000" };

        await versionManager.createVersion("Auth", config1);
        await versionManager.createVersion("Auth", config2);

        const history = await versionManager.getVersionHistory("Auth");

        expect(history.length).toBeGreaterThanOrEqual(2);
        expect(history[0].config.backgroundColor).toBe("#000000");
        expect(history[1].config.backgroundColor).toBe("#ffffff");
      });
    });

    describe("Version Comparison", () => {
      it("should compare configuration versions", async () => {
        const config1 = {
          screenType: "Auth",
          backgroundColor: "#ffffff",
          title: "Login",
        };
        const config2 = {
          screenType: "Auth",
          backgroundColor: "#000000",
          title: "Sign In",
        };

        const v1 = await versionManager.createVersion("Auth", config1);
        const v2 = await versionManager.createVersion("Auth", config2);

        const comparison = await versionManager.compareVersions(
          "Auth",
          v1.version,
          v2.version
        );

        expect(comparison.changes).toBeDefined();
        expect(
          comparison.changes.some(
            (change) =>
              change.path === "backgroundColor" && change.type === "modified"
          )
        ).toBe(true);
      });
    });

    describe("Rollback Functionality", () => {
      it("should rollback to previous version", async () => {
        const originalConfig = {
          screenType: "Auth",
          backgroundColor: "#ffffff",
        };
        const updatedConfig = {
          screenType: "Auth",
          backgroundColor: "#000000",
        };

        const v1 = await versionManager.createVersion("Auth", originalConfig);
        await versionManager.createVersion("Auth", updatedConfig);

        const rolledBackConfig = await versionManager.rollbackToVersion(
          "Auth",
          v1.version
        );

        expect(rolledBackConfig.backgroundColor).toBe("#ffffff");
      });
    });
  });

  describe("Backup Service", () => {
    describe("Backup Creation", () => {
      it("should create full configuration backup", async () => {
        const backup = await backupService.createFullBackup();

        expect(backup).toBeDefined();
        expect(backup.id).toBeDefined();
        expect(backup.configs).toBeDefined();
        expect(backup.metadata.totalScreens).toBeGreaterThan(0);
      });

      it("should list available backups", async () => {
        await backupService.createFullBackup();
        const backups = await backupService.listBackups();

        expect(backups).toBeDefined();
        expect(Array.isArray(backups)).toBe(true);
        expect(backups.length).toBeGreaterThan(0);
      });
    });

    describe("Backup Restoration", () => {
      it("should restore from backup", async () => {
        const backup = await backupService.createFullBackup();
        const restoration = await backupService.restoreFromBackup(backup.id);

        expect(restoration).toBeDefined();
        expect(restoration.backupId).toBe(backup.id);
        expect(restoration.restoredScreens).toBeDefined();
        expect(restoration.totalRestored).toBeGreaterThan(0);
      });

      it("should handle restoration of non-existent backup", async () => {
        await expect(
          backupService.restoreFromBackup("non-existent-backup")
        ).rejects.toThrow("Backup not found");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle Redis connection failures gracefully", async () => {
      // Mock Redis failure
      jest
        .spyOn(configManager, "getCachedConfiguration")
        .mockRejectedValue(new Error("Redis connection failed"));

      // Should fallback to file system
      const config = await configManager.loadScreenConfigWithFallback("Auth");
      expect(config).toBeDefined();
    });

    it("should handle file system errors gracefully", async () => {
      jest
        .spyOn(configManager, "loadScreenConfigFromFile")
        .mockRejectedValue(new Error("File not found"));

      // Should fallback to template
      const config = await configManager.loadScreenConfigWithFallback("Auth");
      expect(config).toBeDefined();
    });

    it("should provide fallback configurations when all sources fail", async () => {
      jest
        .spyOn(configManager, "loadScreenConfigFromFile")
        .mockRejectedValue(new Error("File not found"));
      jest
        .spyOn(configManager, "createConfigFromTemplate")
        .mockResolvedValue(null);

      // Should use minimal fallback
      const config = await configManager.getFallbackConfiguration("Auth");
      expect(config).toBeDefined();
      expect(config._metadata.source).toBe("minimal-fallback");
    });
  });

  describe("Performance Tests", () => {
    it("should handle multiple concurrent requests", async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get("/api/config/screen/Auth")
            .set("X-Config-API-Key", "test-api-key")
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it("should complete configuration updates within acceptable time", async () => {
      const startTime = Date.now();

      await configManager.updateConfig("Auth", "backgroundColor", "#ffffff");

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("Security Tests", () => {
    it("should sanitize malicious input", async () => {
      const maliciousData = {
        screen: "Auth",
        key: "backgroundColor",
        value: '<script>alert("xss")</script>',
      };

      const response = await request(app)
        .post("/api/config/update")
        .set("X-Config-API-Key", "test-api-key")
        .send(maliciousData)
        .expect(400); // Should be rejected by validation

      expect(response.body.success).toBe(false);
    });

    it("should enforce rate limiting", async () => {
      const requests = [];

      // Send many requests quickly
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .get("/api/config/health")
            .set("X-Config-API-Key", "test-api-key")
        );
      }

      const responses = await Promise.all(requests);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

// Integration tests with real client
describe("Client-Server Integration", () => {
  let testServer;
  let testClient;

  beforeAll(async () => {
    // Start test server
    testServer = app.listen(0);
    const port = testServer.address().port;

    // Import and initialize client
    const { ConfigClient } = await import(
      "../../Labor2Hire/src/services/ConfigClient.ts"
    );

    testClient = new ConfigClient({
      serverUrl: `http://localhost:${port}`,
      autoReconnect: false,
    });
  });

  afterAll(async () => {
    if (testClient) testClient.disconnect();
    if (testServer) testServer.close();
  });

  it("should establish connection and receive configurations", (done) => {
    testClient.options.onFullConfigSync = (configs) => {
      expect(configs).toBeDefined();
      expect(Object.keys(configs).length).toBeGreaterThan(0);
      done();
    };

    testClient.connect();
  });

  it("should receive real-time configuration updates", (done) => {
    testClient.options.onConfigUpdate = (screen, config) => {
      expect(screen).toBe("Auth");
      expect(config).toBeDefined();
      done();
    };

    testClient.connect();

    // Trigger an update from server side
    setTimeout(() => {
      configWebSocketServer.broadcastConfigUpdate("Auth", {
        screenType: "Auth",
        backgroundColor: "#updated",
      });
    }, 100);
  });

  it("should handle connection errors gracefully", (done) => {
    testClient.options.onError = (type, error) => {
      expect(type).toBeDefined();
      expect(error).toBeDefined();
      done();
    };

    // Try to connect to invalid URL
    testClient.options.serverUrl = "http://invalid-url:9999";
    testClient.connect();
  });
});

// Load testing (optional, for performance validation)
describe.skip("Load Testing", () => {
  it("should handle high concurrent WebSocket connections", async () => {
    const connectionCount = 100;
    const clients = [];

    // Create multiple client connections
    for (let i = 0; i < connectionCount; i++) {
      const client = ioClient(`http://localhost:${server.address().port}`, {
        path: "/config-socket",
      });
      clients.push(client);
    }

    // Wait for all connections
    await Promise.all(
      clients.map(
        (client) => new Promise((resolve) => client.on("connect", resolve))
      )
    );

    // Verify all connections are established
    const stats = configWebSocketServer.getConnectionStats();
    expect(stats.connectedClients).toBeGreaterThanOrEqual(connectionCount);

    // Cleanup
    clients.forEach((client) => client.close());
  });

  it("should handle high-frequency configuration updates", async () => {
    const updateCount = 1000;
    const updates = [];

    for (let i = 0; i < updateCount; i++) {
      updates.push(
        configManager.updateConfig("Auth", "testField", `value${i}`)
      );
    }

    const results = await Promise.allSettled(updates);
    const successful = results.filter((r) => r.status === "fulfilled").length;

    expect(successful).toBeGreaterThan(updateCount * 0.9); // 90% success rate
  });
});
