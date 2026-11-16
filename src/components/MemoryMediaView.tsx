import { useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image as ExpoImage } from 'expo-image';
import { PlayCircle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import type { MemoryMedia } from '../context/MemoryContext';

type ContentFit = 'cover' | 'contain';

type VideoMediaProps = {
  uri: string;
  style: StyleProp<ViewStyle>;
  contentFit: ContentFit;
  deferLoading: boolean;
};

function LoadedVideoMedia({ uri, style, contentFit }: Omit<VideoMediaProps, 'deferLoading'>) {
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.muted = false;
  });

  return <VideoView player={player} style={style} contentFit={contentFit} nativeControls />;
}

function VideoMedia({ uri, style, contentFit, deferLoading }: VideoMediaProps) {
  const [isLoaded, setIsLoaded] = useState(!deferLoading);

  if (!isLoaded) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Carregar vídeo"
        onPress={() => setIsLoaded(true)}
        style={[style, styles.videoPlaceholder]}
      >
        <View style={styles.videoPrompt}>
          <PlayCircle size={38} color="#fff" />
          <Text style={styles.videoPromptText}>Toque para carregar o vídeo</Text>
        </View>
      </Pressable>
    );
  }

  return <LoadedVideoMedia uri={uri} style={style} contentFit={contentFit} />;
}

type MemoryMediaViewProps = {
  media: MemoryMedia;
  imageStyle: StyleProp<ImageStyle>;
  videoStyle: StyleProp<ViewStyle>;
  resizeMode?: ContentFit;
  deferVideoLoading?: boolean;
};

export function MemoryMediaView({
  media,
  imageStyle,
  videoStyle,
  resizeMode = 'cover',
  deferVideoLoading = false,
}: MemoryMediaViewProps) {
  if (media.type === 'video') {
    return (
      <VideoMedia
        uri={media.uri}
        style={videoStyle}
        contentFit={resizeMode}
        deferLoading={deferVideoLoading}
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri: optimizeCloudinaryImage(media.uri) }}
      style={imageStyle}
      contentFit={resizeMode}
      cachePolicy="disk"
      allowDownscaling
      recyclingKey={media.uri}
    />
  );
}

function optimizeCloudinaryImage(uri: string) {
  const uploadPath = '/image/upload/';
  const uploadIndex = uri.indexOf(uploadPath);
  if (!uri.startsWith('https://res.cloudinary.com/') || uploadIndex === -1) {
    return uri;
  }

  const insertionPoint = uploadIndex + uploadPath.length;
  return `${uri.slice(0, insertionPoint)}c_limit,w_1080,f_auto,q_auto/${uri.slice(insertionPoint)}`;
}

const styles = StyleSheet.create({
  videoPlaceholder: {
    backgroundColor: '#1f1114',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPrompt: {
    alignItems: 'center',
    gap: 8,
  },
  videoPromptText: {
    color: '#fff',
    fontSize: 13,
  },
});
