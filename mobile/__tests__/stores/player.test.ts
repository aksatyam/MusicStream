import TrackPlayer from 'react-native-track-player';

// Mock the api module
jest.mock('../../src/services/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({
      data: {
        audioStreams: [
          { url: 'http://audio.test/stream.opus', mimeType: 'audio/webm; codecs="opus"', bitrate: 128000 },
          { url: 'http://audio.test/stream.m4a', mimeType: 'audio/mp4', bitrate: 256000 },
        ],
      },
    }),
  },
}));

import { usePlayerStore } from '../../src/stores/player';

const mockTrack = {
  videoId: 'test-123',
  title: 'Test Song',
  artist: 'Test Artist',
  duration: 240,
  thumbnail: 'http://thumb.jpg',
};

describe('Player Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.setState({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      isLoading: false,
      isPlayerReady: false,
    });
  });

  it('should have correct initial state', () => {
    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.isPlaying).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.isPlayerReady).toBe(false);
  });

  it('should set player ready', () => {
    usePlayerStore.getState().setPlayerReady(true);
    expect(usePlayerStore.getState().isPlayerReady).toBe(true);
  });

  it('should play a track', async () => {
    await usePlayerStore.getState().playTrack(mockTrack);

    const state = usePlayerStore.getState();
    expect(state.currentTrack).toEqual(mockTrack);
    expect(state.isPlaying).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.queue).toContainEqual(mockTrack);
    expect(TrackPlayer.reset).toHaveBeenCalled();
    expect(TrackPlayer.add).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'test-123',
        title: 'Test Song',
        artist: 'Test Artist',
      }),
    );
    expect(TrackPlayer.play).toHaveBeenCalled();
  });

  it('should not duplicate track in queue', async () => {
    await usePlayerStore.getState().playTrack(mockTrack);
    await usePlayerStore.getState().playTrack(mockTrack);

    expect(usePlayerStore.getState().queue).toHaveLength(1);
  });

  it('should add track to queue', async () => {
    await usePlayerStore.getState().addToQueue(mockTrack);

    const state = usePlayerStore.getState();
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0]).toEqual(mockTrack);
    expect(TrackPlayer.add).toHaveBeenCalled();
  });

  it('should not add duplicate to queue', async () => {
    await usePlayerStore.getState().addToQueue(mockTrack);
    await usePlayerStore.getState().addToQueue(mockTrack);

    expect(usePlayerStore.getState().queue).toHaveLength(1);
  });

  it('should call skipToNext on playNext', async () => {
    await usePlayerStore.getState().playNext();
    expect(TrackPlayer.skipToNext).toHaveBeenCalled();
  });

  it('should call skipToPrevious on playPrevious', async () => {
    await usePlayerStore.getState().playPrevious();
    expect(TrackPlayer.skipToPrevious).toHaveBeenCalled();
  });

  it('should toggle play/pause', async () => {
    (TrackPlayer.getPlaybackState as jest.Mock).mockResolvedValueOnce({ state: 'playing' });

    await usePlayerStore.getState().togglePlayPause();
    expect(TrackPlayer.pause).toHaveBeenCalled();
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('should set isPlaying', () => {
    usePlayerStore.getState().setIsPlaying(true);
    expect(usePlayerStore.getState().isPlaying).toBe(true);

    usePlayerStore.getState().setIsPlaying(false);
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('should clear queue', async () => {
    await usePlayerStore.getState().playTrack(mockTrack);
    await usePlayerStore.getState().clearQueue();

    const state = usePlayerStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.isPlaying).toBe(false);
    expect(TrackPlayer.reset).toHaveBeenCalled();
  });
});
