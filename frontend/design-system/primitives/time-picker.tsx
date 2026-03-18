import BottomSheetComponent from "../components/bottom-sheet/bottom-sheet";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { Box } from "../primitives/box";
import { Text } from "../primitives/text";
import { ColorPalette } from "../tokens/color";
import { CornerRadius } from "../tokens/corner-radius";
import { Layout } from "../tokens/layout";

export type TimeValue = { hour: number; minute: number; period: "AM" | "PM" };

export type TimePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (time: TimeValue) => void;
  initialTime?: TimeValue;
};

function timeValueToDate(t: TimeValue): Date {
  const d = new Date();
  const h24 =
    t.period === "AM"
      ? t.hour === 12
        ? 0
        : t.hour
      : t.hour === 12
        ? 12
        : t.hour + 12;
  d.setHours(h24, t.minute, 0, 0);
  return d;
}

function dateToTimeValue(d: Date): TimeValue {
  const h = d.getHours();
  return {
    hour: h % 12 === 0 ? 12 : h % 12,
    minute: d.getMinutes(),
    period: h < 12 ? "AM" : "PM",
  };
}

export default function TimePicker({
  visible,
  onClose,
  onSave,
  initialTime = { hour: 12, minute: 0, period: "AM" },
}: TimePickerProps) {
  const [date, setDate] = useState(() => timeValueToDate(initialTime));
  const [prevVisible, setPrevVisible] = useState(visible);
  const sheetRef = useRef<BottomSheetMethods>(null);

  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setDate(timeValueToDate(initialTime));
  }

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleSave = () => {
    onSave(dateToTimeValue(date));
  };

  return (
    <BottomSheetComponent
      ref={sheetRef}
      snapPoints={["42%"]}
      initialIndex={-1}
      onClose={onClose}
      disableClose
      footer={
        <Box style={styles.footer}>
          <Box flexDirection="row" style={styles.footerButtons}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text variant="mdLabel" color="textSecondary">
                Cancel
              </Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text variant="mdLabel" style={{ color: ColorPalette.white }}>
                Save Time
              </Text>
            </Pressable>
          </Box>
        </Box>
      }
    >
      <Box style={styles.header}>
        <Text variant="mdHeading" color="textSecondary">
          Select time
        </Text>
      </Box>
      <Box alignItems="center">
        <DateTimePicker
          value={date}
          mode="time"
          display="spinner"
          onChange={(_, selected) => {
            if (selected) setDate(selected);
          }}
          style={styles.picker}
        />
      </Box>
    </BottomSheetComponent>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Layout.spacing.sm,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: "center",
  },

  picker: {
    width: 200,
  },

  footer: {
    paddingHorizontal: Layout.spacing.sm,
    paddingTop: Layout.spacing.xs,
    paddingBottom: Layout.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ColorPalette.borderPrimary,
    backgroundColor: ColorPalette.white,
  },

  footerButtons: {
    gap: 10,
    flexDirection: "row",
  },

  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: CornerRadius.md,
    borderWidth: 1,
    borderColor: ColorPalette.borderPrimary,
    backgroundColor: ColorPalette.white,
  },

  saveButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.black,
  },
});
