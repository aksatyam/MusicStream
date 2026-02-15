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
import TrackCard from '../components/TrackCard';
import {
  getDownloadedTracks,
  deleteDownload,
  deleteAllDownloads,
  getDownloadSize,
  formatBytes,
  type DownloadedTrack,
} from '../services/downloads';
import { colors, spacing, typography } from '../theme';
import type { TrackMeta } from '../types';

interface DownloadsProps {
  navigation: any;
}

export default function DownloadsScreen({ navigation }: DownloadsProps) {
  const { playTrack, currentTrack } = usePlayerStore();
  const [tracks, setTracks] = useState<DownloadedTrack[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadDownloads = useCallback(async () => {
    setIsLoading(true);
    const downloaded = await getDownloadedTracks();
    const size = await getDownloadSize();
    setTracks(downloaded);
    setTotalSize(size);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDownloads();
  }, [loadDownloads]);

  const handleTrackPress = useCallback(
    (track: TrackMeta) => {
      playTrack(track);
    },
    [playTrack],
  );

  const handleDeleteTrack = useCallback(
    (track: DownloadedTrack) => {
      Alert.alert(
        'Delete Download',
        `Remove "${track.title}" from downloads?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteDownload(track.videoId);
              loadDownloads();
            },
          },
        ],
      );
    },
    [loadDownloads],
  );

  const handleDeleteAll = useCallback(() => {
    if (tracks.length === 0) return;
    Alert.alert(
      'Delete All Downloads',
      `Remove all ${
        tracks.length
      } downloaded tracks? This will free ${formatBytes(totalSize)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllDownloads();
            loadDownloads();
          },
        },
      ],
    );
  }, [tracks.length, totalSize, loadDownloads]);

  const renderItem = useCallback(
    ({ item }: { item: DownloadedTrack }) => (
      <TrackCard
        track={item}
        onPress={handleTrackPress}
        onLongPress={() => handleDeleteTrack(item)}
        isPlaying={currentTrack?.videoId === item.videoId}
      />
    ),
    [handleTrackPress, handleDeleteTrack, currentTrack],
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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Downloads</Text>
            <Text style={styles.count}>
              {tracks.length} tracks · {formatBytes(totalSize)}
            </Text>
          </View>
          {tracks.length > 0 && (
            <TouchableOpacity onPress={handleDeleteAll}>
              <Text style={styles.deleteAll}>Delete All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : tracks.length > 0 ? (
        <FlatList
          data={tracks}
          keyExtractor={item => item.videoId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.centered}>
          <Text style={styles.empty}>No downloads yet</Text>
          <Text style={styles.emptyHint}>
            Long-press any track and select "Download" to save for offline
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    ...typography.h1,
  },
  count: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  deleteAll: {
    ...typography.body,
    color: colors.error,
    marginTop: spacing.sm,
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
