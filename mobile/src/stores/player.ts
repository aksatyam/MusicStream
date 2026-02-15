import { create } from 'zustand';
import { Platform } from 'react-native';
import TrackPlayer, { State } from 'react-native-track-player';
import { api } from '../services/api';

interface TrackMeta {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

interface ResolvedStream {
  url: string;
  type: string;
}

interface PlayerState {
  currentTrack: TrackMeta | null;
  queue: TrackMeta[];
  isPlaying: boolean;
  isLoading: boolean;
  isPlayerReady: boolean;

  setPlayerReady: (ready: boolean) => void;
  playTrack: (track: TrackMeta) => Promise<void>;
  addToQueue: (track: TrackMeta) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setIsPlaying: (playing: boolean) => void;
  clearQueue: () => Promise<void>;
}

async function resolveStreamUrl(videoId: string): Promise<ResolvedStream> {
  const { data } = await api.get(`/tracks/${videoId}`);
  const streams = data.audioStreams || [];

  if (streams.length === 0) throw new Error('No audio stream available');

  // iOS AVPlayer does NOT support WebM/OPUS — must use MP4/AAC.
  // Android ExoPlayer supports both, but prefer OPUS for quality.
  let selected;
  if (Platform.OS === 'ios') {
    // Prefer MP4/AAC (m4a), fall back to any non-opus stream, then first available
    selected =
      streams.find((s: any) => s.mimeType?.includes('mp4')) ||
      streams.find(
        (s: any) =>
          !s.mimeType?.includes('opus') && !s.mimeType?.includes('webm'),
      ) ||
      streams[0];
  } else {
    // Android: prefer OPUS for better quality at lower bitrate
    selected =
      streams.find((s: any) => s.mimeType?.includes('opus')) || streams[0];
  }

  if (!selected?.url) throw new Error('No audio stream available');

  // Determine MIME type for TrackPlayer
  const type = selected.mimeType?.includes('mp4') ? 'default' : 'default';

  return { url: selected.url, type };
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  isLoading: false,
  isPlayerReady: false,

  setPlayerReady: ready => set({ isPlayerReady: ready }),

  playTrack: async track => {
    set({ isLoading: true, currentTrack: track });

    try {
      const stream = await resolveStreamUrl(track.videoId);

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: track.videoId,
        url: stream.url,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        artwork: track.thumbnail,
      });
      await TrackPlayer.play();

      // Add to queue if not already present
      const { queue } = get();
      const exists = queue.some(t => t.videoId === track.videoId);
      if (!exists) {
        set({ queue: [...queue, track] });
      }

      set({ isPlaying: true, isLoading: false });
    } catch (err) {
      console.error('Failed to play track:', err);
      set({ isLoading: false });
    }
  },

  addToQueue: async track => {
    const { queue } = get();
    const exists = queue.some(t => t.videoId === track.videoId);
    if (exists) return;

    try {
      const stream = await resolveStreamUrl(track.videoId);
      await TrackPlayer.add({
        id: track.videoId,
        url: stream.url,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        artwork: track.thumbnail,
      });
      set({ queue: [...queue, track] });
    } catch (err) {
      console.error('Failed to add to queue:', err);
    }
  },

  playNext: async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // No next track
    }
  },

  playPrevious: async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      // No previous track
    }
  },

  togglePlayPause: async () => {
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      await TrackPlayer.pause();
      set({ isPlaying: false });
    } else {
      await TrackPlayer.play();
      set({ isPlaying: true });
    }
  },

  seekTo: async position => {
    await TrackPlayer.seekTo(position);
  },

  setIsPlaying: playing => set({ isPlaying: playing }),

  clearQueue: async () => {
    await TrackPlayer.reset();
    set({ currentTrack: null, queue: [], isPlaying: false });
  },
}));
