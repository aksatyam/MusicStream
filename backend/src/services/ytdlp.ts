import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface YtDlpFormat {
  url: string;
  acodec?: string;
  vcodec?: string;
  abr?: number;
  ext?: string;
  format_note?: string;
}

interface YtDlpVideoJson {
  id: string;
  title?: string;
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnails?: { url: string }[];
  formats?: YtDlpFormat[];
  _type?: string;
}

interface YtDlpSearchResult {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

interface YtDlpStreamResult {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  audioStreams: {
    url: string;
    mimeType: string;
    bitrate: number;
    codec: string;
    quality: string;
  }[];
}

/**
 * Search YouTube via yt-dlp `ytsearch` prefix.
 * Returns up to `limit` normalized results.
 */
export async function ytdlpSearch(query: string, limit: number = 20): Promise<YtDlpSearchResult[]> {
  const { stdout } = await execFileAsync(
    'yt-dlp',
    [
      `ytsearch${limit}:${query}`,
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--skip-download',
    ],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
  );

  // yt-dlp outputs one JSON object per line
  const results: YtDlpSearchResult[] = [];
  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    try {
      const item = JSON.parse(line);
      // Skip non-video items (playlists, channels, etc.)
      if (!item.id || item._type === 'playlist') continue;
      results.push({
        videoId: item.id,
        title: item.title || 'Unknown',
        artist: item.channel || item.uploader || 'Unknown Artist',
        duration: Math.round(item.duration || 0),
        thumbnail:
          item.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
      });
    } catch {
      // skip malformed lines
    }
  }

  return results;
}

/**
 * Resolve audio stream URLs for a given videoId via yt-dlp.
 */
export async function ytdlpGetStreams(videoId: string): Promise<YtDlpStreamResult> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const { stdout } = await execFileAsync(
    'yt-dlp',
    [url, '--dump-json', '--no-warnings', '--skip-download'],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
  );

  const data: YtDlpVideoJson = JSON.parse(stdout.trim());

  // Filter audio-only formats
  const audioFormats = (data.formats || []).filter(
    (f: YtDlpFormat) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'),
  );

  // Sort: MP4/AAC first (iOS compatible), then by bitrate descending
  audioFormats.sort((a: YtDlpFormat, b: YtDlpFormat) => {
    const aIsMP4 = a.acodec?.includes('mp4a') ? 1 : 0;
    const bIsMP4 = b.acodec?.includes('mp4a') ? 1 : 0;
    if (bIsMP4 !== aIsMP4) return bIsMP4 - aIsMP4; // MP4 first
    return (b.abr || 0) - (a.abr || 0); // then by bitrate
  });

  return {
    videoId: data.id || videoId,
    title: data.title || 'Unknown',
    artist: data.channel || data.uploader || 'Unknown Artist',
    duration: Math.round(data.duration || 0),
    thumbnail:
      data.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    audioStreams: audioFormats.map((f: YtDlpFormat) => ({
      url: f.url,
      mimeType: f.acodec?.includes('mp4a')
        ? 'audio/mp4; codecs="mp4a.40.2"'
        : f.acodec?.includes('opus')
          ? 'audio/webm; codecs="opus"'
          : `audio/${f.ext || 'webm'}`,
      bitrate: Math.round((f.abr || 0) * 1000),
      codec: f.acodec || 'unknown',
      quality: f.format_note || `${Math.round(f.abr || 0)}kbps`,
    })),
  };
}

/**
 * Get trending music via yt-dlp (YouTube Music charts).
 */
export async function ytdlpGetTrending(limit: number = 20): Promise<YtDlpSearchResult[]> {
  // Use YouTube Music trending/charts playlist
  const { stdout } = await execFileAsync(
    'yt-dlp',
    [
      'https://music.youtube.com/playlist?list=VLPLMC9KNkIncKtPzC09knCwMPzcRI7IL8',
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--skip-download',
      '--playlist-end',
      String(limit),
    ],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
  );

  const results: YtDlpSearchResult[] = [];
  for (const line of stdout.trim().split('\n')) {
    if (!line) continue;
    try {
      const item = JSON.parse(line);
      if (!item.id) continue;
      results.push({
        videoId: item.id,
        title: item.title || 'Unknown',
        artist: item.channel || item.uploader || 'Unknown Artist',
        duration: Math.round(item.duration || 0),
        thumbnail:
          item.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
      });
    } catch {
      // skip
    }
  }

  return results;
}
