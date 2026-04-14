import { Box, Spinner } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Pause, Play } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { getPitchBarHeights } from "../utils/waveform";
import { WaveformBars } from "./waveform";

const BAR_COUNT = 40;
interface InlineAudioPlayerProps {
  audioUrl: string;
  pitchId: string;
  onPlayPress?: () => void;
}

export function InlineAudioPlayer({
  audioUrl,
  pitchId,
  onPlayPress,
}: InlineAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playPosition, setPlayPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  const waveformRef = useRef<View>(null);
  const waveformWidthRef = useRef(1);
  const waveformPageXRef = useRef(0);

  const barHeights = getPitchBarHeights(pitchId, BAR_COUNT);
  const usesExternalPlayHandler = typeof onPlayPress === "function";
  const progress = duration > 0 ? playPosition / duration : 0;
  const playButtonSize = 34;
  const playIconSize = 26;
  const waveformHeight = 65;
  const maxBaseBarHeight = Math.max(...barHeights, 1);
  const targetMaxBarHeight = waveformHeight - 6;
  const visualBarHeights = barHeights.map((height) =>
    Math.max(6, (height / maxBaseBarHeight) * targetMaxBarHeight),
  );

  const loadSound = async (shouldPlay: boolean) => {
    setIsLoading(true);
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay, progressUpdateIntervalMillis: 80 },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;
          setPlayPosition(status.positionMillis ?? 0);
          if (status.durationMillis) setDuration(status.durationMillis);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlayPosition(status.durationMillis ?? 0);
            soundRef.current?.unloadAsync();
            soundRef.current = null;
          }
        },
      );
      soundRef.current = sound;
      if (shouldPlay) setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (usesExternalPlayHandler) {
      return;
    }

    loadSound(false);
    return () => {
      soundRef.current?.unloadAsync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usesExternalPlayHandler]);

  const togglePlayback = async () => {
    if (usesExternalPlayHandler) {
      onPlayPress?.();
      return;
    }

    if (isLoading) return;

    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
      return;
    }

    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && !status.didJustFinish) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    await loadSound(true);
  };

  const seekToRatio = async (ratio: number) => {
    if (usesExternalPlayHandler) return;

    const clamped = Math.max(0, Math.min(1, ratio));
    if (!soundRef.current) {
      await loadSound(false);
      if (!soundRef.current) return;
    }
    const targetMs = clamped * duration;
    await soundRef.current.setPositionAsync(targetMs);
    setPlayPosition(targetMs);
  };

  const waveformResponder = {
    onStartShouldSetResponder: () => !usesExternalPlayHandler,
    onMoveShouldSetResponder: () => !usesExternalPlayHandler,
    onResponderGrant: (e: any) => {
      if (usesExternalPlayHandler) return;
      const ratio =
        (e.nativeEvent.pageX - waveformPageXRef.current) /
        waveformWidthRef.current;
      seekToRatio(ratio);
    },
    onResponderMove: (e: any) => {
      if (usesExternalPlayHandler) return;
      const ratio =
        (e.nativeEvent.pageX - waveformPageXRef.current) /
        waveformWidthRef.current;
      const targetMs = Math.max(0, Math.min(1, ratio)) * duration;
      setPlayPosition(targetMs);
    },
    onResponderRelease: (e: any) => {
      if (usesExternalPlayHandler) return;
      const ratio =
        (e.nativeEvent.pageX - waveformPageXRef.current) /
        waveformWidthRef.current;
      seekToRatio(ratio);
    },
  };

  return (
    <Box gap="xs">
      <Box
        flexDirection="row"
        alignItems="center"
        gap="sm"
        backgroundColor="gray50"
        borderRadius="md"
        paddingHorizontal="xs"
        paddingVertical="xxs"
      >
        <Pressable
          onPress={togglePlayback}
          style={[
            styles.playBtn,
            {
              width: playButtonSize,
              height: playButtonSize,
              borderRadius: playButtonSize / 2,
            },
          ]}
          hitSlop={8}
        >
          {isLoading ? (
            <Spinner />
          ) : isPlaying ? (
            <Pause
              size={playIconSize}
              color={ColorPalette.gray900}
              fill={ColorPalette.gray900}
            />
          ) : (
            <Play
              size={playIconSize}
              color={ColorPalette.gray900}
              fill={ColorPalette.gray900}
            />
          )}
        </Pressable>

        <View
          ref={waveformRef}
          {...waveformResponder}
          onLayout={() => {
            waveformRef.current?.measure((_x, _y, width, _height, pageX) => {
              waveformWidthRef.current = width;
              waveformPageXRef.current = pageX;
            });
          }}
          style={{ flex: 1 }}
        >
          <WaveformBars
            barHeights={visualBarHeights}
            progress={progress}
            barWidth={2}
            style={{ flex: 1, height: waveformHeight }}
          />
        </View>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  playBtn: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
});
