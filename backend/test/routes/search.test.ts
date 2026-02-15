import Fastify from 'fastify';
import { searchRoutes } from '../../src/routes/search';

jest.mock('../../src/config/env', () => ({
  config: {
    invidiousUrl: 'http://localhost:3001',
    pipedUrl: 'http://localhost:3002',
  },
}));

jest.mock('../../src/services/cache', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
  CACHE_TTL: { SEARCH: 21600, STREAM: 1800, METADATA: 86400, TRENDING: 3600, SUGGESTIONS: 3600 },
}));

// Mock yt-dlp fallback
jest.mock('../../src/services/ytdlp', () => ({
  ytdlpSearch: jest.fn().mockRejectedValue(new Error('yt-dlp unavailable')),
  ytdlpGetStreams: jest.fn().mockRejectedValue(new Error('yt-dlp unavailable')),
  ytdlpGetTrending: jest.fn().mockRejectedValue(new Error('yt-dlp unavailable')),
}));

// Use a getter to access the shared mock after jest.mock hoisting
const mockAxiosGet = jest.fn();
jest.mock('axios', () => {
  return {
    default: {
      create: jest.fn(() => ({ get: (...args: any[]) => mockAxiosGet(...args) })),
    },
    __esModule: true,
  };
});

describe('Search Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(searchRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockAxiosGet.mockReset();
  });

  describe('GET /search', () => {
    it('should return 400 when query is missing', async () => {
      const res = await app.inject({ method: 'GET', url: '/search' });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toContain('required');
    });

    it('should return 400 for empty query', async () => {
      const res = await app.inject({ method: 'GET', url: '/search?q=' });
      expect(res.statusCode).toBe(400);
    });

    it('should return search results', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: [
          {
            videoId: 'abc',
            title: 'Song',
            author: 'Artist',
            lengthSeconds: 200,
            videoThumbnails: [{ url: 'http://thumb.jpg' }],
          },
        ],
      });

      const res = await app.inject({ method: 'GET', url: '/search?q=test' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.query).toBe('test');
      expect(body.results).toHaveLength(1);
      expect(body.results[0].videoId).toBe('abc');
    });

    it('should return 502 when all extractors fail', async () => {
      mockAxiosGet.mockRejectedValue(new Error('fail'));

      const res = await app.inject({ method: 'GET', url: '/search?q=failing' });
      expect(res.statusCode).toBe(502);
    });
  });

  describe('GET /search/suggestions', () => {
    it('should return empty for missing query', async () => {
      const res = await app.inject({ method: 'GET', url: '/search/suggestions' });
      const body = JSON.parse(res.body);
      expect(res.statusCode).toBe(200);
      expect(body.suggestions).toEqual([]);
    });
  });

  describe('GET /trending', () => {
    it('should return trending results', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: [
          {
            url: '/watch?v=trend1',
            title: 'Trending',
            uploaderName: 'Artist',
            duration: 180,
            thumbnail: 'http://thumb.jpg',
          },
        ],
      });

      const res = await app.inject({ method: 'GET', url: '/trending' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.results).toBeDefined();
    });
  });
});
