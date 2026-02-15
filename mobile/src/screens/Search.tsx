import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { api } from '../services/api';
import { usePlayerStore } from '../stores/player';
import TrackCard from '../components/TrackCard';
import AddToPlaylistSheet from '../components/AddToPlaylistSheet';
import { TrackListSkeleton } from '../components/SkeletonLoader';
import { toast } from '../components/Toast';
import { colors, spacing, typography, borderRadius, iconSizes } from '../theme';
import type { TrackMeta } from '../types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrackMeta[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackMeta | null>(null);
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { playTrack, currentTrack, addToQueue } = usePlayerStore();

  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const { data } = await api.get('/search', { params: { q: q.trim() } });
      const tracks: TrackMeta[] = (data.results || []).map((item: any) => ({
        videoId: item.videoId || item.url?.split('=').pop() || '',
        title: item.title || 'Unknown',
        artist: item.uploaderName || item.artist || 'Unknown Artist',
        duration: item.duration || 0,
        thumbnail: item.thumbnail || item.thumbnailUrl || '',
      }));
      setResults(tracks);
    } catch (err) {
      console.error('Search failed:', err);
      toast.error('Search failed. Check your connection.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => performSearch(text), 500);
    },
    [performSearch],
  );

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
  }, []);

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

  const renderItem = useCallback(
    ({ item }: { item: TrackMeta }) => (
      <TrackCard
        track={item}
        onPress={handleTrackPress}
        onLongPress={handleTrackLongPress}
        isPlaying={currentTrack?.videoId === item.videoId}
      />
    ),
    [handleTrackPress, handleTrackLongPress, currentTrack],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search-outline"
            size={iconSizes.sm}
            color={colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Songs, artists, playlists..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => performSearch(query)}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClearSearch}
              style={styles.clearBtn}
            >
              <Ionicons
                name="close-circle"
                size={iconSizes.sm}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        <TrackListSkeleton count={8} />
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={item => item.videoId}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.centered}>
          <Ionicons
            name="search-outline"
            size={64}
            color={colors.surfaceLight}
            style={styles.emptyIcon}
          />
          <Text style={styles.placeholder}>
            {hasSearched
              ? 'No results found'
              : 'Search for music to get started'}
          </Text>
        </View>
      )}

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
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 12,
    fontSize: 16,
  },
  clearBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  list: {
    paddingBottom: 80,
  },
});
