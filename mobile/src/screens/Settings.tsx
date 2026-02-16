import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../stores/auth';
import { usePlayerStore } from '../stores/player';
import { logout } from '../services/auth';
import {
  getDownloadSize,
  formatBytes,
  deleteAllDownloads,
} from '../services/downloads';
import { api } from '../services/api';
import { toast } from '../components/Toast';
import { colors, spacing, typography, borderRadius, iconSizes } from '../theme';

export default function SettingsScreen() {
  const user = useAuthStore(s => s.user);
  const isGuest = useAuthStore(s => s.isGuest);
  const queue = usePlayerStore(s => s.queue);
  const [downloadSize, setDownloadSize] = useState('0 B');
  const [extractorStatus, setExtractorStatus] = useState<string>('Checking...');
  const [extractorColor, setExtractorColor] = useState<string>(
    colors.textMuted,
  );

  useEffect(() => {
    getDownloadSize().then(size => setDownloadSize(formatBytes(size)));

    api
      .get('/health')
      .then(({ data }) => {
        const services = data.services || {};
        const allHealthy = services.database && services.redis;
        setExtractorStatus(allHealthy ? 'All Healthy' : 'Degraded');
        setExtractorColor(allHealthy ? colors.success : colors.warning);
      })
      .catch(() => {
        setExtractorStatus('Unreachable');
        setExtractorColor(colors.error);
      });
  }, []);

  const handleClearDownloads = () => {
    Alert.alert(
      'Clear Downloads',
      `Delete all downloaded tracks (${downloadSize})? They can be re-downloaded later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllDownloads();
            setDownloadSize('0 B');
            toast.success('Downloads cleared');
          },
        },
      ],
    );
  };

  const handleClearQueue = () => {
    usePlayerStore.getState().clearQueue();
    toast.info('Queue cleared');
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          usePlayerStore.getState().clearQueue();
          logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile */}
        {isGuest ? (
          <View style={styles.profile}>
            <View
              style={[styles.avatar, { backgroundColor: colors.textMuted }]}
            >
              <Ionicons name="person-outline" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>Guest</Text>
              <Text style={styles.email}>Sign in to sync your data</Text>
            </View>
          </View>
        ) : (
          <View style={styles.profile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.displayName?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{user?.displayName}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
        )}

        {/* Playback */}
        <Text style={styles.sectionLabel}>Playback</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="musical-note-outline"
                size={iconSizes.sm}
                color={colors.textSecondary}
              />
              <Text style={styles.rowText}>Audio Quality</Text>
            </View>
            <Text style={styles.rowValue}>High (256kbps)</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="list-outline"
                size={iconSizes.sm}
                color={colors.textSecondary}
              />
              <Text style={styles.rowText}>Queue</Text>
            </View>
            <TouchableOpacity
              onPress={handleClearQueue}
              style={styles.rowRight}
            >
              <Text style={[styles.rowValue, { color: colors.primary }]}>
                {queue.length} tracks · Clear
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Storage */}
        <Text style={styles.sectionLabel}>Storage</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="download-outline"
                size={iconSizes.sm}
                color={colors.textSecondary}
              />
              <Text style={styles.rowText}>Downloaded Music</Text>
            </View>
            <Text style={styles.rowValue}>{downloadSize}</Text>
          </View>
          <TouchableOpacity style={styles.row} onPress={handleClearDownloads}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="trash-outline"
                size={iconSizes.sm}
                color={colors.textSecondary}
              />
              <Text style={styles.rowText}>Clear All Downloads</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.error }]}>
                Delete
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* System */}
        <Text style={styles.sectionLabel}>System</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="moon-outline"
                size={iconSizes.sm}
                color={colors.textSecondary}
              />
              <Text style={styles.rowText}>Theme</Text>
            </View>
            <Text style={styles.rowValue}>Dark</Text>
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="pulse-outline"
                size={iconSizes.sm}
                color={colors.textSecondary}
              />
              <Text style={styles.rowText}>Extractor Status</Text>
            </View>
            <Text style={[styles.rowValue, { color: extractorColor }]}>
              {extractorStatus}
            </Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <View style={styles.rowLeft}>
              <Ionicons
                name="information-circle-outline"
                size={iconSizes.sm}
                color={colors.textSecondary}
              />
              <Text style={styles.rowText}>Version</Text>
            </View>
            <Text style={styles.rowValue}>0.0.1</Text>
          </View>
        </View>

        {/* Sign Out / Sign In */}
        {isGuest ? (
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              usePlayerStore.getState().clearQueue();
              logout();
            }}
          >
            <Ionicons
              name="log-in-outline"
              size={iconSizes.sm}
              color={colors.text}
            />
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons
              name="log-out-outline"
              size={iconSizes.sm}
              color={colors.error}
            />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    ...typography.h3,
  },
  email: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  rowText: {
    ...typography.body,
  },
  rowValue: {
    ...typography.bodySmall,
  },
  logoutButton: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  logoutText: {
    ...typography.button,
    color: colors.error,
  },
  signInText: {
    ...typography.button,
    color: colors.text,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  bottomSpacer: {
    height: 80,
  },
});
