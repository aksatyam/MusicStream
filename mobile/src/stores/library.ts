import { create } from 'zustand';
import { api } from '../services/api';
import type { TrackMeta } from '../types';

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  track_count: number;
  created_at: string;
  updated_at: string;
}

interface PlaylistTrack {
  id: string;
  video_id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  position: number;
  added_at: string;
}

interface Favorite {
  id: string;
  video_id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  created_at: string;
}

interface HistoryEntry {
  id: string;
  video_id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  played_at: string;
  play_duration: number;
}

interface LibraryState {
  playlists: Playlist[];
  favorites: Favorite[];
  history: HistoryEntry[];
  isLoadingPlaylists: boolean;
  isLoadingFavorites: boolean;
  isLoadingHistory: boolean;

  fetchPlaylists: () => Promise<void>;
  createPlaylist: (name: string, description?: string) => Promise<Playlist | null>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: TrackMeta) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  fetchPlaylistTracks: (playlistId: string) => Promise<PlaylistTrack[]>;

  fetchFavorites: () => Promise<void>;
  toggleFavorite: (track: TrackMeta) => Promise<void>;
  isFavorite: (videoId: string) => boolean;

  fetchHistory: () => Promise<void>;
  recordHistory: (track: TrackMeta, playDuration: number) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  playlists: [],
  favorites: [],
  history: [],
  isLoadingPlaylists: false,
  isLoadingFavorites: false,
  isLoadingHistory: false,

  // ─── Playlists ─────────────────────────────────────────────

  fetchPlaylists: async () => {
    set({ isLoadingPlaylists: true });
    try {
      const { data } = await api.get('/playlists');
      set({ playlists: data.playlists || [] });
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
    } finally {
      set({ isLoadingPlaylists: false });
    }
  },

  createPlaylist: async (name, description) => {
    try {
      const { data } = await api.post('/playlists', { name, description });
      const newPlaylist = { ...data.playlist, track_count: 0 };
      set({ playlists: [newPlaylist, ...get().playlists] });
      return newPlaylist;
    } catch (err) {
      console.error('Failed to create playlist:', err);
      return null;
    }
  },

  deletePlaylist: async (id) => {
    try {
      await api.delete(`/playlists/${id}`);
      set({ playlists: get().playlists.filter((p) => p.id !== id) });
    } catch (err) {
      console.error('Failed to delete playlist:', err);
    }
  },

  addTrackToPlaylist: async (playlistId, track) => {
    try {
      await api.post(`/playlists/${playlistId}/tracks`, {
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        thumbnailUrl: track.thumbnail,
      });
      // Update track count locally
      set({
        playlists: get().playlists.map((p) =>
          p.id === playlistId ? { ...p, track_count: p.track_count + 1 } : p,
        ),
      });
    } catch (err) {
      console.error('Failed to add track to playlist:', err);
    }
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    try {
      await api.delete(`/playlists/${playlistId}/tracks/${trackId}`);
      set({
        playlists: get().playlists.map((p) =>
          p.id === playlistId ? { ...p, track_count: Math.max(0, p.track_count - 1) } : p,
        ),
      });
    } catch (err) {
      console.error('Failed to remove track from playlist:', err);
    }
  },

  fetchPlaylistTracks: async (playlistId) => {
    try {
      const { data } = await api.get(`/playlists/${playlistId}`);
      return data.tracks || [];
    } catch (err) {
      console.error('Failed to fetch playlist tracks:', err);
      return [];
    }
  },

  // ─── Favorites ─────────────────────────────────────────────

  fetchFavorites: async () => {
    set({ isLoadingFavorites: true });
    try {
      const { data } = await api.get('/library/favorites');
      set({ favorites: data.favorites || [] });
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
    } finally {
      set({ isLoadingFavorites: false });
    }
  },

  toggleFavorite: async (track) => {
    const { favorites } = get();
    const existing = favorites.find((f) => f.video_id === track.videoId);

    if (existing) {
      // Remove
      set({ favorites: favorites.filter((f) => f.video_id !== track.videoId) });
      try {
        await api.delete(`/library/favorites/${track.videoId}`);
      } catch (err) {
        // Revert on failure
        set({ favorites: get().favorites.concat(existing) });
        console.error('Failed to remove favorite:', err);
      }
    } else {
      // Add (optimistic)
      const optimistic: Favorite = {
        id: `temp-${Date.now()}`,
        video_id: track.videoId,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        thumbnail_url: track.thumbnail,
        created_at: new Date().toISOString(),
      };
      set({ favorites: [optimistic, ...favorites] });
      try {
        await api.post('/library/favorites', {
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          duration: track.duration,
          thumbnailUrl: track.thumbnail,
        });
      } catch (err) {
        // Revert on failure
        set({ favorites: get().favorites.filter((f) => f.video_id !== track.videoId) });
        console.error('Failed to add favorite:', err);
      }
    }
  },

  isFavorite: (videoId) => {
    return get().favorites.some((f) => f.video_id === videoId);
  },

  // ─── History ───────────────────────────────────────────────

  fetchHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const { data } = await api.get('/library/history');
      set({ history: data.history || [] });
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      set({ isLoadingHistory: false });
    }
  },

  recordHistory: async (track, playDuration) => {
    try {
      await api.post('/library/history', {
        videoId: track.videoId,
        title: track.title,
        artist: track.artist,
        duration: track.duration,
        thumbnailUrl: track.thumbnail,
        playDuration,
      });
    } catch (err) {
      console.error('Failed to record history:', err);
    }
  },
}));
