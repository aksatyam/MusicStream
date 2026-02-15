import type { FastifyPluginAsync } from 'fastify';
import { extractorOrchestrator } from '../services/extractor.js';
import { cache } from '../services/cache.js';
import { isHealthy as isDbHealthy } from '../services/db.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_request, reply) => {
    const [redisHealthy, dbHealthy] = await Promise.all([
      cache.isHealthy(),
      isDbHealthy(),
    ]);
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        redis: redisHealthy ? 'connected' : 'disconnected',
      },
      extractors: extractorOrchestrator.getStatus(),
    });
  });

  app.get('/admin/extractors', async (_request, reply) => {
    return reply.send({
      extractors: extractorOrchestrator.getStatus(),
    });
  });
};
