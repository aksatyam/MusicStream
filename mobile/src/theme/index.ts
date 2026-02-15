export const colors = {
  primary: '#1DB954',
  primaryDark: '#1AA34A',
  primaryLight: '#1ED760',
  accent: '#1DB954',
  background: '#121212',
  backgroundLight: '#181818',
  surface: '#1E1E1E',
  surfaceLight: '#282828',
  surfaceElevated: '#2A2A2A',
  card: '#2A2A2A',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#727272',
  border: '#333333',
  borderLight: '#404040',
  error: '#FF4444',
  errorLight: '#FF6B6B',
  success: '#1DB954',
  warning: '#FFAA00',
  info: '#4D9FFF',
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.5)',
  gradientStart: '#1DB954',
  gradientEnd: '#0D8A3E',
  shimmer: '#333333',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: 22, fontWeight: '600' as const, color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.text },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 10, fontWeight: '400' as const, color: colors.textMuted },
  button: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  label: { fontSize: 11, fontWeight: '500' as const, color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 1 },
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 8,
  },
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  xxl: 48,
} as const;
