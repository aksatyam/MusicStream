import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/player';
import { useLibraryStore } from '../stores/library';
import TrackCard from '../components/TrackCard';
import { colors, spacing, typography } from '../theme';
import type { TrackMeta } from '../types';

interface LikedSongsProps {
  navigation: any;
}

export default function LikedSongsScreen({ navigation }: LikedSongsProps) {
  const { playTrack, currentTrack } = usePlayerStore();
  const { favorites, isLoadingFavorites, fetchFavorites } = useLibraryStore();

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleTrackPress = useCallback(
    (track: TrackMeta) => {
      playTrack(track);
    },
    [playTrack],
  );

  const toTrackMeta = (item: any): TrackMeta => ({
    videoId: item.video_id,
    title: item.title,
    artist: item.artist || 'Unknown Artist',
    duration: item.duration || 0,
    thumbnail: item.thumbnail_url || '',
  });

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const track = toTrackMeta(item);
      return (
        <TrackCard
          track={track}
          onPress={handleTrackPress}
          isPlaying={currentTrack?.videoId === track.videoId}
        />
      );
    },
    [handleTrackPress, currentTrack],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Liked Songs</Text>
        <Text style={styles.count}>{favorites.length} songs</Text>
      </View>

      {isLoadingFavorites ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : favorites.length > 0 ? (
        <FlatList
          data={favorites}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.empty}>No liked songs yet</Text>
          <Text style={styles.emptyHint}>
            Tap the heart icon on any track to save it here
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backBtn: {
    marginBottom: spacing.sm,
  },
  backText: {
    color: colors.text,
    fontSize: 24,
  },
  title: {
    ...typography.h1,
  },
  count: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  empty: {
    ...typography.h3,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyHint: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 80,
  },
});
