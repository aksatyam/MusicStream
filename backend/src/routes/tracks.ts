import type { FastifyPluginAsync } from 'fastify';
import { extractorOrchestrator } from '../services/extractor.js';

export const trackRoutes: FastifyPluginAsync = async app => {
  app.get('/tracks/:videoId', async (request, reply) => {
    const { videoId } = request.params as { videoId: string };

    if (!videoId) {
      return reply.status(400).send({ error: 'videoId is required' });
    }

    try {
      // TODO: Add Redis caching (30min TTL for stream URLs)
      const metadata = await extractorOrchestrator.getStreams(videoId);
      return reply.send(metadata);
    } catch (err) {
      app.log.error(err, `Stream resolution failed for ${videoId}`);
      return reply.status(502).send({ error: 'Stream resolution failed' });
    }
  });

  app.get('/tracks/:videoId/related', async (request, reply) => {
    const { videoId } = request.params as { videoId: string };

    // TODO: Implement related tracks via Invidious recommendedVideos
    return reply.send({
      videoId,
      related: [],
      message: 'Related tracks - implementation pending',
    });
  });

  app.get('/channels/:channelId', async (request, reply) => {
    const { channelId } = request.params as { channelId: string };

    // TODO: Implement channel/artist info via Invidious
    return reply.send({
      channelId,
      message: 'Channel info - implementation pending',
    });
  });

  app.get('/lyrics/:trackId', async (request, reply) => {
    const { trackId } = request.params as { trackId: string };

    // TODO: Implement LRCLIB integration for synced lyrics
    return reply.send({
      trackId,
      lyrics: null,
      message: 'Lyrics - implementation pending (LRCLIB integration)',
    });
  });
};
