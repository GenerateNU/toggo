import type { TimeValue } from "@/design-system";
import {
  Box,
  DateRangePicker,
  Text,
  TimePicker,
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
  const [timePickerVisible, setTimePickerVisible] = useState(false);

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

  const initialTime: TimeValue =
    deadline && hasTime
      ? (() => {
          const h = deadline.getHours();
          return {
            hour: h % 12 === 0 ? 12 : h % 12,
            minute: deadline.getMinutes(),
            period: h < 12 ? "AM" : "PM",
          };
        })()
      : { hour: 12, minute: 0, period: "PM" };

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
                  <Pressable onPress={() => setTimePickerVisible(true)}>
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
        onSave={(range) => {
          setDatePickerVisible(false);
          if (!range.start) {
            onDeadlineChange(null);
          } else {
            const combined = new Date(range.start);
            if (deadline && hasTime) {
              combined.setHours(
                deadline.getHours(),
                deadline.getMinutes(),
                0,
                0,
              );
            }
            onDeadlineChange(combined);
            setTimePickerVisible(true);
          }
        }}
        initialRange={{ start: deadline, end: null }}
        minDate={new Date()}
      />

      <TimePicker
        visible={timePickerVisible}
        initialTime={initialTime}
        onClose={() => setTimePickerVisible(false)}
        onSave={(time) => {
          if (!deadline) return;
          const combined = new Date(deadline);
          const h24 =
            time.period === "AM"
              ? time.hour === 12
                ? 0
                : time.hour
              : time.hour === 12
                ? 12
                : time.hour + 12;
          combined.setHours(h24, time.minute, 0, 0);
          onDeadlineChange(combined);
          setTimePickerVisible(false);
        }}
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