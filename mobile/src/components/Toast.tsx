import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { create } from 'zustand';
import { colors, spacing, typography, borderRadius } from '../theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

interface ToastState {
  messages: ToastMessage[];
  show: (text: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  messages: [],
  show: (text, type = 'info') => {
    const id = ++toastId;
    set({ messages: [...get().messages, { id, text, type }] });
    setTimeout(() => get().dismiss(id), 3000);
  },
  dismiss: (id) => {
    set({ messages: get().messages.filter((m) => m.id !== id) });
  },
}));

// Convenience function for use outside components
export const toast = {
  success: (text: string) => useToastStore.getState().show(text, 'success'),
  error: (text: string) => useToastStore.getState().show(text, 'error'),
  info: (text: string) => useToastStore.getState().show(text, 'info'),
};

function ToastItem({ message }: { message: ToastMessage }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 2700);

    return () => clearTimeout(timer);
  }, [opacity, translateY]);

  const bgColor =
    message.type === 'success'
      ? colors.success
      : message.type === 'error'
        ? colors.error
        : colors.surfaceLight;

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: bgColor, opacity, transform: [{ translateY }] },
      ]}>
      <Text style={styles.toastText}>{message.text}</Text>
    </Animated.View>
  );
}

export default function ToastContainer() {
  const messages = useToastStore((s) => s.messages);

  if (messages.length === 0) return null;

  return (
    <Animated.View style={styles.container} pointerEvents="none">
      {messages.map((msg) => (
        <ToastItem key={msg.id} message={msg} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toastText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
});
