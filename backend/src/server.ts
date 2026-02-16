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

  // Run database migrations
  try {
    await runMigrations();
    app.log.info('Database migrations complete');
  } catch (err) {
    app.log.error(err, 'Migration failed — starting anyway');
  }

  // Connect to Redis
  await cache.connect();

  // Start server
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    app.log.info(`MusicStream API running on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
