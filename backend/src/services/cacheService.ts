import Redis from "ioredis";
import { logger } from "../utils/logger";

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private redis: Redis | null = null;
  private isConnected = false;
  private defaultTTL = 3600; // 1 hour
  private keyPrefix = "ces:"; // Candidate Evaluation System

  constructor() {
    // Skip Redis initialization if not available
    if (process.env.REDIS_DISABLED === "true") {
      logger.info("Redis disabled, cache service will operate in no-op mode");
      return;
    }

    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 0,
      lazyConnect: true,
      enableAutoPipelining: false,
      enableReadyCheck: false,
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    if (!this.redis) return;

    this.redis.on("connect", () => {
      logger.info("Redis connected successfully");
      this.isConnected = true;
    });

    this.redis.on("ready", () => {
      logger.info("Redis ready for operations");
    });

    this.redis.on("error", (error) => {
      logger.error("Redis connection error:", error);
      this.isConnected = false;
    });

    this.redis.on("close", () => {
      logger.warn("Redis connection closed");
      this.isConnected = false;
    });

    this.redis.on("reconnecting", () => {
      logger.info("Redis reconnecting...");
    });
  }

  private async connect(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.connect();
    } catch (error) {
      logger.error("Failed to connect to Redis:", error);
    }
  }

  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping cache get");
      return null;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error("Cache get error:", error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping cache set");
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);

      await this.redis.setex(fullKey, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error("Cache set error:", error);
      return false;
    }
  }

  async del(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping cache delete");
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await this.redis.del(fullKey);
      return result > 0;
    } catch (error) {
      logger.error("Cache delete error:", error);
      return false;
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      logger.error("Cache exists error:", error);
      return false;
    }
  }

  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping cache mget");
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map((key) =>
        this.generateKey(key, options?.prefix)
      );
      const values = await this.redis.mget(...fullKeys);

      return values.map((value) => {
        if (value === null) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.error("Cache mget error:", error);
      return keys.map(() => null);
    }
  }

  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T }>,
    options?: CacheOptions
  ): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping cache mset");
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      const ttl = options?.ttl || this.defaultTTL;

      keyValuePairs.forEach(({ key, value }) => {
        const fullKey = this.generateKey(key, options?.prefix);
        const serializedValue = JSON.stringify(value);
        pipeline.setex(fullKey, ttl, serializedValue);
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error("Cache mset error:", error);
      return false;
    }
  }

  async invalidatePattern(
    pattern: string,
    options?: CacheOptions
  ): Promise<number> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping pattern invalidation");
      return 0;
    }

    try {
      const fullPattern = this.generateKey(pattern, options?.prefix);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      const result = await this.redis.del(...keys);
      logger.info(
        `Invalidated ${result} cache keys matching pattern: ${fullPattern}`
      );
      return result;
    } catch (error) {
      logger.error("Cache pattern invalidation error:", error);
      return 0;
    }
  }

  async increment(
    key: string,
    by: number = 1,
    options?: CacheOptions
  ): Promise<number | null> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping cache increment");
      return null;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await this.redis.incrby(fullKey, by);

      // Set expiration if it's a new key
      const ttl = options?.ttl || this.defaultTTL;
      await this.redis.expire(fullKey, ttl);

      return result;
    } catch (error) {
      logger.error("Cache increment error:", error);
      return null;
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyspace: any;
    clients: number;
  } | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const info = await this.redis.info();
      const lines = info.split("\r\n");

      const stats = {
        connected: this.isConnected,
        memory: "",
        keyspace: {},
        clients: 0,
      };

      lines.forEach((line) => {
        if (line.startsWith("used_memory_human:")) {
          stats.memory = line.split(":")[1];
        } else if (line.startsWith("connected_clients:")) {
          stats.clients = parseInt(line.split(":")[1]);
        } else if (line.startsWith("db0:")) {
          const keyspaceInfo = line.split(":")[1];
          const matches = keyspaceInfo.match(/keys=(\d+),expires=(\d+)/);
          if (matches) {
            stats.keyspace = {
              keys: parseInt(matches[1]),
              expires: parseInt(matches[2]),
            };
          }
        }
      });

      return stats;
    } catch (error) {
      logger.error("Cache stats error:", error);
      return null;
    }
  }

  async flush(): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      logger.warn("Redis not connected, skipping cache flush");
      return false;
    }

    try {
      await this.redis.flushdb();
      logger.info("Cache flushed successfully");
      return true;
    } catch (error) {
      logger.error("Cache flush error:", error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.quit();
      logger.info("Redis disconnected");
    } catch (error) {
      logger.error("Redis disconnect error:", error);
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const cacheService = new CacheService();
