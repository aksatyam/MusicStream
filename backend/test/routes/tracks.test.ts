import Fastify from 'fastify';
import { trackRoutes } from '../../src/routes/tracks';

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

const mockAxiosGet = jest.fn();
jest.mock('axios', () => {
  return {
    default: {
      create: jest.fn(() => ({ get: (...args: any[]) => mockAxiosGet(...args) })),
    },
    __esModule: true,
  };
});

describe('Track Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(trackRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockAxiosGet.mockReset();
  });

  describe('GET /tracks/:videoId', () => {
    it('should return stream metadata for a valid videoId', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          videoId: 'abc123',
          title: 'Test Song',
          author: 'Test Artist',
          lengthSeconds: 240,
          videoThumbnails: [{ url: 'http://thumb.jpg' }],
          adaptiveFormats: [
            {
              type: 'audio/webm; codecs="opus"',
              url: 'http://audio.url',
              bitrate: 128000,
              encoding: 'opus',
              qualityLabel: '128kbps',
            },
          ],
        },
      });

      const res = await app.inject({ method: 'GET', url: '/tracks/abc123' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.videoId).toBe('abc123');
      expect(body.audioStreams).toHaveLength(1);
    });

    it('should return 502 when extractors fail', async () => {
      mockAxiosGet.mockRejectedValue(new Error('fail'));

      const res = await app.inject({ method: 'GET', url: '/tracks/bad-id' });
      expect(res.statusCode).toBe(502);
    });
  });

  describe('GET /tracks/:videoId/related', () => {
    it('should return placeholder response', async () => {
      const res = await app.inject({ method: 'GET', url: '/tracks/abc123/related' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.videoId).toBe('abc123');
      expect(body.related).toEqual([]);
    });
  });

  describe('GET /channels/:channelId', () => {
    it('should return placeholder response', async () => {
      const res = await app.inject({ method: 'GET', url: '/channels/UC123' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.channelId).toBe('UC123');
    });
  });

  describe('GET /lyrics/:trackId', () => {
    it('should return placeholder response', async () => {
      const res = await app.inject({ method: 'GET', url: '/lyrics/abc123' });
      const body = JSON.parse(res.body);

      expect(res.statusCode).toBe(200);
      expect(body.lyrics).toBeNull();
    });
  });
});
