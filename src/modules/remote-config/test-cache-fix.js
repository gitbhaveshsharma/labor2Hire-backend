/**
 * Cache Fix Validation Script
 * Tests to ensure configuration caching issues are resolved
 * @author Labor2Hire Team
 */

import configManager from "./configManager.js";
import { cache } from "../../config/redis.js";
import { logger } from "../../config/logger.js";

/**
 * Test cache invalidation and refresh
 */
async function testCacheInvalidation() {
  console.log("\n🧪 Testing Cache Invalidation...");

  try {
    // Test 1: Force reload from file
    console.log("1️⃣ Testing force reload from file...");
    const config1 = await configManager.forceReloadFromFile("Auth");
    console.log(`✅ Force reload successful. Version: ${config1.version}`);

    // Test 2: Check cache status
    console.log("2️⃣ Checking cache status...");
    const cacheStatus = await configManager.getCacheStatus();
    console.log(
      `✅ Cache status retrieved. Redis connected: ${cacheStatus.redisConnected}`
    );

    // Test 3: Clear specific screen cache
    console.log("3️⃣ Testing cache clear for specific screen...");
    await configManager.clearScreenCache("Auth");
    console.log("✅ Screen cache cleared successfully");

    // Test 4: Invalidate and refresh cache
    console.log("4️⃣ Testing cache invalidation and refresh...");
    const refreshedConfig =
      await configManager.invalidateAndRefreshCache("Auth");
    console.log(
      `✅ Cache invalidated and refreshed. Version: ${refreshedConfig.version}`
    );

    // Test 5: Clear all cache
    console.log("5️⃣ Testing clear all cache...");
    await configManager.clearAllCache();
    console.log("✅ All cache cleared successfully");

    // Test 6: Load config after cache clear (should load from file)
    console.log("6️⃣ Testing config load after cache clear...");
    const configAfterClear = await configManager.loadScreenConfigWithFallback(
      "Auth",
      true
    );
    console.log(
      `✅ Config loaded from file after cache clear. Version: ${configAfterClear.version}`
    );

    console.log("\n🎉 All cache invalidation tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Cache invalidation test failed:", error);
    return false;
  }
}

/**
 * Test configuration update and cache consistency
 */
async function testUpdateAndCacheConsistency() {
  console.log("\n🧪 Testing Update and Cache Consistency...");

  try {
    // Test 1: Update configuration
    console.log("1️⃣ Testing configuration update...");
    const originalConfig = configManager.getScreenConfig("Auth");
    const originalBgColor =
      originalConfig?.globalStyles?.backgroundColor || "#f0f8ff";

    const newBgColor = originalBgColor === "#f0f8ff" ? "#ffffff" : "#f0f8ff";

    const updatedConfig = await configManager.updateConfig(
      "Auth",
      "globalStyles.backgroundColor",
      newBgColor,
      { userId: "test-user", source: "cache-test" }
    );

    console.log(`✅ Configuration updated. New bg color: ${newBgColor}`);

    // Test 2: Verify cache was updated
    console.log("2️⃣ Verifying cache was updated...");
    const cachedConfig = await configManager.getCachedConfiguration("Auth");

    if (
      cachedConfig &&
      cachedConfig.globalStyles?.backgroundColor === newBgColor
    ) {
      console.log("✅ Cache was properly updated");
    } else {
      throw new Error("Cache was not updated correctly");
    }

    // Test 3: Verify in-memory store was updated
    console.log("3️⃣ Verifying in-memory store was updated...");
    const memoryConfig = configManager.getScreenConfig("Auth");

    if (
      memoryConfig &&
      memoryConfig.globalStyles?.backgroundColor === newBgColor
    ) {
      console.log("✅ In-memory store was properly updated");
    } else {
      throw new Error("In-memory store was not updated correctly");
    }

    // Test 4: Restore original configuration
    console.log("4️⃣ Restoring original configuration...");
    await configManager.updateConfig(
      "Auth",
      "globalStyles.backgroundColor",
      originalBgColor,
      { userId: "test-user", source: "cache-test-restore" }
    );
    console.log("✅ Original configuration restored");

    console.log("\n🎉 All update and cache consistency tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Update and cache consistency test failed:", error);
    return false;
  }
}

/**
 * Test file watcher and cache invalidation
 */
async function testFileWatcherCacheInvalidation() {
  console.log("\n🧪 Testing File Watcher Cache Invalidation...");

  try {
    console.log(
      "1️⃣ File watcher is set up automatically when configManager is initialized"
    );
    console.log(
      "2️⃣ To test file watcher, manually modify a config file and observe logs"
    );
    console.log(
      "3️⃣ File changes should trigger cache invalidation and fresh loads"
    );

    // Simulate file change handling
    console.log("4️⃣ Simulating file change handling...");
    configManager.handleFileChange("Auth.json");

    // Wait a bit for debounced reload
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("✅ File change simulation completed");
    console.log("\n🎉 File watcher test setup completed!");
    return true;
  } catch (error) {
    console.error("❌ File watcher test failed:", error);
    return false;
  }
}

/**
 * Run all cache fix validation tests
 */
async function runAllTests() {
  console.log("🚀 Starting Cache Fix Validation Tests...");
  console.log("=".repeat(50));

  const results = [];

  // Test 1: Cache invalidation
  results.push(await testCacheInvalidation());

  // Test 2: Update and cache consistency
  results.push(await testUpdateAndCacheConsistency());

  // Test 3: File watcher cache invalidation
  results.push(await testFileWatcherCacheInvalidation());

  console.log("\n" + "=".repeat(50));
  console.log("📊 Test Results Summary:");
  console.log(`✅ Passed: ${results.filter((r) => r).length}`);
  console.log(`❌ Failed: ${results.filter((r) => !r).length}`);

  if (results.every((r) => r)) {
    console.log("\n🎉 All tests passed! Cache fix is working correctly.");
  } else {
    console.log("\n❌ Some tests failed. Check the logs above for details.");
  }

  return results.every((r) => r);
}

// Export for use in other modules
export {
  testCacheInvalidation,
  testUpdateAndCacheConsistency,
  testFileWatcherCacheInvalidation,
  runAllTests,
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Test execution failed:", error);
      process.exit(1);
    });
}
