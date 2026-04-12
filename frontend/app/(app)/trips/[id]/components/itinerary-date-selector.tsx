import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { parseLocalDate } from "@/utils/date-helpers";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CHIP_SIZE = 56;
export const CHIP_TOTAL_WIDTH = CHIP_SIZE + Layout.spacing.xs;

const DAY_ABBREVIATIONS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_ABBREVIATIONS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type DateItem = {
  dateString: string;
  dayAbbrev: string;
  dayNumber: number;
  monthAbbrev: string;
};

type ItineraryDateSelectorProps = {
  startDate: string;
  endDate: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  hoveredDate?: string | null;
};

export type DateSelectorHandle = {
  measureScrollView: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  getScrollOffset: () => number;
  scrollBy: (dx: number) => void;
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

export const ItineraryDateSelector = forwardRef<
  DateSelectorHandle,
  ItineraryDateSelectorProps
>(function ItineraryDateSelector(
  { startDate, endDate, selectedDate, onSelectDate, hoveredDate },
  ref,
) {
  const dates = useMemo(
    () => generateDateRange(startDate, endDate),
    [startDate, endDate],
  );

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewNativeRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);

  useEffect(() => {
    const selectedIndex = dates.findIndex(
      (d) => d.dateString === selectedDate,
    );
    if (selectedIndex > 0 && scrollViewRef.current) {
      const scrollX = selectedIndex * CHIP_TOTAL_WIDTH - Layout.spacing.sm;
      scrollViewRef.current.scrollTo({
        x: Math.max(0, scrollX),
        animated: true,
      });
    }
  }, [selectedDate, dates]);

  useImperativeHandle(ref, () => ({
    measureScrollView: () =>
      new Promise((resolve) => {
        scrollViewNativeRef.current?.measureInWindow((x, y, width, height) => {
          resolve({ x, y, width, height });
        });
      }),
    getScrollOffset: () => scrollOffsetRef.current,
    scrollBy: (dx: number) => {
      const newOffset = Math.max(0, scrollOffsetRef.current + dx);
      scrollViewRef.current?.scrollTo({ x: newOffset, animated: false });
    },
  }));

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
    },
    [],
  );

  return (
    <View ref={scrollViewNativeRef} collapsable={false}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {dates.map((item) => {
          const isSelected = item.dateString === selectedDate;
          const isHovered = item.dateString === hoveredDate;
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
                borderRadius="md"
                alignItems="center"
                justifyContent="center"
                borderWidth={2}
                style={[
                  isSelected ? styles.chipSelected : styles.chipUnselected,
                  isHovered && !isSelected && styles.chipHovered,
                ]}
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
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
  },
  chipSelected: {
    backgroundColor: ColorPalette.brand500,
    borderColor: "transparent",
  },
  chipUnselected: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  chipHovered: {
    borderColor: ColorPalette.blue500,
    backgroundColor: ColorPalette.blue50,
  },
});

export default ItineraryDateSelector;
