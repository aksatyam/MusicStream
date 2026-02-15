import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePlayerStore } from '../stores/player';
import { useLibraryStore } from '../stores/library';
import QueueView from '../components/QueueView';
import AddToPlaylistSheet from '../components/AddToPlaylistSheet';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  iconSizes,
} from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = SCREEN_WIDTH - spacing.lg * 4;

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface NowPlayingProps {
  onClose: () => void;
}

export default function NowPlayingScreen({ onClose }: NowPlayingProps) {
  const {
    currentTrack,
    isPlaying,
    togglePlayPause,
    playNext,
    playPrevious,
    playTrack,
  } = usePlayerStore();
  const { isFavorite, toggleFavorite } = useLibraryStore();
  const progress = useProgress(1000);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [isRepeatOn, setIsRepeatOn] = useState(false);

  if (!currentTrack) return null;

  const handleSeekStart = () => setIsSeeking(true);
  const handleSeekChange = (value: number) => setSeekValue(value);
  const handleSeekComplete = async (value: number) => {
    await TrackPlayer.seekTo(value);
    setIsSeeking(false);
  };

  const displayPosition = isSeeking ? seekValue : progress.position;

  if (showQueue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowQueue(false)}
            style={styles.closeButton}
          >
            <Ionicons
              name="chevron-back"
              size={iconSizes.md}
              color={colors.text}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QUEUE</Text>
          <View style={styles.closeButton} />
        </View>
        <QueueView
          onTrackPress={track => {
            playTrack(track);
            setShowQueue(false);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons
            name="chevron-down"
            size={iconSizes.md}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOW PLAYING</Text>
        <TouchableOpacity
          onPress={() => setShowQueue(true)}
          style={styles.closeButton}
        >
          <Ionicons name="list" size={iconSizes.md} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.artworkContainer}>
        <Image
          source={{ uri: currentTrack.thumbnail }}
          style={styles.artwork}
        />
      </View>

      <View style={styles.trackInfo}>
        <View style={styles.trackInfoRow}>
          <View style={styles.trackInfoText}>
            <Text style={styles.trackTitle} numberOfLines={2}>
              {currentTrack.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => toggleFavorite(currentTrack)}
            style={styles.heartBtn}
          >
            <Ionicons
              name={
                isFavorite(currentTrack.videoId) ? 'heart' : 'heart-outline'
              }
              size={26}
              color={
                isFavorite(currentTrack.videoId)
                  ? colors.primary
                  : colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          value={displayPosition}
          minimumValue={0}
          maximumValue={progress.duration || 1}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.surfaceLight}
          thumbTintColor={colors.primary}
          onSlidingStart={handleSeekStart}
          onValueChange={handleSeekChange}
          onSlidingComplete={handleSeekComplete}
        />
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(progress.duration)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={() => setIsShuffleOn(!isShuffleOn)}
          style={styles.secondaryControlBtn}
        >
          <Ionicons
            name="shuffle-outline"
            size={iconSizes.md}
            color={isShuffleOn ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={playPrevious} style={styles.controlBtn}>
          <Ionicons
            name="play-skip-back"
            size={iconSizes.xl}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={36}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={playNext} style={styles.controlBtn}>
          <Ionicons
            name="play-skip-forward"
            size={iconSizes.xl}
            color={colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsRepeatOn(!isRepeatOn)}
          style={styles.secondaryControlBtn}
        >
          <Ionicons
            name="repeat-outline"
            size={iconSizes.md}
            color={isRepeatOn ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Action row below controls */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={() => setShowAddToPlaylist(true)}
          style={styles.actionBtn}
        >
          <Ionicons
            name="add-circle-outline"
            size={iconSizes.md}
            color={colors.textSecondary}
          />
          <Text style={styles.actionLabel}>Add to Playlist</Text>
        </TouchableOpacity>
      </View>

      <AddToPlaylistSheet
        visible={showAddToPlaylist}
        track={currentTrack}
        onClose={() => setShowAddToPlaylist(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.bodySmall,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artworkContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    ...shadows.large,
  },
  trackInfo: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },
  trackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackInfoText: {
    flex: 1,
  },
  trackTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  trackArtist: {
    ...typography.body,
    color: colors.textSecondary,
  },
  heartBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  progressContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  secondaryControlBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtn: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.glow,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  actionBtn: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
