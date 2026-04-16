import {
  BottomSheet,
  Box,
  Button,
  DateRangePicker,
  Text,
} from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { CoreSize } from "@/design-system/tokens/core-size";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { Calendar, MapPin, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { DestinationPickerSheet } from "./destination-picker-sheet";
import type { SelectedLocation } from "./destination-picker-sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateTripParams = {
  locationName?: string;
  startDate?: string;
  endDate?: string;
};

type CreateTripSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  onCreate: (params: CreateTripParams) => void;
  onDismiss?: () => void;
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
  return `${start} – ${end}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTripSheet({
  bottomSheetRef,
  onCreate,
  onDismiss,
}: CreateTripSheetProps) {
  const destinationSheetRef = useRef<any>(null);

  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const handleDismiss = () => {
    resetState();
    onDismiss?.();
  };

  const resetState = () => {
    setSelectedLocation(null);
    setDateRange({ start: null, end: null });
  };

  const handleCreate = () => {
    const params: CreateTripParams = {
      locationName: selectedLocation?.name,
      startDate: dateRange.start?.toISOString(),
      endDate: dateRange.end?.toISOString(),
    };
    resetState();
    onCreate(params);
  };

  const formattedDates = formatDateRange(dateRange);

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        snapPoints={["55%"]}
        onClose={handleDismiss}
      >
        <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="lg" gap="md">
          {/* Close button */}
          <Box flexDirection="row" justifyContent="flex-end">
            <TouchableOpacity
              onPress={() => {
                bottomSheetRef.current?.close();
                handleDismiss();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={CoreSize.iconSm} color={ColorPalette.gray950} />
            </TouchableOpacity>
          </Box>

          <Box gap="xxs">
            <Text variant="headingMd" color="gray950">
              Plan a new trip
            </Text>
            <Text variant="bodyDefault" color="gray500">
              Where are you headed?
            </Text>
          </Box>

          <Box gap="sm">
            {/* Location field */}
            <TouchableOpacity
              onPress={() => destinationSheetRef.current?.snapToIndex(0)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Set destination"
            >
              <Box
                style={styles.fieldRow}
                flexDirection="row"
                alignItems="center"
                gap="xs"
              >
                <MapPin
                  size={CoreSize.xs}
                  color={
                    selectedLocation
                      ? ColorPalette.gray950
                      : ColorPalette.gray300
                  }
                />
                <Text
                  variant="bodyDefault"
                  color={selectedLocation ? "gray950" : "gray300"}
                  style={{ flex: 1 }}
                  numberOfLines={1}
                >
                  {selectedLocation?.name ?? "Destination"}
                </Text>
              </Box>
            </TouchableOpacity>

            {/* Date field */}
            <TouchableOpacity
              onPress={() => setIsDatePickerVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Set trip dates"
            >
              <Box
                style={styles.fieldRow}
                flexDirection="row"
                alignItems="center"
                gap="xs"
              >
                <Calendar
                  size={CoreSize.xs}
                  color={
                    formattedDates ? ColorPalette.gray950 : ColorPalette.gray300
                  }
                />
                <Text
                  variant="bodyDefault"
                  color={formattedDates ? "gray950" : "gray300"}
                >
                  {formattedDates ?? "Dates"}
                </Text>
              </Box>
            </TouchableOpacity>

            <Button
              layout="textOnly"
              label="Create Trip"
              variant="Primary"
              onPress={handleCreate}
            />
          </Box>
        </Box>
      </BottomSheet>

      <DestinationPickerSheet
        sheetRef={destinationSheetRef}
        onSelect={setSelectedLocation}
      />

      <DateRangePicker
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSave={(range) => {
          setDateRange(range);
          setIsDatePickerVisible(false);
        }}
        initialRange={dateRange}
        minDate={new Date()}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldRow: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    minHeight: 48,
  },
});
