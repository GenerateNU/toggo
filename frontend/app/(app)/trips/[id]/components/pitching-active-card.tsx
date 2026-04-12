import { usePitchesList } from "@/api/pitches/custom/usePitchesList";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { LinearGradient } from "expo-linear-gradient";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

interface PitchingActiveCardProps {
  tripID: string;
  deadline: Date;
  onViewPitches: () => void;
}

function formatCountdown(deadline: Date): string {
  const diff = Math.max(0, deadline.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function PitchingActiveCard({
  tripID,
  deadline,
  onViewPitches,
}: PitchingActiveCardProps) {
  const [dismissed, setDismissed] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(deadline));
  const { pitches } = usePitchesList(tripID);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (dismissed) return null;

  const pitchCount = pitches.length;

  return (
    <Box borderRadius="xl" backgroundColor="white" style={styles.shadow}>
      <Box borderRadius="xl" overflow="hidden">
        <LinearGradient
          colors={[
            ColorPalette.white,
            ColorPalette.white,
            ColorPalette.brand50,
            ColorPalette.brand100,
            ColorPalette.brand200,
            ColorPalette.brand300,
            ColorPalette.brand500,
          ]}
          locations={[0, 0.3, 0.5, 0.6, 0.7, 0.8, 1]}
          start={{ x: 0.3, y: 0.2 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Pressable
            style={styles.dismissButton}
            onPress={() => setDismissed(true)}
          >
            <X size={16} color={ColorPalette.gray400} />
          </Pressable>

          <Box gap="xxs" paddingRight="lg">
            <Text variant="bodyMedium" color="gray900">
              Destination pitching happening now! 🌍🎉
            </Text>
            <Text variant="bodyXsDefault" color="gray500">
              {pitchCount} {pitchCount === 1 ? "pitch" : "pitches"} •{" "}
              {countdown}
            </Text>
          </Box>

          <Pressable style={styles.viewButton} onPress={onViewPitches}>
            <Text variant="bodySmMedium" style={styles.viewButtonText}>
              View pitches →
            </Text>
          </Pressable>
        </LinearGradient>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: ColorPalette.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  dismissButton: {
    position: "absolute",
    top: 12,
    right: 12,
    padding: 4,
  },
  viewButton: {
    backgroundColor: ColorPalette.brand500,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: CornerRadius.md,
    alignSelf: "flex-start",
  },
  viewButtonText: {
    color: ColorPalette.white,
  },
});
