import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { CHIP_SIZE, CHIP_TOTAL_WIDTH } from "../constants";
import type { DateSelectorHandle, ItineraryDateSelectorProps } from "../types";
import { generateDateRange } from "../utils";

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
    <View ref={scrollViewNativeRef} collapsable={false} style={styles.container}>
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
  container: {
    marginHorizontal: -Layout.spacing.sm,
  },
  content: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
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
