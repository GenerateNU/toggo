import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { WaveformBars } from "./waveform";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Pause, Play, RotateCcw, Scissors, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable } from "react-native";

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function Waveform({
  barHeights,
  progress,
  onPress,
  onLayout,
}: {
  barHeights: number[];
  progress: number;
  onPress: (x: number) => void;
  onLayout: (w: number) => void;
}) {
  return (
    <Pressable
      onPress={(e) => onPress(e.nativeEvent.locationX)}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
    >
      <Box
        backgroundColor="gray50"
        borderRadius="md"
        paddingHorizontal="xs"
        style={{ height: 80 }}
      >
        <WaveformBars
          barHeights={barHeights}
          progress={progress}
          style={{ flex: 1 }}
        />
      </Box>
    </Pressable>
  );
}

function SeekBar({
  progress,
  onPress,
  onLayout,
}: {
  progress: number;
  onPress: (x: number) => void;
  onLayout: (w: number) => void;
}) {
  return (
    <Pressable
      onPress={(e) => onPress(e.nativeEvent.locationX)}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width)}
      hitSlop={12}
      style={{
        height: 4,
        backgroundColor: ColorPalette.gray200,
        borderRadius: 2,
      }}
    >
      <Box
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 4,
          width: `${Math.round(progress * 100)}%`,
          backgroundColor: ColorPalette.gray900,
          borderRadius: 2,
        }}
      />
      <Box
        style={{
          position: "absolute",
          top: -8,
          left: `${Math.round(progress * 100)}%`,
          marginLeft: -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: ColorPalette.white,
          borderWidth: 1.5,
          borderColor: ColorPalette.gray300,
        }}
      />
    </Pressable>
  );
}

function TimeLabels({ left, right }: { left: string; right: string }) {
  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text variant="bodyXsDefault" color="gray400">
        {left}
      </Text>
      <Text variant="bodyXsDefault" color="gray400">
        {right}
      </Text>
    </Box>
  );
}

function Controls({
  isPlaying,
  isLoading,
  onPlayPause,
  onSeekBack,
  onSeekForward,
  onDelete,
  showTrimButton,
}: {
  isPlaying: boolean;
  isLoading: boolean;
  onPlayPause: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onDelete?: () => void;
  showTrimButton?: boolean;
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      gap="xl"
    >
      {showTrimButton && (
        <Box hitSlop={12}>
          <Scissors size={22} color={ColorPalette.gray300} />
        </Box>
      )}

      <Pressable onPress={onSeekBack} hitSlop={12}>
        <Box
          style={{
            width: 22,
            height: 22,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RotateCcw size={22} color={ColorPalette.gray700} />
          <Text
            style={{
              position: "absolute",
              fontSize: 7,
              fontWeight: "700",
              color: ColorPalette.gray700,
            }}
          >
            15
          </Text>
        </Box>
      </Pressable>

      <Pressable
        onPress={onPlayPause}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: ColorPalette.gray900,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={ColorPalette.white} />
        ) : isPlaying ? (
          <Pause
            size={26}
            color={ColorPalette.white}
            fill={ColorPalette.white}
          />
        ) : (
          <Play
            size={26}
            color={ColorPalette.white}
            fill={ColorPalette.white}
          />
        )}
      </Pressable>

      <Pressable onPress={onSeekForward} hitSlop={12}>
        <Box
          style={{
            width: 22,
            height: 22,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box style={{ transform: [{ scaleX: -1 }] }}>
            <RotateCcw size={22} color={ColorPalette.gray700} />
          </Box>
          <Text
            style={{
              position: "absolute",
              fontSize: 7,
              fontWeight: "700",
              color: ColorPalette.gray700,
            }}
          >
            15
          </Text>
        </Box>
      </Pressable>

      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={12}>
          <Trash2 size={22} color={ColorPalette.gray500} />
        </Pressable>
      )}
    </Box>
  );
}

/* -------------------- MAIN COMPONENT -------------------- */

interface AudioPlayerContentProps {
  audioUri: string;
  barHeights: number[];
  trimStartMs?: number;
  trimEndMs?: number;
  onDelete?: () => void;
  showTrimButton?: boolean;
}

export function AudioPlayerContent({
  audioUri,
  barHeights,
  trimStartMs = 0,
  trimEndMs,
  onDelete,
  showTrimButton = false,
}: AudioPlayerContentProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playPosition, setPlayPosition] = useState(trimStartMs);
  const [duration, setDuration] = useState(0);
  const [barWidth, setBarWidth] = useState(1);
  const soundRef = useRef<Audio.Sound | null>(null);

  const effectiveTrimEnd = trimEndMs ?? duration;
  const totalMs = Math.max(1, effectiveTrimEnd - trimStartMs);
  const progress = Math.max(
    0,
    Math.min(1, (playPosition - trimStartMs) / totalMs),
  );

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    soundRef.current?.unloadAsync();
    soundRef.current = null;
    setIsPlaying(false);
    setPlayPosition(trimStartMs);
    setDuration(0);
  }, [audioUri, trimStartMs]);

  const buildSound = async (shouldPlay: boolean, fromMs: number) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    let resolvedTrimEnd = trimEndMs;

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: false, progressUpdateIntervalMillis: 80 },
      (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        const pos = status.positionMillis ?? 0;
        setPlayPosition(pos);

        if (status.durationMillis) {
          setDuration(status.durationMillis);
          if (!resolvedTrimEnd) resolvedTrimEnd = status.durationMillis;
        }

        const end = resolvedTrimEnd ?? status.durationMillis ?? 0;

        if ((end > 0 && pos >= end) || status.didJustFinish) {
          sound.pauseAsync().catch(() => {});
          setIsPlaying(false);
          if (end > 0) setPlayPosition(end);
        }
      },
    );

    soundRef.current = sound;
    await sound.setPositionAsync(fromMs);

    if (shouldPlay) {
      await sound.playAsync();
      setIsPlaying(true);
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
      if (status.isLoaded) {
        const end = trimEndMs ?? duration;
        const atEnd = end > 0 && (status.positionMillis ?? 0) >= end;
        if (atEnd) {
          await soundRef.current.setPositionAsync(trimStartMs);
          setPlayPosition(trimStartMs);
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }
    }

    setIsLoading(true);
    try {
      await buildSound(
        true,
        playPosition <= trimStartMs ? trimStartMs : playPosition,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const seekBy = async (deltaMs: number) => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;

    const end = trimEndMs ?? duration;
    const next = Math.max(
      trimStartMs,
      Math.min(end, (status.positionMillis ?? trimStartMs) + deltaMs),
    );

    await soundRef.current.setPositionAsync(next);
    setPlayPosition(next);
  };

  const handleSeekPress = async (locationX: number) => {
    if (barWidth <= 1) return;

    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    const targetMs = trimStartMs + ratio * totalMs;

    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.setPositionAsync(targetMs);
        setPlayPosition(targetMs);

        if (!isPlaying && status.didJustFinish) {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
        return;
      }
    }

    setIsLoading(true);
    try {
      await buildSound(true, targetMs);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box gap="md">
      <Waveform
        barHeights={barHeights}
        progress={progress}
        onPress={handleSeekPress}
        onLayout={setBarWidth}
      />

      <SeekBar
        progress={progress}
        onPress={handleSeekPress}
        onLayout={setBarWidth}
      />

      <TimeLabels
        left={formatTime(Math.max(0, playPosition - trimStartMs))}
        right={formatTime(Math.max(0, effectiveTrimEnd - playPosition))}
      />

      <Controls
        isPlaying={isPlaying}
        isLoading={isLoading}
        onPlayPause={togglePlayback}
        onSeekBack={() => seekBy(-15000)}
        onSeekForward={() => seekBy(15000)}
        onDelete={onDelete}
        showTrimButton={showTrimButton}
      />
    </Box>
  );
}
