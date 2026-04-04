import { BottomSheet, Box, Button, Divider, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { X } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

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
  const [destination, setDestination] = useState("");

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={["55%"]}
      onClose={onDismiss}
    >
      <Box paddingHorizontal="sm" paddingTop="sm" paddingBottom="lg" gap="md">
        <Box flexDirection="row" justifyContent="flex-end">
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={styles.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={20} color={ColorPalette.gray950} />
          </TouchableOpacity>
        </Box>

        <Box gap="xxs">
          <Text variant="headingMd" color="gray950">
            Know where you're going?
          </Text>
          <Text variant="bodyDefault" color="gray500">
            Set your trip location
          </Text>
        </Box>

        <Box gap="sm">
          <TextField
            placeholder="Destination"
            value={destination}
            onChangeText={setDestination}
            autoCapitalize="words"
          />
          <Button
            layout="textOnly"
            label="Set Location"
            variant="Primary"
            onPress={() => onSetLocation(destination)}
          />
          <Button
            layout="textOnly"
            label="Vote on a Location"
            variant="Secondary"
            onPress={onVoteOnLocation}
          />
        </Box>

        <Divider />
      </Box>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
});
