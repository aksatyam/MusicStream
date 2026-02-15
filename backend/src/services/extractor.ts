import axios, { type AxiosInstance } from 'axios';
import { config } from '../config/env.js';
import { cache, CACHE_TTL } from './cache.js';
import { ytdlpSearch, ytdlpGetStreams, ytdlpGetTrending } from './ytdlp.js';

interface AudioStream {
  url: string;
  mimeType: string;
  bitrate: number;
  codec: string;
  quality: string;
}

interface TrackMetadata {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  audioStreams: AudioStream[];
}

interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

interface Extractor {
  name: string;
  client: AxiosInstance;
  isOpen: boolean;
  failureCount: number;
  lastFailure: number;
}

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000; // 1 minute

class ExtractorOrchestrator {
  private extractors: Extractor[];

  constructor() {
    this.extractors = [
      {
        name: 'invidious',
        client: axios.create({ baseURL: config.invidiousUrl, timeout: 10_000 }),
        isOpen: false,
        failureCount: 0,
        lastFailure: 0,
      },
      {
        name: 'piped',
        client: axios.create({ baseURL: config.pipedUrl, timeout: 10_000 }),
        isOpen: false,
        failureCount: 0,
        lastFailure: 0,
      },
    ];
  }

  private isCircuitOpen(ext: Extractor): boolean {
    if (!ext.isOpen) return false;
    // Check if enough time has passed to try again
    if (Date.now() - ext.lastFailure > CIRCUIT_BREAKER_RESET_MS) {
      ext.isOpen = false;
      ext.failureCount = 0;
      return false;
    }
    return true;
  }

  private recordFailure(ext: Extractor): void {
    ext.failureCount++;
    ext.lastFailure = Date.now();
    if (ext.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      ext.isOpen = true;
    }
  }

  private recordSuccess(ext: Extractor): void {
    ext.failureCount = 0;
    ext.isOpen = false;
  }

  async search(query: string, page: number = 1): Promise<SearchResult[]> {
    const cacheKey = `search:${query}:${page}`;
    const cached = await cache.get<SearchResult[]>(cacheKey);
    if (cached) return cached;

    for (const ext of this.extractors) {
      if (this.isCircuitOpen(ext)) continue;

      try {
        let results: SearchResult[];
        if (ext.name === 'invidious') {
          const { data } = await ext.client.get('/api/v1/search', {
            params: { q: query, page, type: 'video', sort_by: 'relevance' },
          });
          results = data.map((item: any) => ({
            videoId: item.videoId,
            title: item.title,
            artist: item.author,
            duration: item.lengthSeconds,
            thumbnail: item.videoThumbnails?.[0]?.url || '',
          }));
        } else {
          const { data } = await ext.client.get('/search', {
            params: { q: query, filter: 'music_songs' },
          });
          results = (data.items || []).map((item: any) => ({
            videoId: item.url?.replace('/watch?v=', '') || '',
            title: item.title,
            artist: item.uploaderName,
            duration: item.duration,
            thumbnail: item.thumbnail || '',
          }));
        }

        this.recordSuccess(ext);
        await cache.set(cacheKey, results, CACHE_TTL.SEARCH);
        return results;
      } catch (_err) {
        this.recordFailure(ext);
      }
    }

    // Fallback: yt-dlp local extractor
    try {
      const results = await ytdlpSearch(query, 20);
      await cache.set(cacheKey, results, CACHE_TTL.SEARCH);
      return results;
    } catch (_err) {
      throw new Error('All extractors (including yt-dlp) failed for search');
    }
  }

  async getStreams(videoId: string): Promise<TrackMetadata> {
    const cacheKey = `stream:${videoId}`;
    const cached = await cache.get<TrackMetadata>(cacheKey);
    if (cached) return cached;

    for (const ext of this.extractors) {
      if (this.isCircuitOpen(ext)) continue;

      try {
        let metadata: TrackMetadata;
        if (ext.name === 'invidious') {
          const { data } = await ext.client.get(`/api/v1/videos/${videoId}`);
          const audioFormats = (data.adaptiveFormats || []).filter((f: any) =>
            f.type?.startsWith('audio/'),
          );
          metadata = {
            videoId: data.videoId,
            title: data.title,
            artist: data.author,
            duration: data.lengthSeconds,
            thumbnail: data.videoThumbnails?.[0]?.url || '',
            audioStreams: audioFormats.map((f: any) => ({
              url: f.url,
              mimeType: f.type,
              bitrate: f.bitrate,
              codec: f.encoding,
              quality: f.qualityLabel || `${Math.round(f.bitrate / 1000)}kbps`,
            })),
          };
        } else {
          const { data } = await ext.client.get(`/streams/${videoId}`);
          metadata = {
            videoId,
            title: data.title,
            artist: data.uploader,
            duration: data.duration,
            thumbnail: data.thumbnailUrl || '',
            audioStreams: (data.audioStreams || []).map((s: any) => ({
              url: s.url,
              mimeType: s.mimeType,
              bitrate: s.bitrate,
              codec: s.codec,
              quality: s.quality || `${Math.round(s.bitrate / 1000)}kbps`,
            })),
          };
        }

        this.recordSuccess(ext);
        await cache.set(cacheKey, metadata, CACHE_TTL.STREAM);
        return metadata;
      } catch (_err) {
        this.recordFailure(ext);
      }
    }

    // Fallback: yt-dlp local extractor
    try {
      const metadata = await ytdlpGetStreams(videoId);
      await cache.set(cacheKey, metadata, CACHE_TTL.STREAM);
      return metadata;
    } catch (_err) {
      throw new Error('All extractors (including yt-dlp) failed for streams');
    }
  }

  async getSuggestions(query: string): Promise<string[]> {
    for (const ext of this.extractors) {
      if (this.isCircuitOpen(ext)) continue;
      try {
        if (ext.name === 'invidious') {
          const { data } = await ext.client.get('/api/v1/search/suggestions', {
            params: { q: query },
          });
          this.recordSuccess(ext);
          return data.suggestions || [];
        }
      } catch {
        this.recordFailure(ext);
      }
    }
    return [];
  }

  async getTrending(): Promise<SearchResult[]> {
    const cacheKey = 'trending';
    const cached = await cache.get<SearchResult[]>(cacheKey);
    if (cached) return cached;

    for (const ext of this.extractors) {
      if (this.isCircuitOpen(ext)) continue;
      try {
        if (ext.name === 'piped') {
          const { data } = await ext.client.get('/trending', {
            params: { region: 'IN' },
          });
          this.recordSuccess(ext);
          const results = (data || [])
            .filter((item: any) => item.duration > 0)
            .slice(0, 20)
            .map((item: any) => ({
              videoId: item.url?.replace('/watch?v=', '') || '',
              title: item.title,
              artist: item.uploaderName,
              duration: item.duration,
              thumbnail: item.thumbnail || '',
            }));
          await cache.set(cacheKey, results, CACHE_TTL.TRENDING);
          return results;
        }
      } catch {
        this.recordFailure(ext);
      }
    }

    // Fallback: yt-dlp local extractor
    try {
      const results = await ytdlpGetTrending(20);
      await cache.set(cacheKey, results, CACHE_TTL.TRENDING);
      return results;
    } catch {
      return [];
    }
  }

  getStatus(): { name: string; isOpen: boolean; failureCount: number }[] {
    return [
      ...this.extractors.map(ext => ({
        name: ext.name,
        isOpen: ext.isOpen,
        failureCount: ext.failureCount,
      })),
      { name: 'yt-dlp', isOpen: false, failureCount: 0 },
    ];
  }
}

export const extractorOrchestrator = new ExtractorOrchestrator();
