import { Box, Text } from "@/design-system";
import { AddDeadline } from "./add-deadline";
import { Countdown } from "./countdown";
import { SegmentedTabs } from "./tab";

interface PitchesHeaderProps {
  tab: "pitches" | "ranking";
  isLoading: boolean;
  deadline: Date | null;
  pitchCount: number;
  hasCurrentUserPitch: boolean;
  onTabChange: (tab: "pitches" | "ranking") => void;
  onPressAddDeadline: () => void;
}

export function PitchesHeader({
  tab,
  isLoading,
  deadline,
  pitchCount,
  hasCurrentUserPitch,
  onTabChange,
  onPressAddDeadline,
}: PitchesHeaderProps) {
  const hasPitches = pitchCount > 0;

  return (
    <Box marginTop="xl" paddingHorizontal="sm" gap="sm" backgroundColor="white">
      <SegmentedTabs value={tab} onChange={onTabChange} />
      {!isLoading &&
        hasPitches &&
        deadline &&
        !hasCurrentUserPitch &&
        tab === "pitches" && <Countdown deadline={deadline} />}
      {!isLoading && !deadline && tab === "pitches" && (
        <AddDeadline onPress={onPressAddDeadline} />
      )}
      {!isLoading && hasPitches && tab === "pitches" && (
        <Text variant="bodyXsDefault" color="gray500">
          {pitchCount} {pitchCount === 1 ? "pitch" : "pitches"} added
        </Text>
      )}
    </Box>
  );
}
