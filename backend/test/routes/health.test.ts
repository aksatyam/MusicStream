import Fastify from 'fastify';
import { healthRoutes } from '../../src/routes/health';

jest.mock('../../src/config/env', () => ({
  config: {
    invidiousUrl: 'http://localhost:3001',
    pipedUrl: 'http://localhost:3002',
  },
}));

jest.mock('../../src/services/cache', () => ({
  cache: {
    isHealthy: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
  CACHE_TTL: { SEARCH: 21600, STREAM: 1800, METADATA: 86400, TRENDING: 3600, SUGGESTIONS: 3600 },
}));

jest.mock('../../src/services/db', () => ({
  isHealthy: jest.fn().mockResolvedValue(true),
}));

jest.mock('axios', () => ({
  default: { create: jest.fn(() => ({ get: jest.fn() })) },
  __esModule: true,
}));

import { cache } from '../../src/services/cache';
import { isHealthy as isDbHealthy } from '../../src/services/db';

describe('Health Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(healthRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status with all services healthy', async () => {
      (cache.isHealthy as jest.Mock).mockResolvedValue(true);
      (isDbHealthy as jest.Mock).mockResolvedValue(true);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.status).toBe('ok');
      expect(body.services.database).toBe('connected');
      expect(body.services.redis).toBe('connected');
      expect(body.timestamp).toBeTruthy();
      expect(body.extractors).toBeDefined();
    });

    it('should report degraded when db is down', async () => {
      (cache.isHealthy as jest.Mock).mockResolvedValue(true);
      (isDbHealthy as jest.Mock).mockResolvedValue(false);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = JSON.parse(res.body);

      expect(body.services.database).toBe('disconnected');
      expect(body.services.redis).toBe('connected');
    });

    it('should report degraded when redis is down', async () => {
      (cache.isHealthy as jest.Mock).mockResolvedValue(false);
      (isDbHealthy as jest.Mock).mockResolvedValue(true);

      const res = await app.inject({ method: 'GET', url: '/health' });
      const body = JSON.parse(res.body);

      expect(body.services.database).toBe('connected');
      expect(body.services.redis).toBe('disconnected');
    });
  });

  describe('GET /admin/extractors', () => {
    it('should return extractor status', async () => {
      const res = await app.inject({ method: 'GET', url: '/admin/extractors' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.extractors).toBeInstanceOf(Array);
      expect(body.extractors.length).toBeGreaterThan(0);
    });
  });
});
