import {
  BottomSheet,
  Box,
  Button,
  DateRangePicker,
  Text,
} from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { Calendar, X } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripReminderDateSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  /** Called when user taps "Set Date" with a valid range. Parent is responsible for closing the sheet. */
  onSetDate: (range: DateRange) => void;
  /** Called when user taps "Skip for now" or the X button. Parent is responsible for closing the sheet. */
  onSkip: () => void;
  /** Called when the sheet is dismissed by gesture or backdrop tap (not button presses). */
  onDismiss?: () => void;
  /** Error message to display in the sheet. */
  error?: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

function formatDateRange(range: DateRange): string | null {
  if (!range.start) return null;
  const start = range.start.toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
  if (!range.end) return start;
  const end = range.end.toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
  return `${start} - ${end}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TripReminderDateSheet({
  bottomSheetRef,
  onSetDate,
  onSkip,
  onDismiss,
  error,
}: TripReminderDateSheetProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const formattedDates = formatDateRange(dateRange);
  const hasDateSelected = !!dateRange.start;

  return (
    <>
      <BottomSheet ref={bottomSheetRef} onClose={onDismiss}>
        <Box
          flex={1}
          paddingHorizontal="sm"
          paddingBottom="lg"
          justifyContent="flex-end"
          gap="sm"
        >
          <Box gap="xxs">
            <Box flexDirection="row" justifyContent="space-between">
              <Text variant="headingMd" color="gray950">
                Lock in the dates
              </Text>
              <TouchableOpacity
                onPress={onSkip}
                hitSlop={styles.hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={ColorPalette.gray950} />
              </TouchableOpacity>
            </Box>
            <Text variant="bodyDefault" color="gray500">
              Set your trip dates
            </Text>
          </Box>

          <Box gap="sm">
            <TouchableOpacity
              onPress={() => setIsPickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Select trip dates"
            >
              <Box
                style={styles.dateField}
                flexDirection="row"
                alignItems="center"
                gap="xs"
              >
                <Calendar
                  size={16}
                  color={
                    hasDateSelected
                      ? ColorPalette.gray950
                      : ColorPalette.gray300
                  }
                />
                <Text
                  variant="bodyDefault"
                  color={hasDateSelected ? "gray950" : "gray300"}
                >
                  {formattedDates ?? "Dates"}
                </Text>
              </Box>
            </TouchableOpacity>

            {error && (
              <Box
                padding="sm"
                backgroundColor="gray50"
                borderRadius="sm"
                borderWidth={1}
                borderColor="statusError"
              >
                <Text variant="bodySmDefault" color="statusError">
                  {error}
                </Text>
              </Box>
            )}

            <Button
              layout="textOnly"
              label="Set Date"
              variant="Primary"
              disabled={!hasDateSelected}
              onPress={() => onSetDate(dateRange)}
            />
            <Button
              layout="textOnly"
              label="Skip for now"
              variant="Tertiary"
              onPress={onSkip}
            />
          </Box>
        </Box>
      </BottomSheet>

      <DateRangePicker
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSave={(range) => {
          setDateRange(range);
          setIsPickerVisible(false);
        }}
        initialRange={dateRange}
        minDate={new Date()}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  dateField: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    minHeight: 48,
  },
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
});

export default TripReminderDateSheet;
