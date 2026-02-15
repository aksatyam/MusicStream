/**
 * @format
 */

import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { playbackService } from './src/services/player';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);

// Register the playback service for background audio
TrackPlayer.registerPlaybackService(() => playbackService);
