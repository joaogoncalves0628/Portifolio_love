import { useVideoPlayer, VideoView } from 'expo-video';
import { Image, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import type { MemoryMedia } from '../context/MemoryContext';

type ContentFit = 'cover' | 'contain';

type VideoMediaProps = {
  uri: string;
  style: StyleProp<ViewStyle>;
  contentFit: ContentFit;
};

function VideoMedia({ uri, style, contentFit }: VideoMediaProps) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.muted = false;
  });

  return <VideoView player={player} style={style} contentFit={contentFit} nativeControls />;
}

type MemoryMediaViewProps = {
  media: MemoryMedia;
  imageStyle: StyleProp<ImageStyle>;
  videoStyle: StyleProp<ViewStyle>;
  resizeMode?: ContentFit;
};

export function MemoryMediaView({
  media,
  imageStyle,
  videoStyle,
  resizeMode = 'cover',
}: MemoryMediaViewProps) {
  if (media.type === 'video') {
    return <VideoMedia uri={media.uri} style={videoStyle} contentFit={resizeMode} />;
  }

  return <Image source={{ uri: media.uri }} style={imageStyle} resizeMode={resizeMode} />;
}
