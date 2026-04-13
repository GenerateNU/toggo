import { Box, Button, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Audio } from "expo-av";
import { Mic, Square, X } from "lucide-react-native";
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
import { AudioPlayerContent } from "../../components/audio-sheet";
import { WaveformBars } from "../../components/waveform";
import { computeBarHeightsFromMetering } from "../../utils/waveform";

export interface RecordingResult {
  uri: string;
  durationSeconds: number;
  durationMs: number;
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

type RecorderState = "idle" | "recording" | "processing" | "done";

const BAR_COUNT = 32;
const MAX_RECORDING_MS = 3 * 60 * 1000;

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
  const [draft, setDraft] = useState<RecordingResult | null>(existing ?? null);
  const [meteringHistory, setMeteringHistory] = useState<number[]>([]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skipResetOnNextCloseRef = useRef(false);
  const elapsedRef = useRef(0);
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
        setDraft(existing ?? null);
        setState(existing ? "done" : "idle");
        setElapsed(existing ? existing.durationSeconds * 1000 : 0);
        setMeteringHistory([]);
      }, 0);
      sheetRef.current?.snapToIndex(0);
      if (!existing) {
        preparePromiseRef.current = prepareRecordingSession();
      }
      return () => clearTimeout(syncTimer);
    } else {
      sheetRef.current?.close();
      preparePromiseRef.current?.then((r) =>
        r?.stopAndUnloadAsync().catch(() => {}),
      );
      preparePromiseRef.current = null;
    }
  }, [visible, existing]);

  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      preparePromiseRef.current?.then((r) =>
        r?.stopAndUnloadAsync().catch(() => {}),
      );
    };
  }, []);

  const cleanupRecording = async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
  };

  const resetDraftToExisting = () => {
    setDraft(existing ?? null);
    setState(existing ? "done" : "idle");
    setElapsed(existing ? existing.durationSeconds * 1000 : 0);
    setMeteringHistory([]);
  };

  const handleClose = async () => {
    if (skipResetOnNextCloseRef.current) {
      skipResetOnNextCloseRef.current = false;
      return;
    }
    timerRef.current && clearInterval(timerRef.current);
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

    await cleanupRecording();
    setMeteringHistory([]);

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
      const status = await recording.getStatusAsync();
      const durationMs = status.durationMillis ?? elapsedRef.current;

      await recording.stopAndUnloadAsync();
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
        durationMs,
        contentType: "audio/m4a",
        contentLength: blob.size,
      });
      setState("done");
    } catch {
      setState("idle");
      Alert.alert("Error", "Could not save recording. Please try again.");
    }
  };

  const deleteRecording = () => {
    const performDelete = async () => {
      timerRef.current && clearInterval(timerRef.current);
      await cleanupRecording();
      elapsedRef.current = 0;
      setDraft(null);
      setElapsed(0);
      setMeteringHistory([]);
      setState("idle");
      preparePromiseRef.current = prepareRecordingSession();
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Delete audio pitch", "Cancel"],
          destructiveButtonIndex: 0,
          cancelButtonIndex: 1,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) performDelete();
        },
      );
      return;
    }

    Alert.alert("Delete recording?", "You'll lose this audio pitch.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: performDelete },
    ]);
  };

  const handleSave = () => {
    if (!draft) return;
    skipResetOnNextCloseRef.current = true;
    onSave(draft);
    onClose();
  };

  const isNearLimit =
    state === "recording" && elapsed >= MAX_RECORDING_MS - 30_000;

  const draftBarHeights = computeBarHeightsFromMetering(
    meteringHistory,
    BAR_COUNT,
  );

  return (
    <BottomSheetComponent
      ref={sheetRef}
      initialIndex={-1}
      onClose={handleClose}
      footer={
        state === "done" ? (
          <Box
            backgroundColor="white"
            paddingHorizontal="sm"
            paddingTop="xs"
            style={{
              paddingBottom: Math.max(bottom, 16),
              borderTopWidth: 1,
              borderTopColor: ColorPalette.gray100,
            }}
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
          <X size={24} color={ColorPalette.gray500} />
        </Pressable>
      </Box>

      <Box paddingHorizontal="sm" paddingBottom="lg" gap="lg">
        <Text variant="bodySmDefault" color="gray500">
          Record an audio pitch to add a personal touch.
        </Text>

        {state === "idle" || state === "processing" ? (
          <Box alignItems="center" gap="md" paddingTop="lg" paddingBottom="md">
            {state === "processing" ? (
              <Box
                backgroundColor="brand500"
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
            <Box
              borderRadius="md"
              paddingHorizontal="sm"
              style={{ height: 80 }}
            >
              <WaveformBars
                barHeights={draftBarHeights}
                barWidth={3}
                centerFade
                style={{ flex: 1 }}
              />
            </Box>
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
          /* done */
          draft && (
            <AudioPlayerContent
              audioUri={draft.uri}
              barHeights={draftBarHeights}
              trimStartMs={draft.trimStartMs}
              trimEndMs={draft.trimEndMs ?? draft.durationMs}
              onDelete={deleteRecording}
              showTrimButton
            />
          )
        )}
      </Box>
    </BottomSheetComponent>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ColorPalette.brand500,
  },
  stopBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorPalette.brand500,
    alignItems: "center",
    justifyContent: "center",
  },
});
