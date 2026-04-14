import { BottomSheet, Box, Button, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { X } from "lucide-react-native";
import { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { DestinationPickerSheet } from "./destination-picker-sheet";
import type { SelectedLocation } from "./destination-picker-sheet";

// ─── Types ────────────────────────────────────────────────────────────────────

type TripReminderLocationSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  /** Called when user taps "Set Location". Parent is responsible for closing the sheet. */
  onSetLocation: (destination: string) => void;
  /** Called when user taps "Vote on a Location". Parent is responsible for closing the sheet. */
  onVoteOnLocation: () => void;
  /** Called when user taps X or the sheet is dismissed by gesture/backdrop. */
  onDismiss?: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripReminderLocationSheet({
  bottomSheetRef,
  onSetLocation,
  onVoteOnLocation,
  onDismiss,
}: TripReminderLocationSheetProps) {
  const destinationSheetRef = useRef<any>(null);
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);

  const handleSetLocation = () => {
    if (selectedLocation) {
      onSetLocation(selectedLocation.name);
    }
  };

  return (
    <>
      <BottomSheet ref={bottomSheetRef} size="xs" onClose={onDismiss}>
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
                Know where you're going?
              </Text>
              <TouchableOpacity
                onPress={() => bottomSheetRef.current?.close()}
                hitSlop={styles.hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={20} color={ColorPalette.gray950} />
              </TouchableOpacity>
            </Box>

            <Text variant="bodyDefault" color="gray500">
              Set your trip location
            </Text>
          </Box>

          <Box gap="sm">
            {/* Destination field — opens picker on tap */}
            <TouchableOpacity
              onPress={() => destinationSheetRef.current?.snapToIndex(0)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Search for a destination"
            >
              <Box style={styles.fieldRow} flexDirection="row" alignItems="center">
                <Text
                  variant="bodyDefault"
                  style={{
                    color: selectedLocation
                      ? ColorPalette.gray950
                      : ColorPalette.gray400,
                  }}
                  numberOfLines={1}
                >
                  {selectedLocation?.name ?? "Destination"}
                </Text>
              </Box>
            </TouchableOpacity>

            <Button
              layout="textOnly"
              label="Set Location"
              variant="Primary"
              onPress={handleSetLocation}
              disabled={!selectedLocation}
            />
            <Button
              layout="textOnly"
              label="Vote on a Location"
              variant="Secondary"
              onPress={onVoteOnLocation}
            />
          </Box>
        </Box>
      </BottomSheet>

      <DestinationPickerSheet
        sheetRef={destinationSheetRef}
        onSelect={setSelectedLocation}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  fieldRow: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    minHeight: 48,
    justifyContent: "center",
  },
});

export default TripReminderLocationSheet;
