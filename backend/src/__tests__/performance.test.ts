import { performance } from "perf_hooks";
import { evaluationService } from "../services/evaluationService";
import { cacheService } from "../services/cacheService";
import { supabase } from "../config/supabase";

describe("Performance Tests", () => {
  const PERFORMANCE_THRESHOLDS = {
    CACHE_GET: 10, // ms
    CACHE_SET: 20, // ms
    DB_QUERY_SIMPLE: 100, // ms
    DB_QUERY_COMPLEX: 500, // ms
    EVALUATION_FETCH: 200, // ms
    BATCH_OPERATION: 1000, // ms
  };

  beforeAll(async () => {
    // Ensure cache is connected
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  describe("Cache Performance", () => {
    it("should perform cache GET operations within threshold", async () => {
      const testKey = "performance-test-key";
      const testData = { test: "data", timestamp: Date.now() };

      // Set up test data
      await cacheService.set(testKey, testData);

      const startTime = performance.now();
      const result = await cacheService.get(testKey);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toEqual(testData);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_GET);

      // Cleanup
      await cacheService.del(testKey);
    });

    it("should perform cache SET operations within threshold", async () => {
      const testKey = "performance-test-set";
      const testData = { test: "data", timestamp: Date.now() };

      const startTime = performance.now();
      const result = await cacheService.set(testKey, testData);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_SET);

      // Cleanup
      await cacheService.del(testKey);
    });

    it("should perform batch cache operations efficiently", async () => {
      const batchSize = 100;
      const keyValuePairs = Array.from({ length: batchSize }, (_, i) => ({
        key: `batch-test-${i}`,
        value: { id: i, data: `test-data-${i}` },
      }));

      const startTime = performance.now();
      const result = await cacheService.mset(keyValuePairs);
      const endTime = performance.now();

      const duration = endTime - startTime;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATION);

      // Test batch retrieval
      const keys = keyValuePairs.map((kv) => kv.key);
      const retrievalStartTime = performance.now();
      const retrievedValues = await cacheService.mget(keys);
      const retrievalEndTime = performance.now();

      const retrievalDuration = retrievalEndTime - retrievalStartTime;

      expect(retrievedValues).toHaveLength(batchSize);
      expect(retrievalDuration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.BATCH_OPERATION
      );

      // Cleanup
      await Promise.all(keys.map((key) => cacheService.del(key)));
    });
  });

  describe("Database Query Performance", () => {
    it("should perform simple queries within threshold", async () => {
      const startTime = performance.now();

      const { data, error } = await supabase
        .from("job_postings")
        .select("id, title")
        .limit(10);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DB_QUERY_SIMPLE);
    });

    it("should perform complex queries with joins within threshold", async () => {
      const startTime = performance.now();

      const { data, error } = await supabase
        .from("evaluations")
        .select(
          `
          id,
          overall_score,
          resumes!inner (
            id,
            file_name,
            candidates!inner (
              id,
              first_name,
              last_name
            )
          )
        `
        )
        .limit(20);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DB_QUERY_COMPLEX);
    });

    it("should perform paginated queries efficiently", async () => {
      const pageSize = 50;
      const startTime = performance.now();

      const { data, error, count } = await supabase
        .from("evaluations")
        .select("*", { count: "exact" })
        .order("overall_score", { ascending: false })
        .range(0, pageSize - 1);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.DB_QUERY_COMPLEX);
    });
  });

  describe("Service Performance", () => {
    it("should fetch evaluations with caching within threshold", async () => {
      // Create a test job posting ID (this would normally exist)
      const testJobId = "test-job-performance";

      const startTime = performance.now();

      try {
        const result = await evaluationService.getEvaluationsByJobPosting(
          testJobId,
          { page: 1, limit: 20, useCache: true }
        );

        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(result).toHaveProperty("evaluations");
        expect(result).toHaveProperty("total");
        expect(result).toHaveProperty("hasMore");
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.EVALUATION_FETCH);
      } catch (error) {
        // Expected for non-existent job, but should still be fast
        const endTime = performance.now();
        const duration = endTime - startTime;
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.EVALUATION_FETCH);
      }
    });

    it("should demonstrate cache performance improvement", async () => {
      const testJobId = "test-job-cache-performance";

      // First call (no cache)
      const startTime1 = performance.now();
      try {
        await evaluationService.getEvaluationsByJobPosting(testJobId, {
          page: 1,
          limit: 20,
          useCache: true,
        });
      } catch (error) {
        // Expected for non-existent job
      }
      const endTime1 = performance.now();
      const firstCallDuration = endTime1 - startTime1;

      // Second call (with cache)
      const startTime2 = performance.now();
      try {
        await evaluationService.getEvaluationsByJobPosting(testJobId, {
          page: 1,
          limit: 20,
          useCache: true,
        });
      } catch (error) {
        // Expected for non-existent job
      }
      const endTime2 = performance.now();
      const secondCallDuration = endTime2 - startTime2;

      // Cache should make subsequent calls faster (or at least not slower)
      expect(secondCallDuration).toBeLessThanOrEqual(firstCallDuration * 1.1); // Allow 10% variance
    });
  });

  describe("Memory Usage", () => {
    it("should not have significant memory leaks in cache operations", async () => {
      const initialMemory = process.memoryUsage();

      // Perform many cache operations
      const operations = 1000;
      const promises = [];

      for (let i = 0; i < operations; i++) {
        promises.push(
          cacheService
            .set(`memory-test-${i}`, { data: `test-${i}` })
            .then(() => cacheService.get(`memory-test-${i}`))
            .then(() => cacheService.del(`memory-test-${i}`))
        );
      }

      await Promise.all(promises);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle concurrent cache operations efficiently", async () => {
      const concurrentOperations = 50;
      const startTime = performance.now();

      const promises = Array.from(
        { length: concurrentOperations },
        async (_, i) => {
          const key = `concurrent-test-${i}`;
          const data = { id: i, timestamp: Date.now() };

          await cacheService.set(key, data);
          const retrieved = await cacheService.get(key);
          await cacheService.del(key);

          return retrieved;
        }
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrentOperations);
      expect(results.every((result) => result !== null)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BATCH_OPERATION);
    });
  });

  describe("Performance Benchmarks", () => {
    it("should provide baseline performance metrics", async () => {
      const benchmarks = {
        cacheGet: 0,
        cacheSet: 0,
        dbQuery: 0,
        serviceCall: 0,
      };

      const iterations = 10;

      // Cache GET benchmark
      await cacheService.set("benchmark-key", { test: "data" });
      let totalTime = 0;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cacheService.get("benchmark-key");
        totalTime += performance.now() - start;
      }
      benchmarks.cacheGet = totalTime / iterations;

      // Cache SET benchmark
      totalTime = 0;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cacheService.set(`benchmark-set-${i}`, { test: "data" });
        totalTime += performance.now() - start;
      }
      benchmarks.cacheSet = totalTime / iterations;

      // Database query benchmark
      totalTime = 0;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await supabase.from("job_postings").select("id").limit(1);
        totalTime += performance.now() - start;
      }
      benchmarks.dbQuery = totalTime / iterations;

      console.log("Performance Benchmarks:", benchmarks);

      // All benchmarks should be within reasonable limits
      expect(benchmarks.cacheGet).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CACHE_GET
      );
      expect(benchmarks.cacheSet).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CACHE_SET
      );
      expect(benchmarks.dbQuery).toBeLessThan(
        PERFORMANCE_THRESHOLDS.DB_QUERY_SIMPLE
      );

      // Cleanup
      await cacheService.del("benchmark-key");
      for (let i = 0; i < iterations; i++) {
        await cacheService.del(`benchmark-set-${i}`);
      }
    });
  });
});
