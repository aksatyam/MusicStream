import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../theme';

function SkeletonPulse({ style }: { style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.bone, style, { opacity }]} />;
}

export function TrackSkeleton() {
  return (
    <View style={styles.trackRow}>
      <SkeletonPulse style={styles.thumbnail} />
      <View style={styles.textGroup}>
        <SkeletonPulse style={styles.titleBone} />
        <SkeletonPulse style={styles.subtitleBone} />
      </View>
      <SkeletonPulse style={styles.durationBone} />
    </View>
  );
}

export function TrackListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <TrackSkeleton key={i} />
      ))}
    </View>
  );
}

export function SectionSkeleton() {
  return (
    <View style={styles.section}>
      <SkeletonPulse style={styles.sectionTitle} />
      <TrackListSkeleton count={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  textGroup: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  titleBone: {
    height: 14,
    width: '80%',
    marginBottom: 6,
  },
  subtitleBone: {
    height: 12,
    width: '50%',
  },
  durationBone: {
    height: 12,
    width: 32,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    height: 18,
    width: 120,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
});
