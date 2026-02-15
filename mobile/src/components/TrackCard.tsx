import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, spacing, typography, borderRadius, shadows, iconSizes } from '../theme';
import type { TrackMeta } from '../types';

interface TrackCardProps {
  track: TrackMeta;
  onPress: (track: TrackMeta) => void;
  onLongPress?: (track: TrackMeta) => void;
  isPlaying?: boolean;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function TrackCard({
  track,
  onPress,
  onLongPress,
  isPlaying,
}: TrackCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isPlaying && styles.containerActive]}
      onPress={() => onPress(track)}
      onLongPress={() => onLongPress?.(track)}
      activeOpacity={0.7}>
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: track.thumbnail }} style={styles.thumbnail} />
        {isPlaying && (
          <View style={styles.playingIndicator}>
            <Ionicons name="equalizer-outline" size={iconSizes.sm} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, isPlaying && styles.titleActive]} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      <Text style={styles.duration}>{formatDuration(track.duration)}</Text>

      <TouchableOpacity
        style={styles.moreBtn}
        onPress={() => onLongPress?.(track)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="ellipsis-vertical" size={iconSizes.sm} color={colors.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  containerActive: {
    backgroundColor: colors.surfaceLight,
    ...shadows.small,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.background,
    borderRadius: borderRadius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.body,
    fontWeight: '500',
  },
  titleActive: {
    color: colors.primary,
  },
  artist: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  duration: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  moreBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
});
