import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { Timer } from "lucide-react-native";
import { useEffect, useState } from "react";

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
      borderRadius="lg"
      paddingVertical="sm"
    >
      <Text variant="headingMd" color="gray900">
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
    <Box backgroundColor="brand50" borderRadius="xl" padding="md" gap="sm">
      <Box flexDirection="row" alignItems="center" gap="sm">
        <Box
          width={40}
          height={40}
          borderRadius="full"
          alignItems="center"
          justifyContent="center"
          style={{ backgroundColor: ColorPalette.brand100 }}
        >
          <Timer size={22} color={ColorPalette.brand500} />
        </Box>
        <Box flexShrink={1}>
          <Text variant="bodySmMedium" color="gray900">
            Pitching is happening now!
          </Text>
          <Text variant="bodyXsDefault" color="gray700">
            Time remaining until pitching ends:
          </Text>
        </Box>
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
  );
}
