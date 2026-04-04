import { Avatar, Box, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Pause, Play, RotateCcw } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { getPitchBarHeights } from "../../utils/waveform";

const BAR_COUNT = 52;

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface AudioPlayerSheetProps {
  visible: boolean;
  onClose: () => void;
  audioUrl: string;
  pitchId: string;
  username?: string;
  profilePictureUrl?: string;
  userId?: string;
}

export function AudioPlayerSheet({
  visible,
  onClose,
  audioUrl,
  pitchId,
  username,
  profilePictureUrl,
  userId,
}: AudioPlayerSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playPosition, setPlayPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressBarWidth, setProgressBarWidth] = useState(1);
  const soundRef = useRef<Audio.Sound | null>(null);

  const barHeights = getPitchBarHeights(pitchId, BAR_COUNT);
  const progress = duration > 0 ? playPosition / duration : 0;

  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
  }

  const createSound = useCallback(
    async (shouldPlay: boolean) => {
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
    },
    [audioUrl],
  );

  const preload = useCallback(async () => {
    if (soundRef.current) return;
    try {
      await createSound(false);
    } catch {}
  }, [createSound]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      // Pre-load audio as soon as the sheet opens so play is instant
      preload();
    } else {
      sheetRef.current?.close();
      const s = soundRef.current;
      soundRef.current = null;
      s?.stopAsync()
        .catch(() => {})
        .finally(() => s.unloadAsync().catch(() => {}));
      setIsPlaying(false);
      setPlayPosition(0);
    }
  }, [preload, visible]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const loadAndPlay = async () => {
    setIsLoading(true);
    try {
      await createSound(true);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

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

    await loadAndPlay();
  };

  const seekBy = async (deltaMs: number) => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    const next = Math.max(
      0,
      Math.min(duration, (status.positionMillis ?? 0) + deltaMs),
    );
    await soundRef.current.setPositionAsync(next);
  };

  const handleSeekPress = async (locationX: number) => {
    if (duration === 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / progressBarWidth));
    const targetMs = ratio * duration;

    if (!soundRef.current) {
      // Load but don't autoplay — seek to position first
      setIsLoading(true);
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false, progressUpdateIntervalMillis: 80 },
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
        await sound.setPositionAsync(targetMs);
        soundRef.current = sound;
      } finally {
        setIsLoading(false);
      }
      return;
    }

    await soundRef.current.setPositionAsync(targetMs);
  };

  return (
    <BottomSheetComponent
      ref={sheetRef}
      snapPoints={["52%"]}
      initialIndex={-1}
      onClose={onClose}
    >
      {/* Header */}
      <Box paddingHorizontal="sm" paddingBottom="sm">
        <Text variant="headingSm" color="gray900">
          Audio Pitch
        </Text>
      </Box>

      {/* User */}
      <Box
        flexDirection="row"
        alignItems="center"
        gap="xs"
        paddingHorizontal="sm"
        paddingBottom="md"
      >
        <Avatar profilePhoto={profilePictureUrl} seed={userId} variant="sm" />
        <Text variant="bodySmMedium" color="gray700">
          {username ?? "Unknown"}
        </Text>
      </Box>

      <Box paddingHorizontal="sm" gap="md">
        {/* Waveform bars — all dark, amplitude shape only */}
        <Pressable
          onPress={(e) => handleSeekPress(e.nativeEvent.locationX)}
          onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
        >
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            style={{ height: 48 }}
          >
            {barHeights.map((h: number, i: number) => {
              const filled = i / BAR_COUNT < progress;
              return (
                <Box
                  key={i}
                  width={3}
                  borderRadius="xs"
                  style={{
                    height: h,
                    backgroundColor: filled
                      ? ColorPalette.gray900
                      : ColorPalette.gray300,
                  }}
                />
              );
            })}
          </Box>
        </Pressable>

        {/* Seek bar */}
        <Pressable
          onPress={(e) => handleSeekPress(e.nativeEvent.locationX)}
          onLayout={(e) => setProgressBarWidth(e.nativeEvent.layout.width)}
          style={styles.seekBarTrack}
        >
          <Box
            style={[
              styles.seekBarFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
          <Box
            style={[
              styles.seekThumb,
              { left: `${Math.round(progress * 100)}%` },
            ]}
          />
        </Pressable>

        {/* Time */}
        <Box flexDirection="row" justifyContent="space-between">
          <Text variant="bodyXsDefault" color="gray400">
            {formatTime(playPosition)}
          </Text>
          <Text variant="bodyXsDefault" color="gray400">
            {formatTime(duration)}
          </Text>
        </Box>

        {/* Controls */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gap="xl"
        >
          <Pressable onPress={() => seekBy(-15000)} hitSlop={12}>
            <RotateCcw size={26} color={ColorPalette.gray700} />
          </Pressable>

          <Pressable onPress={togglePlayback} style={styles.playBtn}>
            {isLoading ? (
              <ActivityIndicator color={ColorPalette.white} />
            ) : isPlaying ? (
              <Pause
                size={28}
                color={ColorPalette.white}
                fill={ColorPalette.white}
              />
            ) : (
              <Play
                size={28}
                color={ColorPalette.white}
                fill={ColorPalette.white}
              />
            )}
          </Pressable>

          <Pressable onPress={() => seekBy(15000)} hitSlop={12}>
            <RotateCcw
              size={26}
              color={ColorPalette.gray700}
              style={{ transform: [{ scaleX: -1 }] }}
            />
          </Pressable>
        </Box>
      </Box>
    </BottomSheetComponent>
  );
}

const styles = StyleSheet.create({
  seekBarTrack: {
    height: 4,
    backgroundColor: ColorPalette.gray200,
    borderRadius: 2,
    overflow: "visible" as const,
  },
  seekBarFill: {
    height: 4,
    backgroundColor: ColorPalette.gray900,
    borderRadius: 2,
    position: "absolute" as const,
    left: 0,
    top: 0,
  },
  seekThumb: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ColorPalette.gray900,
    position: "absolute" as const,
    top: -4,
    marginLeft: -6,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorPalette.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
});
