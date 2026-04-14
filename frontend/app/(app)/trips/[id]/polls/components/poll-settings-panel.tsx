import type { TimeRange } from "@/design-system";
import {
  Box,
  DateRangePicker,
  Text,
  Toggle,
} from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type PollSettingsPanelProps = {
  deadline: Date | null;
  onDeadlineChange: (d: Date | null) => void;
  isAnonymous: boolean;
  onAnonymousChange: (v: boolean) => void;
};

// ─── SettingToggleRow ─────────────────────────────────────────────────────────

export function SettingToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="sm"
      paddingHorizontal="md"
      paddingVertical="sm"
      borderRadius="lg"
      backgroundColor="gray50"
    >
      <Text variant="bodySmMedium" color="gray900" style={{ flex: 1 }}>
        {label}
      </Text>
      <Toggle
        value={value}
        onChange={onChange}
        onColor={ColorPalette.blue500}
        compact
      />
    </Box>
  );
}

// ─── PollSettingsPanel ────────────────────────────────────────────────────────

export function PollSettingsPanel({
  deadline,
  onDeadlineChange,
  isAnonymous,
  onAnonymousChange,
}: PollSettingsPanelProps) {
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const hasTime =
    deadline && (deadline.getHours() !== 0 || deadline.getMinutes() !== 0);

  const dateLabel = deadline
    ? deadline.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const timeLabel =
    deadline && hasTime
      ? deadline.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : null;

  const initialTimeRange: TimeRange | undefined =
    deadline && hasTime
      ? {
          start: {
            hour: deadline.getHours() % 12 === 0 ? 12 : deadline.getHours() % 12,
            minute: deadline.getMinutes(),
            period: deadline.getHours() < 12 ? "AM" : "PM",
          },
          end: null,
        }
      : undefined;

  return (
    <Box gap="md">
      <Text variant="bodyXsMedium" color="gray500">
        Settings
      </Text>

      <Box gap="sm">
        {/* Deadline */}
        <Box
          flexDirection="row"
          alignItems="center"
          gap="sm"
          paddingHorizontal="md"
          paddingVertical="sm"
          borderRadius="lg"
          backgroundColor="gray50"
        >
          <Box flex={1} gap="xxs">
            <Text variant="bodySmMedium" color="gray900">
              Deadline
            </Text>
            {deadline && (
              <Box flexDirection="row" gap="xs">
                <Pressable onPress={() => setDatePickerVisible(true)}>
                  <Box style={styles.deadlineChip}>
                    <Text
                      variant="bodyXsDefault"
                      style={{ color: ColorPalette.blue500 }}
                    >
                      {dateLabel}
                    </Text>
                  </Box>
                </Pressable>
                {timeLabel && (
                  <Pressable onPress={() => setDatePickerVisible(true)}>
                    <Box style={styles.deadlineChip}>
                      <Text
                        variant="bodyXsDefault"
                        style={{ color: ColorPalette.blue500 }}
                      >
                        {timeLabel}
                      </Text>
                    </Box>
                  </Pressable>
                )}
              </Box>
            )}
          </Box>
          <Toggle
            value={Boolean(deadline)}
            onChange={(enabled) => {
              if (!enabled) {
                onDeadlineChange(null);
                return;
              }
              setDatePickerVisible(true);
            }}
            onColor={ColorPalette.blue500}
            compact
          />
        </Box>

        {/* Anonymous responses */}
        <SettingToggleRow
          label="Anonymous responses"
          value={isAnonymous}
          onChange={onAnonymousChange}
        />
      </Box>

      <DateRangePicker
        visible={datePickerVisible}
        onClose={() => setDatePickerVisible(false)}
        onSave={(range, timeRange) => {
          setDatePickerVisible(false);
          if (!range.start) {
            onDeadlineChange(null);
            return;
          }
          const combined = new Date(range.start);
          if (timeRange.start) {
            const h24 =
              timeRange.start.period === "AM"
                ? timeRange.start.hour === 12
                  ? 0
                  : timeRange.start.hour
                : timeRange.start.hour === 12
                  ? 12
                  : timeRange.start.hour + 12;
            combined.setHours(h24, timeRange.start.minute, 0, 0);
          }
          onDeadlineChange(combined);
        }}
        singleDate
        allowSelectTime
        singleTimeSelection
        initialRange={{ start: deadline, end: null }}
        initialTimeRange={initialTimeRange}
        minDate={new Date()}
      />
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  deadlineChip: {
    backgroundColor: ColorPalette.white,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
