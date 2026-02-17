import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const COOKIES_PATH = join(process.cwd(), 'data', 'cookies.txt');

/**
 * Write YouTube cookies file from YOUTUBE_COOKIES env var (if set).
 * Call once at startup. Logs diagnostics for debugging.
 */
export function initYtDlpCookies(): void {
  const cookiesEnv = process.env.YOUTUBE_COOKIES;
  if (!cookiesEnv) {
    console.log('[yt-dlp] YOUTUBE_COOKIES env var not set — skipping cookie file');
    return;
  }

  console.log(`[yt-dlp] YOUTUBE_COOKIES env var found (${cookiesEnv.length} chars)`);

  // Ensure data/ directory exists
  const dataDir = join(process.cwd(), 'data');
  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
      console.log(`[yt-dlp] Created data directory: ${dataDir}`);
    }
  } catch (err) {
    console.error(`[yt-dlp] Failed to create data dir: ${err}`);
  }

  try {
    writeFileSync(COOKIES_PATH, cookiesEnv, { mode: 0o600 });
    const stat = statSync(COOKIES_PATH);
    console.log(`[yt-dlp] Cookies written to ${COOKIES_PATH} (${stat.size} bytes)`);

    // Validate: check if file starts with expected header or cookie lines
    const firstLine = readFileSync(COOKIES_PATH, 'utf8').split('\n')[0];
    console.log(`[yt-dlp] Cookie file first line: "${firstLine.substring(0, 80)}..."`);
  } catch (err) {
    console.error(`[yt-dlp] Failed to write cookies file: ${err}`);
  }
}

/** Return diagnostic info about cookies state and yt-dlp version */
export async function getCookieDiagnostics(): Promise<{
  envVarSet: boolean;
  envVarLength: number;
  fileExists: boolean;
  fileSize: number;
  firstLine: string;
  ytdlpVersion: string;
}> {
  const cookiesEnv = process.env.YOUTUBE_COOKIES;
  const fileExists = existsSync(COOKIES_PATH);
  let fileSize = 0;
  let firstLine = '';
  if (fileExists) {
    try {
      fileSize = statSync(COOKIES_PATH).size;
      firstLine = readFileSync(COOKIES_PATH, 'utf8').split('\n')[0].substring(0, 80);
    } catch {
      // ignore
    }
  }

  let ytdlpVersion = 'unknown';
  try {
    const { stdout } = await execFileAsync('yt-dlp', ['--version'], { timeout: 5000 });
    ytdlpVersion = stdout.trim();
  } catch {
    // ignore
  }

  return {
    envVarSet: !!cookiesEnv,
    envVarLength: cookiesEnv?.length || 0,
    fileExists,
    fileSize,
    firstLine,
    ytdlpVersion,
  };
}

/**
 * Debug helper: list available formats for a video.
 * Used temporarily to debug "Requested format is not available" on Render.
 */
export async function ytdlpListFormats(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const { stdout, stderr } = await execFileAsync(
      'yt-dlp',
      [url, '--list-formats', '--no-check-certificates', ...getCookieArgs()],
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000 },
    );
    return stdout || stderr || 'No output';
  } catch (err: unknown) {
    const execErr = err as { stderr?: string; stdout?: string; message?: string };
    return `Error: ${execErr.stderr || execErr.stdout || execErr.message || 'Unknown'}`;
  }
}

/** Return --cookies args if cookies file exists */
function getCookieArgs(): string[] {
  if (existsSync(COOKIES_PATH)) {
    return ['--cookies', COOKIES_PATH];
  }
  return [];
}

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
      ...getCookieArgs(),
    ],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
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

  let stdout: string;
  try {
    const result = await execFileAsync(
      'yt-dlp',
      [
        url,
        '--dump-single-json',
        '--no-warnings',
        '--skip-download',
        '--no-check-certificates',
        ...getCookieArgs(),
      ],
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000 },
    );
    stdout = result.stdout;
  } catch (err: unknown) {
    const execErr = err as { stderr?: string; message?: string };
    const detail = execErr.stderr || execErr.message || 'Unknown yt-dlp error';
    throw new Error(`yt-dlp stream extraction failed: ${detail}`);
  }

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
      ...getCookieArgs(),
    ],
    { maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
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
