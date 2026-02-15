import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event,
  State,
} from 'react-native-track-player';
import { usePlayerStore } from '../stores/player';

export async function setupPlayer() {
  let isSetup = false;
  try {
    await TrackPlayer.getActiveTrack();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
    isSetup = true;
  }

  if (isSetup) {
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 1,
    });

    await TrackPlayer.setRepeatMode(RepeatMode.Off);
  }

  return isSetup;
}

export async function playbackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, event => {
    TrackPlayer.seekTo(event.position);
  });
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  // Sync playback state back to Zustand store
  TrackPlayer.addEventListener(Event.PlaybackState, event => {
    const store = usePlayerStore.getState();
    if (event.state === State.Playing) {
      store.setIsPlaying(true);
    } else if (
      event.state === State.Paused ||
      event.state === State.Stopped ||
      event.state === State.None
    ) {
      store.setIsPlaying(false);
    }
  });

  TrackPlayer.addEventListener(
    Event.PlaybackActiveTrackChanged,
    async event => {
      if (event.track) {
        const store = usePlayerStore.getState();
        const queue = store.queue;
        const match = queue.find(t => t.videoId === event.track?.id);
        if (match) {
          usePlayerStore.setState({ currentTrack: match });
        }
      }
    },
  );
}
