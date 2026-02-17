import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { cache } from './services/cache.js';
import { authMiddleware } from './plugins/auth-middleware.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { searchRoutes } from './routes/search.js';
import { trackRoutes } from './routes/tracks.js';
import { playlistRoutes } from './routes/playlists.js';
import { runMigrations } from './services/db.js';
import { initYtDlpCookies } from './services/ytdlp.js';

const app = Fastify({
  logger: {
    level: config.logLevel,
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

async function start() {
  // Plugins
  await app.register(cors, {
    origin: config.nodeEnv === 'development' ? true : config.corsOrigins,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Auth middleware (decorates request with userId)
  await app.register(authMiddleware);

  // Routes
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(searchRoutes, { prefix: '/api' });
  await app.register(trackRoutes, { prefix: '/api' });
  await app.register(playlistRoutes, { prefix: '/api' });

  // Start listening FIRST so Render health checks can reach us immediately
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`MusicStream API running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Write YouTube cookies file from env var (if set)
  initYtDlpCookies();

  // Run database migrations (with timeout — DB may be expired on free tier)
  try {
    await Promise.race([
      runMigrations(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('migration timeout after 15s')), 15000),
      ),
    ]);
    app.log.info('Database migrations complete');
  } catch (err) {
    app.log.error(err, 'Migration failed or timed out — continuing without migrations');
  }

  // Connect to Redis (with timeout — Redis may be suspended on free tier)
  try {
    await Promise.race([
      cache.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('redis connect timeout after 10s')), 10000),
      ),
    ]);
  } catch {
    app.log.warn('Redis connect failed or timed out — caching disabled');
  }
}

start();
