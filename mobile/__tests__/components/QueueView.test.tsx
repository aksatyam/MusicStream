import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QueueView from '../../src/components/QueueView';
import { usePlayerStore } from '../../src/stores/player';

// Mock api for player store
jest.mock('../../src/services/api', () => ({
  api: { get: jest.fn() },
}));

describe('QueueView', () => {
  const mockTrack = {
    videoId: 'test-123',
    title: 'Test Song',
    artist: 'Test Artist',
    duration: 180,
    thumbnail: 'http://thumb.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usePlayerStore.setState({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      isLoading: false,
      isPlayerReady: true,
    });
  });

  it('should show empty state when queue is empty', () => {
    const { getByText } = render(<QueueView onTrackPress={jest.fn()} />);
    expect(getByText('Queue is empty')).toBeTruthy();
  });

  it('should render tracks when queue has items', () => {
    usePlayerStore.setState({
      queue: [
        mockTrack,
        { ...mockTrack, videoId: 'test-456', title: 'Another Song' },
      ],
    });

    const { getByText } = render(<QueueView onTrackPress={jest.fn()} />);

    expect(getByText('Test Song')).toBeTruthy();
    expect(getByText('Another Song')).toBeTruthy();
  });

  it('should show queue header with clear button', () => {
    usePlayerStore.setState({ queue: [mockTrack] });

    const { getByText } = render(<QueueView onTrackPress={jest.fn()} />);

    expect(getByText('Queue')).toBeTruthy();
    expect(getByText('Clear')).toBeTruthy();
  });

  it('should call onTrackPress when a track is pressed', () => {
    usePlayerStore.setState({ queue: [mockTrack] });
    const onTrackPress = jest.fn();

    const { getByText } = render(<QueueView onTrackPress={onTrackPress} />);

    fireEvent.press(getByText('Test Song'));
    expect(onTrackPress).toHaveBeenCalledWith(mockTrack);
  });
});
