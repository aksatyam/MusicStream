import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePlayerStore } from '../stores/player';
import { useLibraryStore } from '../stores/library';
import TrackCard from '../components/TrackCard';
import { colors, spacing, typography } from '../theme';
import type { TrackMeta } from '../types';

interface PlaylistDetailProps {
  route: { params: { playlistId: string; playlistName: string } };
  navigation: any;
}

export default function PlaylistDetailScreen({
  route,
  navigation,
}: PlaylistDetailProps) {
  const { playlistId, playlistName } = route.params;
  const { playTrack, currentTrack } = usePlayerStore();
  const { fetchPlaylistTracks, removeTrackFromPlaylist } = useLibraryStore();
  const [tracks, setTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTracks = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchPlaylistTracks(playlistId);
    setTracks(result);
    setIsLoading(false);
  }, [playlistId, fetchPlaylistTracks]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const handleTrackPress = useCallback(
    (track: TrackMeta) => {
      playTrack(track);
    },
    [playTrack],
  );

  const handleTrackLongPress = useCallback(
    (track: any) => {
      Alert.alert(
        'Remove Track',
        `Remove "${track.title}" from this playlist?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeTrackFromPlaylist(playlistId, track.id);
              setTracks(prev => prev.filter(t => t.id !== track.id));
            },
          },
        ],
      );
    },
    [playlistId, removeTrackFromPlaylist],
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
          onLongPress={() => handleTrackLongPress(item)}
          isPlaying={currentTrack?.videoId === track.videoId}
        />
      );
    },
    [handleTrackPress, handleTrackLongPress, currentTrack],
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
        <Text style={styles.title} numberOfLines={1}>
          {playlistName}
        </Text>
        <Text style={styles.trackCount}>{tracks.length} tracks</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tracks.length > 0 ? (
        <FlatList
          data={tracks}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.empty}>No tracks in this playlist yet</Text>
          <Text style={styles.emptyHint}>
            Search for music and add tracks to this playlist
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
  trackCount: {
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
