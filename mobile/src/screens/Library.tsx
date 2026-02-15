import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useLibraryStore } from '../stores/library';
import { colors, spacing, typography, borderRadius, iconSizes } from '../theme';

interface LibraryScreenProps {
  navigation: any;
}

export default function LibraryScreen({ navigation }: LibraryScreenProps) {
  const {
    playlists,
    favorites,
    isLoadingPlaylists,
    fetchPlaylists,
    fetchFavorites,
    createPlaylist,
    deletePlaylist,
  } = useLibraryStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPlaylists();
    fetchFavorites();
  }, [fetchPlaylists, fetchFavorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPlaylists(), fetchFavorites()]);
    setRefreshing(false);
  }, [fetchPlaylists, fetchFavorites]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPlaylist(newName.trim(), newDescription.trim() || undefined);
    setNewName('');
    setNewDescription('');
    setShowCreateModal(false);
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlaylist(id),
      },
    ]);
  };

  const renderHeader = () => (
    <View>
      {/* Liked Songs card */}
      <TouchableOpacity
        style={styles.likedCard}
        onPress={() => navigation.navigate('LikedSongs')}>
        <View style={styles.likedIcon}>
          <Ionicons name="heart" size={iconSizes.md} color={colors.text} />
        </View>
        <View style={styles.likedInfo}>
          <Text style={styles.likedTitle}>Liked Songs</Text>
          <Text style={styles.likedCount}>{favorites.length} songs</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Downloads card */}
      <TouchableOpacity
        style={styles.likedCard}
        onPress={() => navigation.navigate('Downloads')}>
        <View style={[styles.likedIcon, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="download" size={iconSizes.md} color={colors.text} />
        </View>
        <View style={styles.likedInfo}>
          <Text style={styles.likedTitle}>Downloads</Text>
          <Text style={styles.likedCount}>Offline music</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Playlists header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Playlists</Text>
        <TouchableOpacity
          style={styles.addBtnContainer}
          onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={iconSizes.sm} color={colors.primary} />
          <Text style={styles.addBtn}>New</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPlaylist = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.playlistItem}
      onPress={() =>
        navigation.navigate('PlaylistDetail', {
          playlistId: item.id,
          playlistName: item.name,
        })
      }
      onLongPress={() => handleDeletePlaylist(item.id, item.name)}>
      <View style={styles.playlistCover}>
        <Ionicons name="musical-notes" size={22} color={colors.textMuted} />
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.playlistMeta}>
          {item.track_count || 0} tracks
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Library</Text>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={renderPlaylist}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !isLoadingPlaylists ? (
            <View style={styles.emptyPlaylists}>
              <Text style={styles.emptyText}>No playlists yet</Text>
              <Text style={styles.emptyHint}>Tap "+ New" to create one</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.list}
      />

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, styles.modalInputDesc]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewName('');
                  setNewDescription('');
                }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateBtn, !newName.trim() && styles.modalCreateBtnDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim()}>
                <Text style={styles.modalCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  list: {
    paddingBottom: 80,
  },
  likedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  likedIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  likedTitle: {
    ...typography.body,
    fontWeight: '600',
  },
  likedCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
  },
  addBtnContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addBtn: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  playlistCover: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playlistName: {
    ...typography.body,
    fontWeight: '500',
  },
  playlistMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyPlaylists: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    marginBottom: spacing.lg,
  },
  modalInput: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  modalInputDesc: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  modalCancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  modalCreateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  modalCreateBtnDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    ...typography.button,
  },
});
