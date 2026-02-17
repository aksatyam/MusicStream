import type { FastifyPluginAsync } from 'fastify';
import { extractorOrchestrator } from '../services/extractor.js';
import { cache } from '../services/cache.js';
import { isHealthy as isDbHealthy } from '../services/db.js';
import { getCookieDiagnostics, ytdlpListFormats } from '../services/ytdlp.js';

/** Race a promise against a timeout — returns fallback if promise doesn't resolve in time */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export const healthRoutes: FastifyPluginAsync = async app => {
  app.get('/health', async (_request, reply) => {
    const defaultCookieDiag = {
      envVarSet: false,
      envVarLength: 0,
      fileExists: false,
      fileSize: 0,
      firstLine: '',
      ytdlpVersion: 'timeout',
    };
    const [redisHealthy, dbHealthy, cookieDiag] = await Promise.all([
      withTimeout(cache.isHealthy(), 3000, false),
      withTimeout(isDbHealthy(), 3000, false),
      withTimeout(getCookieDiagnostics(), 5000, defaultCookieDiag),
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
      cookies: cookieDiag,
    });
  });

  // Debug endpoint: list available formats for a video
  app.get('/admin/debug-formats/:videoId', async (request, reply) => {
    const { videoId } = request.params as { videoId: string };
    const output = await ytdlpListFormats(videoId);
    return reply.type('text/plain').send(output);
  });

  app.get('/admin/extractors', async (_request, reply) => {
    return reply.send({
      extractors: extractorOrchestrator.getStatus(),
    });
  });
};
