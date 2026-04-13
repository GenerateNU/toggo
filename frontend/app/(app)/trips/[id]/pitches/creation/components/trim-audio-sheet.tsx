import { Box, Button, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Pause, Play, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RecordingResult } from "./audio-pitch-sheet";

interface TrimAudioSheetProps {
  onClose: () => void;
  onSave: (result: RecordingResult) => void;
  recording: RecordingResult;
}

const BAR_COUNT = 48;
const MIN_TRIM_RATIO = 0.05;

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

type ActiveHandle = "left" | "right" | null;

export function TrimAudioSheet({
  onClose,
  onSave,
  recording,
}: TrimAudioSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const { bottom } = useSafeAreaInsets();

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPosition, setPlayPosition] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Stable refs for responder callbacks (avoid stale closures)
  const trimStartRef = useRef(0);
  const trimEndRef = useRef(1);
  const activeHandleRef = useRef<ActiveHandle>(null);

  const waveformWidthRef = useRef(1);
  // Delta-based drag: store values at the moment touch starts
  const touchStartPageXRef = useRef(0);
  const trimStartAtGrantRef = useRef(0);
  const trimEndAtGrantRef = useRef(0);
  const [waveformWidth, setWaveformWidth] = useState(1);

  useEffect(() => {
    trimStartRef.current = trimStart;
    trimEndRef.current = trimEnd;
  }, [trimEnd, trimStart]);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  const baseStartMs = recording.trimStartMs ?? 0;
  const baseEndMs =
    recording.trimEndMs ?? baseStartMs + recording.durationSeconds * 1000;
  const totalMs = Math.max(1, baseEndMs - baseStartMs);
  const trimStartMs = trimStart * totalMs;
  const trimEndMs = trimEnd * totalMs;
  const trimmedDurationMs = trimEndMs - trimStartMs;

  const togglePlayback = async () => {
    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
      return;
    }

    if (!soundRef.current) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { shouldPlay: false, progressUpdateIntervalMillis: 80 },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;
          const pos = status.positionMillis ?? 0;
          setPlayPosition(pos);
          const currentTrimEndMs = baseStartMs + trimEndRef.current * totalMs;
          if (pos >= currentTrimEndMs) {
            sound.pauseAsync();
            setIsPlaying(false);
          }
        },
      );
      soundRef.current = sound;
    }

    await soundRef.current.setPositionAsync(
      baseStartMs + trimStartRef.current * totalMs,
    );
    await soundRef.current.playAsync();
    setIsPlaying(true);
  };

  const handleSave = () => {
    const trimmedDurationSeconds = Math.max(
      1,
      Math.round(trimmedDurationMs / 1000),
    );
    onSave({
      ...recording,
      durationSeconds: trimmedDurationSeconds,
      trimStartMs: baseStartMs + trimStartRef.current * totalMs,
      trimEndMs: baseStartMs + trimEndRef.current * totalMs,
    });
    onClose();
  };

  // Single responder on the whole waveform container.
  // Grant uses locationX (correct relative to this view) to pick the handle.
  // Move uses pageX delta from grant position — no absolute container offset needed.
  const waveformResponder = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderGrant: (e: any) => {
      const ratio = e.nativeEvent.locationX / waveformWidthRef.current;
      const distLeft = Math.abs(ratio - trimStartRef.current);
      const distRight = Math.abs(ratio - trimEndRef.current);
      activeHandleRef.current = distLeft <= distRight ? "left" : "right";
      touchStartPageXRef.current = e.nativeEvent.pageX;
      trimStartAtGrantRef.current = trimStartRef.current;
      trimEndAtGrantRef.current = trimEndRef.current;
    },
    onResponderMove: (e: any) => {
      const delta =
        (e.nativeEvent.pageX - touchStartPageXRef.current) /
        waveformWidthRef.current;
      if (activeHandleRef.current === "left") {
        const clamped = Math.max(
          0,
          Math.min(
            trimStartAtGrantRef.current + delta,
            trimEndRef.current - MIN_TRIM_RATIO,
          ),
        );
        setTrimStart(clamped);
        trimStartRef.current = clamped;
      } else if (activeHandleRef.current === "right") {
        const clamped = Math.max(
          trimStartRef.current + MIN_TRIM_RATIO,
          Math.min(trimEndAtGrantRef.current + delta, 1),
        );
        setTrimEnd(clamped);
        trimEndRef.current = clamped;
      }
    },
    onResponderRelease: () => {
      activeHandleRef.current = null;
    },
  };

  const playProgress =
    trimmedDurationMs > 0
      ? (playPosition - trimStart * totalMs) / trimmedDurationMs
      : 0;

  return (
    <BottomSheetComponent
      ref={sheetRef}
      initialIndex={0}
      onClose={onClose}
      footer={
        <Box
          paddingHorizontal="sm"
          paddingTop="xs"
          style={{ paddingBottom: Math.max(bottom, 16) }}
        >
          <Button
            layout="textOnly"
            label="Trim audio message"
            variant="Primary"
            onPress={handleSave}
          />
        </Box>
      }
    >
      {/* Header */}
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="sm"
        paddingBottom="xs"
      >
        <Text variant="headingSm" color="gray900">
          Trim audio
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <X size={24} color={ColorPalette.gray500} />
        </Pressable>
      </Box>

      <Box paddingHorizontal="sm" gap="md">
        <Text variant="bodySmDefault" color="gray500">
          Drag the handles to select the start and end points.
        </Text>

        {/* Waveform with drag handles — single responder on entire container */}
        <View
          {...waveformResponder}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            waveformWidthRef.current = w;
            setWaveformWidth(w);
          }}
          style={styles.waveformContainer}
        >
          {/* Bars */}
          <View style={[StyleSheet.absoluteFillObject, styles.barsRow]}>
            {Array.from({ length: BAR_COUNT }).map((_, i) => {
              const ratio = i / BAR_COUNT;
              const inRange = ratio >= trimStart && ratio <= trimEnd;
              const isProgress =
                inRange &&
                ratio <= trimStart + playProgress * (trimEnd - trimStart);
              return (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: 8 + (i % 7) * 7,
                    borderRadius: 2,
                    backgroundColor: isProgress
                      ? ColorPalette.brand500
                      : inRange
                        ? ColorPalette.gray700
                        : ColorPalette.gray300,
                  }}
                />
              );
            })}
          </View>

          {/* Left handle */}
          <View
            style={[
              styles.handle,
              { left: Math.max(0, trimStart * waveformWidth - 12) },
            ]}
          >
            <View style={styles.handleBar} />
          </View>

          {/* Right handle */}
          <View
            style={[
              styles.handle,
              { left: Math.max(0, trimEnd * waveformWidth - 12) },
            ]}
          >
            <View style={styles.handleBar} />
          </View>
        </View>

        {/* Time labels */}
        <Box flexDirection="row" justifyContent="space-between">
          <Text variant="bodyXsDefault" color="gray500">
            {formatTime(trimStart * totalMs)}
          </Text>
          <Text variant="bodySmMedium" color="gray900">
            {formatTime(trimmedDurationMs)}
          </Text>
          <Text variant="bodyXsDefault" color="gray500">
            {formatTime(trimEnd * totalMs)}
          </Text>
        </Box>

        {/* Play button */}
        <Box alignItems="center">
          <Pressable onPress={togglePlayback} style={styles.playBtn}>
            {isPlaying ? (
              <Pause
                size={22}
                color={ColorPalette.white}
                fill={ColorPalette.white}
              />
            ) : (
              <Play
                size={22}
                color={ColorPalette.white}
                fill={ColorPalette.white}
              />
            )}
          </Pressable>
        </Box>
      </Box>
    </BottomSheetComponent>
  );
}

const styles = StyleSheet.create({
  waveformContainer: {
    height: 72,
    backgroundColor: ColorPalette.gray100,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 2,
  },
  handle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: 3,
    height: "100%",
    backgroundColor: ColorPalette.brand500,
    borderRadius: 2,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ColorPalette.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
});
