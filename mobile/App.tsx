import React, { useEffect } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Navigation from './src/app/Navigation';
import ErrorBoundary from './src/components/ErrorBoundary';
import ToastContainer from './src/components/Toast';
import NetworkGuard from './src/components/NetworkGuard';
import { useAuthStore } from './src/stores/auth';
import { usePlayerStore } from './src/stores/player';
import { setupPlayer } from './src/services/player';

function App() {
  useEffect(() => {
    useAuthStore.getState().hydrate();

    setupPlayer().then(isSetup => {
      usePlayerStore.getState().setPlayerReady(isSetup);
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#121212" />
          <Navigation />
          <ToastContainer />
          <NetworkGuard />
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default App;
