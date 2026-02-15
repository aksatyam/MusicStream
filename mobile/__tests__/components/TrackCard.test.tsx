import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TrackCard from '../../src/components/TrackCard';

const mockTrack = {
  videoId: 'test-123',
  title: 'Test Song',
  artist: 'Test Artist',
  duration: 185,
  thumbnail: 'http://thumb.jpg',
};

describe('TrackCard', () => {
  it('should render track info', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TrackCard track={mockTrack} onPress={onPress} />,
    );

    expect(getByText('Test Song')).toBeTruthy();
    expect(getByText('Test Artist')).toBeTruthy();
    expect(getByText('3:05')).toBeTruthy();
  });

  it('should call onPress with track when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <TrackCard track={mockTrack} onPress={onPress} />,
    );

    fireEvent.press(getByText('Test Song'));
    expect(onPress).toHaveBeenCalledWith(mockTrack);
  });

  it('should call onLongPress with track when long pressed', () => {
    const onPress = jest.fn();
    const onLongPress = jest.fn();
    const { getByText } = render(
      <TrackCard track={mockTrack} onPress={onPress} onLongPress={onLongPress} />,
    );

    fireEvent(getByText('Test Song'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith(mockTrack);
  });

  it('should format duration correctly', () => {
    const shortTrack = { ...mockTrack, duration: 62 };
    const { getByText } = render(
      <TrackCard track={shortTrack} onPress={jest.fn()} />,
    );

    expect(getByText('1:02')).toBeTruthy();
  });

  it('should handle zero duration', () => {
    const zeroTrack = { ...mockTrack, duration: 0 };
    const { getByText } = render(
      <TrackCard track={zeroTrack} onPress={jest.fn()} />,
    );

    expect(getByText('0:00')).toBeTruthy();
  });
});
