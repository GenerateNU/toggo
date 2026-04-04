import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Audio, AVPlaybackStatus } from "expo-av";
import { Mic, Pause, Play, RotateCcw, Square } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

export interface RecordingResult {
  uri: string;
  durationSeconds: number;
  contentType: string;
  contentLength: number;
}

interface AudioRecorderProps {
  onRecorded: (result: RecordingResult) => void;
  onClear: () => void;
  result: RecordingResult | null;
}

type RecorderState = "idle" | "recording" | "processing" | "done" | "playing";

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioRecorder({
  onRecorded,
  onClear,
  result,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>(result ? "done" : "idle");
  const [elapsed, setElapsed] = useState(0);
  const [playPosition, setPlayPosition] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      soundRef.current?.unloadAsync();
    };
  }, []);

  const startRecording = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    await recording.startAsync();
    recordingRef.current = recording;

    setElapsed(0);
    setState("recording");
    timerRef.current = setInterval(() => setElapsed((e) => e + 1000), 1000);
  };

  const stopRecording = async () => {
    timerRef.current && clearInterval(timerRef.current);
    setState("processing");

    const recording = recordingRef.current;
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = recording.getURI();
    if (!uri) return;

    const status = await recording.getStatusAsync();
    const durationSeconds = Math.ceil(
      (status.durationMillis ?? elapsed) / 1000,
    );

    // Get file size via fetch blob
    const blob = await fetch(uri).then((r) => r.blob());
    const contentLength = blob.size;

    setState("done");
    onRecorded({
      uri,
      durationSeconds,
      contentType: "audio/m4a",
      contentLength,
    });
  };

  const playRecording = async () => {
    if (!result?.uri) return;
    const { sound } = await Audio.Sound.createAsync(
      { uri: result.uri },
      { shouldPlay: true },
      (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setPlayPosition(status.positionMillis ?? 0);
        if (status.didJustFinish) {
          setState("done");
          setPlayPosition(0);
        }
      },
    );
    soundRef.current = sound;
    setState("playing");
  };

  const pausePlayback = async () => {
    await soundRef.current?.pauseAsync();
    setState("done");
  };

  const reset = async () => {
    timerRef.current && clearInterval(timerRef.current);
    await soundRef.current?.unloadAsync();
    soundRef.current = null;
    recordingRef.current = null;
    setElapsed(0);
    setPlayPosition(0);
    setState("idle");
    onClear();
  };

  const duration = result ? result.durationSeconds * 1000 : elapsed;

  return (
    <Box gap="sm">
      <Box
        backgroundColor="gray50"
        borderRadius="lg"
        padding="md"
        alignItems="center"
        gap="md"
      >
        {/* Time display */}
        <Text
          variant="headingXl"
          color="gray900"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatTime(state === "playing" ? playPosition : duration)}
        </Text>

        {/* Waveform placeholder */}
        <Box
          flexDirection="row"
          alignItems="center"
          gap="xxs"
          style={{ height: 32 }}
        >
          {Array.from({ length: 24 }).map((_, i) => (
            <Box
              key={i}
              width={3}
              borderRadius="xs"
              style={{
                height: 4 + (i % 7) * 4,
                backgroundColor:
                  state === "idle"
                    ? ColorPalette.gray300
                    : ColorPalette.brand500,
              }}
            />
          ))}
        </Box>

        {/* Controls */}
        <Box flexDirection="row" alignItems="center" gap="lg">
          {(state === "done" || state === "playing") && (
            <Pressable onPress={reset} style={styles.secondaryBtn}>
              <RotateCcw size={18} color={ColorPalette.gray600} />
            </Pressable>
          )}

          {state === "idle" && (
            <Pressable onPress={startRecording} style={styles.primaryBtn}>
              <Mic size={24} color={ColorPalette.white} />
            </Pressable>
          )}

          {state === "recording" && (
            <Pressable onPress={stopRecording} style={styles.stopBtn}>
              <Square
                size={20}
                color={ColorPalette.white}
                fill={ColorPalette.white}
              />
            </Pressable>
          )}

          {state === "processing" && (
            <Box
              style={styles.primaryBtn}
              alignItems="center"
              justifyContent="center"
            >
              <ActivityIndicator color={ColorPalette.white} />
            </Box>
          )}

          {state === "done" && (
            <Pressable onPress={playRecording} style={styles.primaryBtn}>
              <Play
                size={24}
                color={ColorPalette.white}
                fill={ColorPalette.white}
              />
            </Pressable>
          )}

          {state === "playing" && (
            <Pressable onPress={pausePlayback} style={styles.primaryBtn}>
              <Pause
                size={24}
                color={ColorPalette.white}
                fill={ColorPalette.white}
              />
            </Pressable>
          )}
        </Box>

        <Text variant="bodyXsDefault" color="gray500">
          {state === "idle" && "Tap to start recording"}
          {state === "recording" && "Recording… tap to stop"}
          {state === "processing" && "Processing…"}
          {state === "done" && `${result?.durationSeconds}s recorded`}
          {state === "playing" && "Playing…"}
        </Text>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  primaryBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorPalette.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorPalette.statusError,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ColorPalette.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
});
