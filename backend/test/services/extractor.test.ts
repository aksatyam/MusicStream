// Mock config before any imports
jest.mock('../../src/config/env', () => ({
  config: {
    invidiousUrl: 'http://localhost:3001',
    pipedUrl: 'http://localhost:3002',
  },
}));

// Mock cache
jest.mock('../../src/services/cache', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
  CACHE_TTL: {
    SEARCH: 21600,
    STREAM: 1800,
    METADATA: 86400,
    TRENDING: 3600,
    SUGGESTIONS: 3600,
  },
}));

// Use closure-based mock to avoid hoisting issues
const mockAxiosGet = jest.fn();
jest.mock('axios', () => {
  return {
    default: {
      create: jest.fn(() => ({ get: (...args: any[]) => mockAxiosGet(...args) })),
    },
    __esModule: true,
  };
});

import { extractorOrchestrator } from '../../src/services/extractor';
import { cache } from '../../src/services/cache';

const mockedCacheGet = cache.get as jest.MockedFunction<typeof cache.get>;

describe('ExtractorOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCacheGet.mockResolvedValue(null);
  });

  describe('search', () => {
    it('should return search results from invidious', async () => {
      mockAxiosGet.mockResolvedValueOnce({
        data: [
          {
            videoId: 'abc123',
            title: 'Test Song',
            author: 'Test Artist',
            lengthSeconds: 240,
            videoThumbnails: [{ url: 'http://thumb.jpg' }],
          },
        ],
      });

      const results = await extractorOrchestrator.search('test query');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        videoId: 'abc123',
        title: 'Test Song',
        artist: 'Test Artist',
        duration: 240,
        thumbnail: 'http://thumb.jpg',
      });
    });

    it('should return cached results when available', async () => {
      const cachedResults = [
        { videoId: 'cached-1', title: 'Cached', artist: 'Artist', duration: 120, thumbnail: '' },
      ];
      mockedCacheGet.mockResolvedValueOnce(cachedResults);

      const results = await extractorOrchestrator.search('cached query');
      expect(results).toEqual(cachedResults);
      expect(mockAxiosGet).not.toHaveBeenCalled();
    });

    it('should fall back to piped when invidious fails', async () => {
      // Invidious fails
      mockAxiosGet.mockRejectedValueOnce(new Error('Invidious down'));
      // Piped succeeds
      mockAxiosGet.mockResolvedValueOnce({
        data: {
          items: [
            {
              url: '/watch?v=xyz789',
              title: 'Piped Song',
              uploaderName: 'Piped Artist',
              duration: 180,
              thumbnail: 'http://piped-thumb.jpg',
            },
          ],
        },
      });

      const results = await extractorOrchestrator.search('fallback query');

      expect(results).toHaveLength(1);
      expect(results[0].videoId).toBe('xyz789');
      expect(results[0].artist).toBe('Piped Artist');
    });

    it('should throw when all extractors fail', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('Invidious down'));
      mockAxiosGet.mockRejectedValueOnce(new Error('Piped down'));

      await expect(extractorOrchestrator.search('failing query')).rejects.toThrow(
        'All extractors failed for search',
      );
    });
  });

  describe('getStreams', () => {
    it('should return stream metadata from invidious', async () => {
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

      const metadata = await extractorOrchestrator.getStreams('abc123');

      expect(metadata.videoId).toBe('abc123');
      expect(metadata.audioStreams).toHaveLength(1);
      expect(metadata.audioStreams[0].codec).toBe('opus');
    });

    it('should throw when all extractors fail for streams', async () => {
      mockAxiosGet.mockRejectedValueOnce(new Error('fail'));
      mockAxiosGet.mockRejectedValueOnce(new Error('fail'));

      await expect(extractorOrchestrator.getStreams('bad-id')).rejects.toThrow(
        'All extractors failed for streams',
      );
    });
  });

  describe('getStatus', () => {
    it('should return status for all extractors', () => {
      const status = extractorOrchestrator.getStatus();
      expect(status).toHaveLength(2);
      expect(status[0]).toHaveProperty('name');
      expect(status[0]).toHaveProperty('isOpen');
      expect(status[0]).toHaveProperty('failureCount');
    });
  });

  describe('getTrending', () => {
    it('should return trending from piped extractor', async () => {
      // getTrending only processes piped (skips invidious), so the first
      // axios get call comes from piped's .get('/trending', ...)
      mockAxiosGet.mockResolvedValueOnce({
        data: [
          {
            url: '/watch?v=trend1',
            title: 'Trending Song',
            uploaderName: 'Trending Artist',
            duration: 200,
            thumbnail: 'http://trend-thumb.jpg',
          },
        ],
      });

      const results = await extractorOrchestrator.getTrending();

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Trending Song');
    });

    it('should return empty array when all extractors fail', async () => {
      mockAxiosGet.mockRejectedValue(new Error('fail'));
      const results = await extractorOrchestrator.getTrending();
      expect(results).toEqual([]);
    });
  });
});
