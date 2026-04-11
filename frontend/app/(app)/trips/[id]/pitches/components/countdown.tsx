import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

interface CountdownProps {
  deadline: Date;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(deadline: Date): TimeLeft {
  const diff = Math.max(0, deadline.getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <Box
      flex={1}
      backgroundColor="white"
      alignItems="center"
      justifyContent="center"
      borderRadius="xl"
      paddingVertical="sm"
      style={styles.timeUnit}
    >
      <Text variant="headingMd" color="gray900" style={styles.tabular}>
        {pad(value)}
      </Text>
      <Text variant="bodyXsDefault" color="gray500">
        {label}
      </Text>
    </Box>
  );
}

export function Countdown({ deadline }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(deadline),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return (
    <Box borderRadius="xl" backgroundColor="white" style={styles.cardShadow}>
      <Box borderRadius="xl" overflow="hidden">
        <LinearGradient
          colors={[
            ColorPalette.brand200,
            ColorPalette.brand50,
            ColorPalette.white,
            ColorPalette.brand100,
            ColorPalette.brand200,
            ColorPalette.brand400,
          ]}
          locations={[0, 0.14, 0.34, 0.62, 0.82, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0.05 }}
          style={styles.card}
        >
          <Box gap="sm">
            <Box gap="xxs">
              <Text variant="bodySmMedium" color="gray900">
                Pitching is happening now!
              </Text>
              <Text variant="bodyXsDefault" color="gray700">
                Time remaining until pitching ends:
              </Text>
            </Box>

            <Box flexDirection="row" alignItems="center" gap="xs">
              <TimeUnit value={timeLeft.hours} label="Hours" />
              <Text variant="bodyMedium" color="gray700">
                :
              </Text>
              <TimeUnit value={timeLeft.minutes} label="Minutes" />
              <Text variant="bodyMedium" color="gray700">
                :
              </Text>
              <TimeUnit value={timeLeft.seconds} label="Seconds" />
            </Box>
          </Box>
        </LinearGradient>
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: ColorPalette.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  card: {
    padding: 16,
  },
  timeUnit: {
    shadowColor: ColorPalette.black,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabular: {
    fontVariant: ["tabular-nums"],
  },
});
