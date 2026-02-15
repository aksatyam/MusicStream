import RNFS from 'react-native-fs';
import { api } from './api';
import type { TrackMeta } from '../types';

const DOWNLOAD_DIR = `${RNFS.DocumentDirectoryPath}/downloads`;

export interface DownloadedTrack extends TrackMeta {
  filePath: string;
  downloadedAt: string;
  fileSize: number;
}

const MANIFEST_PATH = `${DOWNLOAD_DIR}/manifest.json`;

async function ensureDir() {
  const exists = await RNFS.exists(DOWNLOAD_DIR);
  if (!exists) {
    await RNFS.mkdir(DOWNLOAD_DIR);
  }
}

async function readManifest(): Promise<DownloadedTrack[]> {
  try {
    await ensureDir();
    const exists = await RNFS.exists(MANIFEST_PATH);
    if (!exists) return [];
    const json = await RNFS.readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(json);
  } catch {
    return [];
  }
}

async function writeManifest(tracks: DownloadedTrack[]) {
  await ensureDir();
  await RNFS.writeFile(MANIFEST_PATH, JSON.stringify(tracks), 'utf8');
}

export async function getDownloadedTracks(): Promise<DownloadedTrack[]> {
  return readManifest();
}

export async function isDownloaded(videoId: string): Promise<boolean> {
  const manifest = await readManifest();
  const entry = manifest.find((t) => t.videoId === videoId);
  if (!entry) return false;
  return RNFS.exists(entry.filePath);
}

export async function downloadTrack(
  track: TrackMeta,
  onProgress?: (percent: number) => void,
): Promise<DownloadedTrack | null> {
  try {
    await ensureDir();

    // Get stream URL from backend
    const { data } = await api.get(`/tracks/${track.videoId}`);
    const streams = data.audioStreams || [];
    const opus = streams.find((s: any) => s.mimeType?.includes('opus'));
    const selected = opus || streams[0];
    if (!selected?.url) throw new Error('No audio stream available');

    const ext = selected.mimeType?.includes('opus') ? 'opus' : 'mp4';
    const filePath = `${DOWNLOAD_DIR}/${track.videoId}.${ext}`;

    // Download
    const result = await RNFS.downloadFile({
      fromUrl: selected.url,
      toFile: filePath,
      progress: (res) => {
        if (onProgress && res.contentLength > 0) {
          onProgress(res.bytesWritten / res.contentLength);
        }
      },
      progressInterval: 500,
    }).promise;

    if (result.statusCode !== 200) {
      throw new Error(`Download failed with status ${result.statusCode}`);
    }

    const stat = await RNFS.stat(filePath);
    const downloaded: DownloadedTrack = {
      ...track,
      filePath,
      downloadedAt: new Date().toISOString(),
      fileSize: parseInt(String(stat.size), 10),
    };

    // Update manifest
    const manifest = await readManifest();
    const filtered = manifest.filter((t) => t.videoId !== track.videoId);
    await writeManifest([downloaded, ...filtered]);

    return downloaded;
  } catch (err) {
    console.error('Download failed:', err);
    return null;
  }
}

export async function deleteDownload(videoId: string): Promise<void> {
  const manifest = await readManifest();
  const entry = manifest.find((t) => t.videoId === videoId);

  if (entry) {
    try {
      await RNFS.unlink(entry.filePath);
    } catch {
      // File may already be gone
    }
  }

  await writeManifest(manifest.filter((t) => t.videoId !== videoId));
}

export async function deleteAllDownloads(): Promise<void> {
  const manifest = await readManifest();
  for (const entry of manifest) {
    try {
      await RNFS.unlink(entry.filePath);
    } catch {
      // Continue
    }
  }
  await writeManifest([]);
}

export async function getDownloadSize(): Promise<number> {
  const manifest = await readManifest();
  return manifest.reduce((total, t) => total + (t.fileSize || 0), 0);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
