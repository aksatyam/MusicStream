import type { FastifyPluginAsync } from 'fastify';
import { extractorOrchestrator } from '../services/extractor.js';

export const searchRoutes: FastifyPluginAsync = async app => {
  app.get('/search', async (request, reply) => {
    const { q, sort, page } = request.query as { q?: string; sort?: string; page?: string };

    if (!q || q.trim().length === 0) {
      return reply.status(400).send({ error: 'Query parameter "q" is required' });
    }

    try {
      // TODO: Add Redis caching (6h TTL for search results)
      const results = await extractorOrchestrator.search(q, parseInt(page || '1', 10));
      return reply.send({ query: q, results, page: parseInt(page || '1', 10) });
    } catch (err) {
      app.log.error(err, 'Search failed');
      return reply.status(502).send({ error: 'Search service unavailable' });
    }
  });

  app.get('/search/suggestions', async (request, reply) => {
    const { q } = request.query as { q?: string };

    if (!q || q.trim().length === 0) {
      return reply.send({ suggestions: [] });
    }

    try {
      const suggestions = await extractorOrchestrator.getSuggestions(q);
      return reply.send({ suggestions });
    } catch {
      return reply.send({ suggestions: [] });
    }
  });

  app.get('/trending', async (_request, reply) => {
    try {
      // TODO: Add Redis caching (1h TTL for trending)
      const results = await extractorOrchestrator.getTrending();
      return reply.send({ results });
    } catch (err) {
      app.log.error(err, 'Trending fetch failed');
      return reply.status(502).send({ error: 'Trending service unavailable' });
    }
  });
};
