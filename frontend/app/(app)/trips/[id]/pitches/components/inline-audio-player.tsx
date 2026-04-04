import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Pause, Play } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { getPitchBarHeights } from "../utils/waveform";

const BAR_COUNT = 40;

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface InlineAudioPlayerProps {
  audioUrl: string;
  pitchId: string;
  showTime?: boolean;
}

export function InlineAudioPlayer({
  audioUrl,
  pitchId,
  showTime = true,
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
  const progress = duration > 0 ? playPosition / duration : 0;

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
            setPlayPosition(0);
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
    loadSound(false);
    return () => {
      soundRef.current?.unloadAsync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlayback = async () => {
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
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: any) => {
      const ratio =
        (e.nativeEvent.pageX - waveformPageXRef.current) /
        waveformWidthRef.current;
      seekToRatio(ratio);
    },
    onResponderMove: (e: any) => {
      const ratio =
        (e.nativeEvent.pageX - waveformPageXRef.current) /
        waveformWidthRef.current;
      const targetMs = Math.max(0, Math.min(1, ratio)) * duration;
      setPlayPosition(targetMs);
    },
    onResponderRelease: (e: any) => {
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
        paddingHorizontal="sm"
        paddingVertical="xs"
      >
        <Pressable onPress={togglePlayback} style={styles.playBtn} hitSlop={8}>
          {isLoading ? (
            <ActivityIndicator size="small" color={ColorPalette.white} />
          ) : isPlaying ? (
            <Pause
              size={13}
              color={ColorPalette.white}
              fill={ColorPalette.white}
            />
          ) : (
            <Play
              size={13}
              color={ColorPalette.white}
              fill={ColorPalette.white}
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
          style={{
            flex: 1,
            height: 28,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {barHeights.map((h: number, i: number) => {
            const filled = i / BAR_COUNT < progress;
            return (
              <View
                key={i}
                style={{
                  width: 2,
                  height: h,
                  borderRadius: 1,
                  backgroundColor: filled
                    ? ColorPalette.gray700
                    : ColorPalette.gray300,
                }}
              />
            );
          })}
        </View>
      </Box>

      {showTime && (
        <Box
          flexDirection="row"
          justifyContent="space-between"
          paddingHorizontal="xs"
        >
          <Text variant="bodyXsDefault" color="gray400">
            {formatTime(playPosition)}
          </Text>
          <Text variant="bodyXsDefault" color="gray400">
            {formatTime(duration)}
          </Text>
        </Box>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  playBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ColorPalette.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
});
