import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { parseLocalDate } from "@/utils/date-helpers";
import { useMemo, useRef, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

const CHIP_SIZE = 56;
const CHIP_TOTAL_WIDTH = CHIP_SIZE + Layout.spacing.xs; // chip + gap
const DAY_ABBREVIATIONS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_ABBREVIATIONS = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type DateItem = {
  dateString: string; // YYYY-MM-DD
  dayAbbrev: string; // SUN, MON, etc.
  dayNumber: number; // 1-31
  monthAbbrev: string; // JAN, FEB, etc.
};

type ItineraryDateSelectorProps = {
  startDate: string;
  endDate: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateDateRange(startISO: string, endISO: string): DateItem[] {
  const start = parseLocalDate(startISO);
  const end = parseLocalDate(endISO);
  const dates: DateItem[] = [];

  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");

    dates.push({
      dateString: `${year}-${month}-${day}`,
      dayAbbrev: DAY_ABBREVIATIONS[current.getDay()]!,
      dayNumber: current.getDate(),
      monthAbbrev: MONTH_ABBREVIATIONS[current.getMonth()]!,
    });

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryDateSelector({
  startDate,
  endDate,
  selectedDate,
  onSelectDate,
}: ItineraryDateSelectorProps) {
  const dates = useMemo(
    () => generateDateRange(startDate, endDate),
    [startDate, endDate],
  );

  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const selectedIndex = dates.findIndex(
      (d) => d.dateString === selectedDate,
    );
    if (selectedIndex > 0 && scrollViewRef.current) {
      const scrollX =
        selectedIndex * CHIP_TOTAL_WIDTH - Layout.spacing.sm;
      scrollViewRef.current.scrollTo({ x: Math.max(0, scrollX), animated: true });
    }
  }, [selectedDate, dates]);

  return (
    <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
      {dates.map((item) => {
        const isSelected = item.dateString === selectedDate;
        return (
          <Pressable
            key={item.dateString}
            onPress={() => onSelectDate(item.dateString)}
            accessibilityRole="button"
            accessibilityLabel={`${item.dayAbbrev} ${item.dayNumber}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Box
              width={CHIP_SIZE}
              height={CHIP_SIZE}
              borderRadius="full"
              alignItems="center"
              justifyContent="center"
              style={
                isSelected
                  ? styles.chipSelected
                  : styles.chipUnselected
              }
            >
              <Text
                variant="bodyXxsMedium"
                style={{
                  color: isSelected
                    ? ColorPalette.white
                    : ColorPalette.gray500,
                  fontSize: 10,
                  lineHeight: 12,
                }}
              >
                {item.dayAbbrev}
              </Text>
              <Text
                variant="bodySmMedium"
                style={{
                  color: isSelected
                    ? ColorPalette.white
                    : ColorPalette.gray900,
                  lineHeight: 18,
                }}
              >
                {item.dayNumber}
              </Text>
              <Text
                variant="bodyXxsMedium"
                style={{
                  color: isSelected
                    ? ColorPalette.white
                    : ColorPalette.gray400,
                  fontSize: 8,
                  lineHeight: 10,
                }}
              >
                {item.monthAbbrev}
              </Text>
            </Box>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  chipSelected: {
    backgroundColor: ColorPalette.brand500,
  },
  chipUnselected: {
    backgroundColor: "transparent",
  },
});

export default ItineraryDateSelector;
