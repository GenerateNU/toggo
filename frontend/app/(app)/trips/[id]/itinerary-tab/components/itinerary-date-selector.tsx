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
  const contentWidthRef = useRef(0);
  const viewportWidthRef = useRef(0);

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
      const maxOffset = Math.max(
        0,
        contentWidthRef.current - viewportWidthRef.current,
      );
      const newOffset = Math.min(
        maxOffset,
        Math.max(0, scrollOffsetRef.current + dx),
      );
      scrollOffsetRef.current = newOffset;
      scrollViewRef.current?.scrollTo({ x: newOffset, animated: false });
    },
  }));

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { x: number } } }) => {
      scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
    },
    [],
  );

  const handleContentSizeChange = useCallback((w: number) => {
    contentWidthRef.current = w;
  }, []);

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => {
      viewportWidthRef.current = e.nativeEvent.layout.width;
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
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={16}
      >
        {dates.map((item) => {
          const isSelected = item.dateString === selectedDate;
          const isHovered =
            !isSelected && item.dateString === hoveredDate;
          const chipState = isHovered
            ? CHIP_STATES.hovered
            : isSelected
              ? CHIP_STATES.selected
              : CHIP_STATES.unselected;

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
                borderRadius="sm"
                alignItems="center"
                justifyContent="center"
                borderWidth={2}
                style={{
                  backgroundColor: chipState.backgroundColor,
                  borderColor: chipState.borderColor,
                }}
              >
                <Text
                  variant="bodyXxsMedium"
                  style={{
                    color: chipState.dayAbbrevColor,
                    lineHeight: 12,
                  }}
                >
                  {item.dayAbbrev}
                </Text>
                <Text
                  variant="headingMd"
                  style={{
                    color: chipState.dayNumberColor,
                  }}
                >
                  {item.dayNumber}
                </Text>
                <Text
                  variant="bodyXxsMedium"
                  style={{
                    color: chipState.monthColor,
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

const CHIP_STATES = {
  selected: {
    backgroundColor: ColorPalette.brand500,
    borderColor: "transparent",
    dayAbbrevColor: ColorPalette.white,
    dayNumberColor: ColorPalette.white,
    monthColor: ColorPalette.white,
  },
  unselected: {
    backgroundColor: ColorPalette.white,
    borderColor: "transparent",
    dayAbbrevColor: ColorPalette.gray500,
    dayNumberColor: ColorPalette.gray900,
    monthColor: ColorPalette.gray400,
  },
  hovered: {
    backgroundColor: ColorPalette.blue50,
    borderColor: ColorPalette.blue500,
    dayAbbrevColor: ColorPalette.gray500,
    dayNumberColor: ColorPalette.gray900,
    monthColor: ColorPalette.gray400,
  },
} as const;

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -Layout.spacing.sm,
  },
  content: {
    flexDirection: "row",
    gap: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
  },
});

export default ItineraryDateSelector;
