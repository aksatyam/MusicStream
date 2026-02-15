import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../stores/auth';
import { usePlayerStore } from '../stores/player';
import { useLibraryStore } from '../stores/library';
import { api } from '../services/api';
import TrackCard from '../components/TrackCard';
import AddToPlaylistSheet from '../components/AddToPlaylistSheet';
import { SectionSkeleton } from '../components/SkeletonLoader';
import { toast } from '../components/Toast';
import { colors, spacing, typography, iconSizes } from '../theme';
import type { TrackMeta } from '../types';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const user = useAuthStore(s => s.user);
  const { playTrack, currentTrack } = usePlayerStore();
  const { history, fetchHistory } = useLibraryStore();
  const [trending, setTrending] = useState<TrackMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackMeta | null>(null);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);

  const fetchTrending = useCallback(async () => {
    try {
      const { data } = await api.get('/trending');
      const tracks: TrackMeta[] = (data.results || []).map((item: any) => ({
        videoId: item.videoId || item.url?.split('=').pop() || '',
        title: item.title || 'Unknown',
        artist: item.uploaderName || item.artist || 'Unknown Artist',
        duration: item.duration || 0,
        thumbnail: item.thumbnail || item.thumbnailUrl || '',
      }));
      setTrending(tracks);
    } catch (err) {
      console.error('Failed to fetch trending:', err);
      toast.error('Could not load trending tracks');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
    fetchHistory();
  }, [fetchTrending, fetchHistory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrending();
    fetchHistory();
  }, [fetchTrending, fetchHistory]);

  const handleTrackPress = useCallback(
    (track: TrackMeta) => {
      playTrack(track);
    },
    [playTrack],
  );

  const handleTrackLongPress = useCallback((track: TrackMeta) => {
    setSelectedTrack(track);
    setShowPlaylistSheet(true);
  }, []);

  // Convert history entries to TrackMeta
  const recentTracks: TrackMeta[] = history.slice(0, 10).map(h => ({
    videoId: h.video_id,
    title: h.title,
    artist: h.artist || 'Unknown Artist',
    duration: h.duration || 0,
    thumbnail: h.thumbnail_url || '',
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.displayName}</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Ionicons
              name="notifications-outline"
              size={iconSizes.md}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <>
            <SectionSkeleton />
            <SectionSkeleton />
          </>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="trending-up"
                  size={iconSizes.sm}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>Trending</Text>
              </View>
              {trending.length > 0 ? (
                trending
                  .slice(0, 20)
                  .map(track => (
                    <TrackCard
                      key={track.videoId}
                      track={track}
                      onPress={handleTrackPress}
                      onLongPress={handleTrackLongPress}
                      isPlaying={currentTrack?.videoId === track.videoId}
                    />
                  ))
              ) : (
                <Text style={styles.placeholder}>
                  Trending tracks will appear here
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="time-outline"
                  size={iconSizes.sm}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>Recently Played</Text>
              </View>
              {recentTracks.length > 0 ? (
                recentTracks.map(track => (
                  <TrackCard
                    key={`history-${track.videoId}`}
                    track={track}
                    onPress={handleTrackPress}
                    onLongPress={handleTrackLongPress}
                    isPlaying={currentTrack?.videoId === track.videoId}
                  />
                ))
              ) : (
                <Text style={styles.placeholder}>
                  Your listening history will appear here
                </Text>
              )}
            </View>
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <AddToPlaylistSheet
        visible={showPlaylistSheet}
        track={selectedTrack}
        onClose={() => setShowPlaylistSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    ...typography.h2,
    color: colors.textSecondary,
  },
  name: {
    ...typography.h1,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: 8,
    textAlign: 'center',
  },
});
