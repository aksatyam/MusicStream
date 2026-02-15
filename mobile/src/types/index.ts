export interface TrackMeta {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

export interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

export interface AudioStream {
  url: string;
  mimeType: string;
  bitrate: number;
  codec: string;
  quality: string;
}

export interface TrackDetail extends TrackMeta {
  audioStreams: AudioStream[];
}
