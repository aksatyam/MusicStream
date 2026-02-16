import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Modal, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../stores/auth';
import { usePlayerStore } from '../stores/player';
import { colors, shadows } from '../theme';

// Screens
import LoginScreen from '../screens/Login';
import RegisterScreen from '../screens/Register';
import HomeScreen from '../screens/Home';
import SearchScreen from '../screens/Search';
import LibraryScreen from '../screens/Library';
import PlaylistDetailScreen from '../screens/PlaylistDetail';
import LikedSongsScreen from '../screens/LikedSongs';
import DownloadsScreen from '../screens/Downloads';
import SettingsScreen from '../screens/Settings';
import NowPlayingScreen from '../screens/NowPlaying';

// Components
import MiniPlayer from '../components/MiniPlayer';

// Types
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type LibraryStackParamList = {
  LibraryHome: undefined;
  PlaylistDetail: { playlistId: string; playlistName: string };
  LikedSongs: undefined;
  Downloads: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  Settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

const appTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function LibraryNavigator() {
  return (
    <LibraryStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <LibraryStack.Screen name="LibraryHome" component={LibraryScreen} />
      <LibraryStack.Screen
        name="PlaylistDetail"
        component={PlaylistDetailScreen}
      />
      <LibraryStack.Screen name="LikedSongs" component={LikedSongsScreen} />
      <LibraryStack.Screen name="Downloads" component={DownloadsScreen} />
    </LibraryStack.Navigator>
  );
}

const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
  Home: { focused: 'home', unfocused: 'home-outline' },
  Search: { focused: 'search', unfocused: 'search-outline' },
  Library: { focused: 'library', unfocused: 'library-outline' },
  Settings: { focused: 'settings', unfocused: 'settings-outline' },
};

function MainNavigator() {
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const currentTrack = usePlayerStore(s => s.currentTrack);

  // Close NowPlaying modal when queue is cleared (currentTrack becomes null)
  useEffect(() => {
    if (!currentTrack && showNowPlaying) {
      setShowNowPlaying(false);
    }
  }, [currentTrack, showNowPlaying]);

  return (
    <View style={styles.root}>
      <MainTab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color }) => {
            const iconSet = TAB_ICONS[route.name];
            const iconName = focused ? iconSet.focused : iconSet.unfocused;
            return <Ionicons name={iconName} size={22} color={color} />;
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
            height: 85,
            paddingBottom: 28,
            paddingTop: 10,
            ...shadows.small,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
          },
        })}
      >
        <MainTab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: 'Home' }}
        />
        <MainTab.Screen
          name="Search"
          component={SearchScreen}
          options={{ tabBarLabel: 'Search' }}
        />
        <MainTab.Screen
          name="Library"
          component={LibraryNavigator}
          options={{ tabBarLabel: 'Library' }}
        />
        <MainTab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: 'Settings' }}
        />
      </MainTab.Navigator>

      {/* MiniPlayer sits above tab bar */}
      {currentTrack && (
        <View style={styles.miniPlayerContainer}>
          <MiniPlayer onPress={() => setShowNowPlaying(true)} />
        </View>
      )}

      {/* Full-screen Now Playing modal */}
      <Modal
        visible={showNowPlaying}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowNowPlaying(false)}
      >
        <NowPlayingScreen onClose={() => setShowNowPlaying(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 85,
    left: 0,
    right: 0,
  },
});

export default function Navigation() {
  const { isAuthenticated, isGuest, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const showMain = isAuthenticated || isGuest;

  return (
    <NavigationContainer theme={appTheme}>
      {showMain ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
