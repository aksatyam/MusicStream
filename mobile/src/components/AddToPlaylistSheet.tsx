import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useLibraryStore } from '../stores/library';
import { toast } from './Toast';
import { colors, spacing, typography, borderRadius } from '../theme';
import type { TrackMeta } from '../types';

interface AddToPlaylistSheetProps {
  visible: boolean;
  track: TrackMeta | null;
  onClose: () => void;
}

export default function AddToPlaylistSheet({
  visible,
  track,
  onClose,
}: AddToPlaylistSheetProps) {
  const { playlists, fetchPlaylists, createPlaylist, addTrackToPlaylist } =
    useLibraryStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (visible) fetchPlaylists();
  }, [visible, fetchPlaylists]);

  const handleSelect = async (playlistId: string, playlistName: string) => {
    if (!track) return;
    await addTrackToPlaylist(playlistId, track);
    toast.success(`Added to "${playlistName}"`);
    onClose();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const playlist = await createPlaylist(newName.trim());
    if (playlist && track) {
      await addTrackToPlaylist(playlist.id, track);
      toast.success(`Added to "${playlist.name}"`);
    }
    setNewName('');
    setShowCreate(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          <Text style={styles.title}>Add to Playlist</Text>
          {track && (
            <Text style={styles.trackName} numberOfLines={1}>
              {track.title}
            </Text>
          )}

          {showCreate ? (
            <View style={styles.createSection}>
              <TextInput
                style={styles.input}
                placeholder="New playlist name"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <View style={styles.createButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCreate(false);
                    setNewName('');
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createBtn,
                    !newName.trim() && styles.createBtnDisabled,
                  ]}
                  onPress={handleCreate}
                  disabled={!newName.trim()}
                >
                  <Text style={styles.createBtnText}>Create & Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.newPlaylistRow}
                onPress={() => setShowCreate(true)}
              >
                <Text style={styles.newPlaylistIcon}>+</Text>
                <Text style={styles.newPlaylistText}>New Playlist</Text>
              </TouchableOpacity>

              <FlatList
                data={playlists}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playlistRow}
                    onPress={() => handleSelect(item.id, item.name)}
                  >
                    <View style={styles.playlistIcon}>
                      <Text style={styles.playlistIconText}>♫</Text>
                    </View>
                    <View style={styles.playlistInfo}>
                      <Text style={styles.playlistName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.playlistCount}>
                        {item.track_count || 0} tracks
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.list}
              />
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  trackName: {
    ...typography.bodySmall,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  newPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newPlaylistIcon: {
    fontSize: 24,
    color: colors.primary,
    marginRight: spacing.md,
    width: 36,
    textAlign: 'center',
  },
  newPlaylistText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  playlistIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistIconText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playlistName: {
    ...typography.body,
    fontWeight: '500',
  },
  playlistCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  createSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    color: colors.text,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  createButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  createBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    ...typography.button,
  },
});
