import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { usePlayerStore } from '../stores/player';
import TrackCard from './TrackCard';
import { colors, spacing, typography, borderRadius } from '../theme';
import type { TrackMeta } from '../types';

interface QueueViewProps {
  onTrackPress: (track: TrackMeta) => void;
}

export default function QueueView({ onTrackPress }: QueueViewProps) {
  const { queue, currentTrack, clearQueue } = usePlayerStore();

  const renderItem = useCallback(
    ({ item, index }: { item: TrackMeta; index: number }) => (
      <TrackCard
        track={item}
        onPress={onTrackPress}
        isPlaying={currentTrack?.videoId === item.videoId}
      />
    ),
    [onTrackPress, currentTrack],
  );

  if (queue.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Queue is empty</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Queue</Text>
        <TouchableOpacity onPress={clearQueue}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={(item) => item.videoId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h3,
  },
  clearText: {
    ...typography.body,
    color: colors.error,
  },
  list: {
    paddingBottom: spacing.xl,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
