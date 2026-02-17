import Redis from 'ioredis';
import { config } from '../config/env.js';

class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.redis.on('error', err => {
      console.error('Redis connection error:', err.message);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.redis.connect();
    } catch {
      console.warn('Redis unavailable — caching disabled');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // Cache write failures are non-fatal
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch {
      // Ignore
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('redis ping timeout')), 3000)),
      ]);
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export const cache = new CacheService();

// TTL constants matching the action plan
export const CACHE_TTL = {
  SEARCH: 6 * 60 * 60, // 6 hours
  STREAM: 30 * 60, // 30 minutes
  METADATA: 24 * 60 * 60, // 24 hours
  TRENDING: 60 * 60, // 1 hour
  SUGGESTIONS: 60 * 60, // 1 hour
} as const;
