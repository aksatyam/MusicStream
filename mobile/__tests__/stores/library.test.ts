// Mock the api module using closure approach
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockPut = jest.fn();

jest.mock('../../src/services/api', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    delete: (...args: any[]) => mockDelete(...args),
    put: (...args: any[]) => mockPut(...args),
  },
}));

import { useLibraryStore } from '../../src/stores/library';

const mockTrack = {
  videoId: 'test-123',
  title: 'Test Song',
  artist: 'Test Artist',
  duration: 240,
  thumbnail: 'http://thumb.jpg',
};

describe('Library Store', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockDelete.mockReset();
    mockPut.mockReset();
    useLibraryStore.setState({
      playlists: [],
      favorites: [],
      history: [],
      isLoadingPlaylists: false,
      isLoadingFavorites: false,
      isLoadingHistory: false,
    });
  });

  describe('playlists', () => {
    it('should fetch playlists', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          playlists: [
            {
              id: 'p1',
              name: 'My Playlist',
              description: null,
              track_count: 5,
            },
          ],
        },
      });

      await useLibraryStore.getState().fetchPlaylists();

      expect(useLibraryStore.getState().playlists).toHaveLength(1);
      expect(useLibraryStore.getState().playlists[0].name).toBe('My Playlist');
      expect(useLibraryStore.getState().isLoadingPlaylists).toBe(false);
    });

    it('should create a playlist', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          playlist: { id: 'p2', name: 'New Playlist', description: 'desc' },
        },
      });

      const result = await useLibraryStore
        .getState()
        .createPlaylist('New Playlist', 'desc');

      expect(result).toBeTruthy();
      expect(result?.name).toBe('New Playlist');
      expect(useLibraryStore.getState().playlists).toHaveLength(1);
    });

    it('should delete a playlist', async () => {
      useLibraryStore.setState({
        playlists: [
          {
            id: 'p1',
            name: 'Playlist 1',
            description: null,
            cover_image_url: null,
            is_public: false,
            track_count: 0,
            created_at: '',
            updated_at: '',
          },
        ],
      });
      mockDelete.mockResolvedValueOnce({});

      await useLibraryStore.getState().deletePlaylist('p1');

      expect(useLibraryStore.getState().playlists).toHaveLength(0);
    });

    it('should add track to playlist and increment count', async () => {
      useLibraryStore.setState({
        playlists: [
          {
            id: 'p1',
            name: 'Playlist',
            description: null,
            cover_image_url: null,
            is_public: false,
            track_count: 3,
            created_at: '',
            updated_at: '',
          },
        ],
      });
      mockPost.mockResolvedValueOnce({});

      await useLibraryStore.getState().addTrackToPlaylist('p1', mockTrack);

      expect(useLibraryStore.getState().playlists[0].track_count).toBe(4);
    });

    it('should remove track from playlist and decrement count', async () => {
      useLibraryStore.setState({
        playlists: [
          {
            id: 'p1',
            name: 'Playlist',
            description: null,
            cover_image_url: null,
            is_public: false,
            track_count: 3,
            created_at: '',
            updated_at: '',
          },
        ],
      });
      mockDelete.mockResolvedValueOnce({});

      await useLibraryStore.getState().removeTrackFromPlaylist('p1', 'track-1');

      expect(useLibraryStore.getState().playlists[0].track_count).toBe(2);
    });
  });

  describe('favorites', () => {
    it('should fetch favorites', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          favorites: [
            {
              id: 'f1',
              video_id: 'vid-1',
              title: 'Fav Song',
              artist: 'Artist',
              duration: 200,
              thumbnail_url: '',
            },
          ],
        },
      });

      await useLibraryStore.getState().fetchFavorites();

      expect(useLibraryStore.getState().favorites).toHaveLength(1);
      expect(useLibraryStore.getState().isLoadingFavorites).toBe(false);
    });

    it('should add favorite optimistically', async () => {
      mockPost.mockResolvedValueOnce({});

      await useLibraryStore.getState().toggleFavorite(mockTrack);

      const state = useLibraryStore.getState();
      expect(state.favorites).toHaveLength(1);
      expect(state.favorites[0].video_id).toBe('test-123');
    });

    it('should remove favorite optimistically', async () => {
      useLibraryStore.setState({
        favorites: [
          {
            id: 'f1',
            video_id: 'test-123',
            title: 'Test Song',
            artist: 'Artist',
            duration: 240,
            thumbnail_url: '',
            created_at: '',
          },
        ],
      });
      mockDelete.mockResolvedValueOnce({});

      await useLibraryStore.getState().toggleFavorite(mockTrack);

      expect(useLibraryStore.getState().favorites).toHaveLength(0);
    });

    it('should check isFavorite correctly', () => {
      useLibraryStore.setState({
        favorites: [
          {
            id: 'f1',
            video_id: 'vid-1',
            title: 'Song',
            artist: null,
            duration: null,
            thumbnail_url: null,
            created_at: '',
          },
        ],
      });

      expect(useLibraryStore.getState().isFavorite('vid-1')).toBe(true);
      expect(useLibraryStore.getState().isFavorite('vid-2')).toBe(false);
    });

    it('should revert on add favorite failure', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      await useLibraryStore.getState().toggleFavorite(mockTrack);

      // Should be reverted back to empty after failure
      expect(useLibraryStore.getState().favorites).toHaveLength(0);
    });
  });

  describe('history', () => {
    it('should fetch history', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          history: [
            {
              id: 'h1',
              video_id: 'vid-1',
              title: 'Listened Song',
              artist: 'Artist',
              played_at: '',
              play_duration: 120,
            },
          ],
        },
      });

      await useLibraryStore.getState().fetchHistory();

      expect(useLibraryStore.getState().history).toHaveLength(1);
      expect(useLibraryStore.getState().isLoadingHistory).toBe(false);
    });

    it('should record history', async () => {
      mockPost.mockResolvedValueOnce({});

      await useLibraryStore.getState().recordHistory(mockTrack, 120);

      expect(mockPost).toHaveBeenCalledWith(
        '/library/history',
        expect.objectContaining({
          videoId: 'test-123',
          playDuration: 120,
        }),
      );
    });
  });
});
