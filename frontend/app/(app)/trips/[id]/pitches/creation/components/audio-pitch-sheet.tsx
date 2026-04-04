import { Box, Button, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Audio, AVPlaybackStatus } from "expo-av";
import {
  Mic,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Square,
  Trash2,
  X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrimAudioSheet } from "./trim-audio-sheet";

export interface RecordingResult {
  uri: string;
  durationSeconds: number;
  contentType: string;
  contentLength: number;
  trimStartMs?: number;
  trimEndMs?: number;
}

interface AudioPitchSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (result: RecordingResult) => void;
  existing: RecordingResult | null;
}

type RecorderState = "idle" | "recording" | "processing" | "done" | "playing";

const BAR_COUNT = 32;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 36;
const MAX_RECORDING_MS = 3 * 60 * 1000; // 3 minutes

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioPitchSheet({
  visible,
  onClose,
  onSave,
  existing,
}: AudioPitchSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const { bottom } = useSafeAreaInsets();

  const [state, setState] = useState<RecorderState>(existing ? "done" : "idle");
  const [elapsed, setElapsed] = useState(0);
  const [playPosition, setPlayPosition] = useState(0);
  const [draft, setDraft] = useState<RecordingResult | null>(existing ?? null);
  // Rolling buffer of normalized amplitude values (0–1) captured during recording
  const [meteringHistory, setMeteringHistory] = useState<number[]>([]);

  const [trimSheetVisible, setTrimSheetVisible] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipResetOnNextCloseRef = useRef(false);
  const elapsedRef = useRef(0);
  // Tracks the in-progress preparation so startRecording can await it if needed
  const preparePromiseRef = useRef<Promise<Audio.Recording | null> | null>(
    null,
  );

  const prepareRecordingSession = (): Promise<Audio.Recording | null> => {
    return (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const recording = new Audio.Recording();
        await recording.prepareToRecordAsync({
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        } as Audio.RecordingOptions);
        return recording;
      } catch {
        return null;
      }
    })();
  };

  useEffect(() => {
    if (visible) {
      const syncTimer = setTimeout(() => {
        const trimStart = existing?.trimStartMs ?? 0;
        setDraft(existing ?? null);
        setState(existing ? "done" : "idle");
        setPlayPosition(trimStart);
        setElapsed(existing ? existing.durationSeconds * 1000 : 0);
        setMeteringHistory([]);
      }, 0);

      sheetRef.current?.snapToIndex(0);
      if (!existing) {
        preparePromiseRef.current = prepareRecordingSession();
      }

      return () => clearTimeout(syncTimer);
    } else {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      sheetRef.current?.close();
      // Cancel any pre-prepared session that was never used
      preparePromiseRef.current?.then((r) =>
        r?.stopAndUnloadAsync().catch(() => {}),
      );
      preparePromiseRef.current = null;
    }
  }, [visible, existing]);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      soundRef.current?.unloadAsync();
      preparePromiseRef.current?.then((r) =>
        r?.stopAndUnloadAsync().catch(() => {}),
      );
    };
  }, []);

  const cleanupSound = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  };

  const cleanupRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  };

  const resetDraftToExisting = () => {
    const existingTrimStartMs = existing?.trimStartMs ?? 0;
    setDraft(existing ?? null);
    setState(existing ? "done" : "idle");
    setElapsed(existing ? existing.durationSeconds * 1000 : 0);
    setPlayPosition(existingTrimStartMs);
    setMeteringHistory([]);
    setTrimSheetVisible(false);
  };

  const handleClose = async () => {
    if (skipResetOnNextCloseRef.current) {
      skipResetOnNextCloseRef.current = false;
      return;
    }
    timerRef.current && clearInterval(timerRef.current);
    await cleanupSound();
    await cleanupRecording();
    resetDraftToExisting();
    onClose();
  };

  const meteringCallback = (status: {
    isRecording: boolean;
    metering?: number | null;
  }) => {
    if (!status.isRecording) return;
    const normalized =
      status.metering != null
        ? Math.max(0, Math.min(1, (status.metering + 60) / 60))
        : 0;
    setMeteringHistory((prev) => [...prev.slice(-(BAR_COUNT - 1)), normalized]);
  };

  const startRecording = async () => {
    if (state === "recording" || state === "processing") return;

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      Alert.alert(
        "Permission required",
        "Please allow microphone access in settings.",
      );
      return;
    }

    await cleanupSound();
    await cleanupRecording();
    setMeteringHistory([]);

    // Wait for pre-preparation if it's still in progress
    const prepared = preparePromiseRef.current
      ? await preparePromiseRef.current
      : null;
    preparePromiseRef.current = null;

    let recording: Audio.Recording;
    try {
      if (prepared) {
        recording = prepared;
        recording.setOnRecordingStatusUpdate(meteringCallback);
        recording.setProgressUpdateInterval(100);
        await recording.startAsync();
      } else {
        // Pre-preparation failed or wasn't ready — create fresh
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        ({ recording } = await Audio.Recording.createAsync(
          {
            ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
            isMeteringEnabled: true,
          } as Audio.RecordingOptions,
          meteringCallback,
          100,
        ));
      }
    } catch {
      await cleanupRecording();
      setState("idle");
      Alert.alert("Error", "Could not start recording. Please try again.");
      return;
    }

    recordingRef.current = recording;
    elapsedRef.current = 0;
    setElapsed(0);
    setState("recording");
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1000;
      setElapsed(elapsedRef.current);
      if (elapsedRef.current >= MAX_RECORDING_MS) {
        stopRecording();
      }
    }, 1000);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    timerRef.current && clearInterval(timerRef.current);
    setState("processing");

    const recording = recordingRef.current;
    recordingRef.current = null;

    try {
      // Read status BEFORE stopping — unavailable after unload
      const status = await recording.getStatusAsync();
      const durationMs = status.durationMillis ?? elapsedRef.current;

      await recording.stopAndUnloadAsync();

      // Switch back to playback mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const uri = recording.getURI();
      if (!uri) {
        setState("idle");
        return;
      }

      const durationSeconds = Math.max(1, Math.ceil(durationMs / 1000));
      const blob = await fetch(uri).then((r) => r.blob());

      setDraft({
        uri,
        durationSeconds,
        contentType: "audio/m4a",
        contentLength: blob.size,
      });
      setState("done");
    } catch {
      setState("idle");
      Alert.alert("Error", "Could not save recording. Please try again.");
    }
  };

  const trimStartMs = draft?.trimStartMs ?? 0;
  const trimEndMs =
    draft?.trimEndMs ?? (draft ? draft.durationSeconds * 1000 : elapsed);

  const playRecording = async (fromMs = trimStartMs) => {
    if (!draft?.uri) return;

    await cleanupSound();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: draft.uri },
      { shouldPlay: false, progressUpdateIntervalMillis: 80 },
      (status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        const pos = status.positionMillis ?? 0;
        setPlayPosition(pos);
        if (pos >= trimEndMs) {
          sound.pauseAsync();
          setState("done");
          setPlayPosition(trimStartMs);
          return;
        }
        if (status.didJustFinish) {
          setState("done");
          setPlayPosition(trimStartMs);
        }
      },
    );
    soundRef.current = sound;
    await sound.setPositionAsync(Math.max(trimStartMs, fromMs));
    await sound.playAsync();
    setState("playing");
  };

  const pausePlayback = async () => {
    await soundRef.current?.pauseAsync();
    setState("done");
  };

  const seekBy = async (deltaMs: number) => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    const min = trimStartMs;
    const max = trimEndMs;
    const next = Math.max(
      min,
      Math.min(max, (status.positionMillis ?? min) + deltaMs),
    );
    await soundRef.current.setPositionAsync(next);
    setPlayPosition(next);
  };

  const handleSeekPress = async (locationX: number, barWidth: number) => {
    if (!draft) return;
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    const trimmedDuration = Math.max(1, trimEndMs - trimStartMs);
    const targetMs = trimStartMs + ratio * trimmedDuration;
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        await soundRef.current.setPositionAsync(targetMs);
        setPlayPosition(targetMs);
        return;
      }
    }
    // No sound loaded yet — start playing from tapped position
    await playRecording(targetMs);
  };

  const deleteRecording = () => {
    const performDelete = async () => {
      timerRef.current && clearInterval(timerRef.current);
      await cleanupSound();
      await cleanupRecording();
      elapsedRef.current = 0;
      setDraft(null);
      setElapsed(0);
      setPlayPosition(0);
      setState("idle");
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Delete audio pitch", "Cancel"],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            performDelete();
          }
        },
      );
      return;
    }

    Alert.alert("Delete recording?", "You'll lose this audio pitch.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: performDelete,
      },
    ]);
  };

  const handleSave = () => {
    if (!draft) return;
    skipResetOnNextCloseRef.current = true;
    onSave(draft);
    onClose();
  };

  const [seekBarWidth, setSeekBarWidth] = useState(1);

  const totalMs = Math.max(1, trimEndMs - trimStartMs);
  const playProgress = totalMs > 0 ? (playPosition - trimStartMs) / totalMs : 0;
  const isNearLimit =
    state === "recording" && elapsed >= MAX_RECORDING_MS - 30_000;

  const renderWaveform = (showProgress: boolean) => (
    <Box
      style={[
        styles.waveformContainer,
        showProgress ? styles.waveformContainerPlayback : null,
      ]}
    >
      <Box style={styles.waveformBars}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const amplitude = meteringHistory[i] ?? 0;
          const height =
            MIN_BAR_HEIGHT + amplitude * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT);
          const filled = showProgress && i / BAR_COUNT < playProgress;
          return (
            <Box
              key={i}
              width={3}
              borderRadius="xs"
              style={{
                height,
                backgroundColor: filled
                  ? ColorPalette.gray900
                  : ColorPalette.gray400,
              }}
            />
          );
        })}
      </Box>
    </Box>
  );

  return (
    <>
      <BottomSheetComponent
        ref={sheetRef}
        snapPoints={["52%"]}
        initialIndex={-1}
        onClose={handleClose}
        footer={
          state === "done" || state === "playing" ? (
            <Box
              paddingHorizontal="sm"
              paddingTop="xs"
              style={{ paddingBottom: Math.max(bottom, 16) }}
            >
              <Button
                layout="textOnly"
                label="Save audio message"
                variant="Primary"
                onPress={handleSave}
              />
            </Box>
          ) : undefined
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
            Add an audio pitch
          </Text>
          <Pressable onPress={handleClose} hitSlop={8}>
            <X size={20} color={ColorPalette.gray500} />
          </Pressable>
        </Box>

        <Box paddingHorizontal="sm" paddingBottom="lg" gap="lg">
          <Text variant="bodySmDefault" color="gray500">
            Record an audio pitch to add a personal touch.
          </Text>

          {state === "idle" || state === "processing" ? (
            <Box alignItems="center" gap="md" paddingTop="lg">
              {state === "processing" ? (
                <Box
                  style={styles.micBtn}
                  alignItems="center"
                  justifyContent="center"
                >
                  <ActivityIndicator color={ColorPalette.white} />
                </Box>
              ) : (
                <Pressable onPress={startRecording} style={styles.micBtn}>
                  <Mic size={32} color={ColorPalette.white} />
                </Pressable>
              )}
              <Text variant="bodySmDefault" color="gray500">
                {state === "idle"
                  ? "Tap the microphone to start recording"
                  : "Processing…"}
              </Text>
            </Box>
          ) : state === "recording" ? (
            <Box gap="lg">
              <Text
                variant="headingXl"
                color={isNearLimit ? "statusError" : "gray900"}
                style={{ textAlign: "center", fontVariant: ["tabular-nums"] }}
              >
                {isNearLimit
                  ? `-${formatTime(MAX_RECORDING_MS - elapsed)}`
                  : formatTime(elapsed)}
              </Text>
              {renderWaveform(false)}
              <Box alignItems="center">
                <Pressable onPress={stopRecording} style={styles.stopBtn}>
                  <Square
                    size={22}
                    color={ColorPalette.white}
                    fill={ColorPalette.white}
                  />
                </Pressable>
              </Box>
            </Box>
          ) : (
            /* done | playing */
            <Box gap="md">
              {renderWaveform(true)}

              {/* Seek bar */}
              <Pressable
                onLayout={(e) => setSeekBarWidth(e.nativeEvent.layout.width)}
                onPress={(e) =>
                  handleSeekPress(e.nativeEvent.locationX, seekBarWidth)
                }
                style={styles.seekTrack}
              >
                <Box
                  style={[
                    styles.seekFill,
                    { width: `${Math.round(playProgress * 100)}%` },
                  ]}
                />
                <Box
                  style={[
                    styles.seekThumb,
                    { left: `${Math.round(playProgress * 100)}%` },
                  ]}
                />
              </Pressable>

              {/* Time labels */}
              <Box flexDirection="row" justifyContent="space-between">
                <Text variant="bodyXsDefault" color="gray400">
                  {formatTime(Math.max(0, playPosition - trimStartMs))}
                </Text>
                <Text variant="bodyXsDefault" color="gray400">
                  {formatTime(Math.max(0, trimEndMs - playPosition))}
                </Text>
              </Box>

              {/* Controls: ✂ | ↺15 | play/pause | ↻15 | 🗑 */}
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="center"
                gap="xl"
              >
                <Pressable
                  onPress={() => setTrimSheetVisible(true)}
                  hitSlop={12}
                >
                  <Scissors size={22} color={ColorPalette.gray500} />
                </Pressable>
                <Pressable onPress={() => seekBy(-15000)} hitSlop={12}>
                  <RotateCcw size={22} color={ColorPalette.gray700} />
                </Pressable>
                {state === "done" ? (
                  <Pressable
                    onPress={() => playRecording()}
                    style={styles.playBtn}
                  >
                    <Play
                      size={26}
                      color={ColorPalette.white}
                      fill={ColorPalette.white}
                    />
                  </Pressable>
                ) : (
                  <Pressable onPress={pausePlayback} style={styles.playBtn}>
                    <Pause
                      size={26}
                      color={ColorPalette.white}
                      fill={ColorPalette.white}
                    />
                  </Pressable>
                )}
                <Pressable onPress={() => seekBy(15000)} hitSlop={12}>
                  <RotateCcw
                    size={22}
                    color={ColorPalette.gray700}
                    style={{ transform: [{ scaleX: -1 }] }}
                  />
                </Pressable>
                <Pressable onPress={deleteRecording} hitSlop={12}>
                  <Trash2 size={22} color={ColorPalette.gray500} />
                </Pressable>
              </Box>
            </Box>
          )}
        </Box>
      </BottomSheetComponent>

      {draft && trimSheetVisible && (
        <TrimAudioSheet
          onClose={() => setTrimSheetVisible(false)}
          onSave={(trimmed) => {
            setDraft(trimmed);
            setPlayPosition(trimmed.trimStartMs ?? 0);
          }}
          recording={draft}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ColorPalette.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorPalette.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorPalette.gray900,
    alignItems: "center",
    justifyContent: "center",
  },
  waveformContainer: {
    borderRadius: 16,
    height: 80,
    overflow: "hidden",
    justifyContent: "center",
  },
  waveformContainerPlayback: {
    backgroundColor: ColorPalette.gray100,
  },
  waveformBars: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: "100%",
  },
  seekTrack: {
    height: 4,
    backgroundColor: ColorPalette.gray200,
    borderRadius: 2,
    overflow: "visible",
  },
  seekFill: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 4,
    backgroundColor: ColorPalette.gray900,
    borderRadius: 2,
  },
  seekThumb: {
    position: "absolute",
    top: -8,
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: ColorPalette.white,
    borderWidth: 1.5,
    borderColor: ColorPalette.gray300,
  },
});
