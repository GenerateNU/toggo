import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import InlineTimePicker from "./inline-time-picker";
import type { TimeRange } from "./inline-time-picker";
import { ColorPalette } from "../tokens/color";
import { CornerRadius } from "../tokens/corner-radius";
import { Layout } from "../tokens/layout";

export type { TimeRange } from "./inline-time-picker";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DateRange = { start: Date | null; end: Date | null };

const DEFAULT_TIME_RANGE: TimeRange = { start: null, end: null };

export type DateRangePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (range: DateRange, timeRange: TimeRange) => void;
  initialRange?: DateRange;
  monthsToShow?: number;
  minDate?: Date;
  singleDate?: boolean;
  /** When true, renders an inline time picker above the calendar. */
  allowSelectTime?: boolean;
  /** When true, the time picker only allows a single time (no range). */
  singleTimeSelection?: boolean;
  initialTimeRange?: TimeRange;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isToday = (d: Date) => isSameDay(d, new Date());

const isBetween = (date: Date, start: Date, end: Date) =>
  date > start && date < end;

const getMonthData = (year: number, month: number) => ({
  firstDay: new Date(year, month, 1).getDay(),
  daysInMonth: new Date(year, month + 1, 0).getDate(),
});

const formatMonth = (year: number, month: number) =>
  new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

const formatShortDate = (d: Date | null) =>
  d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";

// ─── Dimensions ──────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get("window").width;
const GRID_PADDING = Layout.spacing.sm;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2) / 7);
const CIRCLE_SIZE = CELL_SIZE - 8;

// ─── Day Cell ────────────────────────────────────────────────────────────────

type DayCellProps = {
  day: number;
  date: Date;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isSingleSelect: boolean;
  isDisabled: boolean;
  onPress: (date: Date) => void;
};

const DayCell = React.memo(
  ({
    day,
    date,
    isStart,
    isEnd,
    isInRange,
    isSingleSelect,
    isDisabled,
    onPress,
  }: DayCellProps) => {
    const isEndpoint = isStart || isEnd;
    const today = isToday(date);

    // Hide the range band entirely when only a single date is selected
    const showRangeBand = !isSingleSelect && (isInRange || isStart || isEnd);

    return (
      <Pressable
        onPress={() => onPress(date)}
        disabled={isDisabled}
        accessibilityState={{ disabled: isDisabled }}
        style={styles.dayOuter}
      >
        {/* Range band */}
        {showRangeBand && (
          <Box
            style={[
              styles.rangeBand,
              isStart && styles.rangeBandStart,
              isEnd && styles.rangeBandEnd,
            ]}
          />
        )}

        {/* Day circle */}
        <Box
          style={[
            styles.dayCircle,
            isEndpoint && styles.dayCircleSelected,
            today && !isEndpoint && styles.dayCircleToday,
          ]}
        >
          <Text
            variant="bodyMedium"
            style={{
              color: isEndpoint
                ? ColorPalette.gray50
                : isDisabled
                  ? ColorPalette.gray400
                  : ColorPalette.gray900,
            }}
          >
            {day}
          </Text>
        </Box>
      </Pressable>
    );
  },
);
DayCell.displayName = "DayCell";

// ─── Month Grid ──────────────────────────────────────────────────────────────

type MonthGridProps = {
  year: number;
  month: number;
  range: DateRange;
  minDate?: Date;
  onDayPress: (date: Date) => void;
};

const MonthGrid = React.memo(
  ({ year, month, range, minDate, onDayPress }: MonthGridProps) => {
    const { firstDay, daysInMonth } = getMonthData(year, month);

    // Determine if only a single date is selected (no distinct end)
    const isSingleSelect =
      !!range.start && (!range.end || isSameDay(range.start, range.end));

    const weeks = useMemo(() => {
      const rows: (number | null)[][] = [];
      let row: (number | null)[] = Array(firstDay).fill(null);
      for (let d = 1; d <= daysInMonth; d++) {
        row.push(d);
        if (row.length === 7) {
          rows.push(row);
          row = [];
        }
      }
      if (row.length) {
        while (row.length < 7) row.push(null);
        rows.push(row);
      }
      return rows;
    }, [firstDay, daysInMonth]);

    return (
      <Box style={styles.monthBlock}>
        <Text variant="bodyLargeStrong">
          {formatMonth(year, month)}
        </Text>

        {weeks.map((week, wi) => (
          <Box key={wi} flexDirection="row">
            {week.map((day, di) => {
              if (!day) return <Box key={di} style={styles.dayOuter} />;

              const date = new Date(year, month, day);
              const { start, end } = range;

              return (
                <DayCell
                  key={di}
                  day={day}
                  date={date}
                  isStart={!!start && isSameDay(date, start)}
                  isEnd={!!end && isSameDay(date, end)}
                  isInRange={!!start && !!end && isBetween(date, start, end)}
                  isSingleSelect={isSingleSelect}
                  isDisabled={
                    !!minDate && date < minDate && !isSameDay(date, minDate)
                  }
                  onPress={onDayPress}
                />
              );
            })}
          </Box>
        ))}
      </Box>
    );
  },
);
MonthGrid.displayName = "MonthGrid";

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DateRangePicker({
  visible,
  onClose,
  onSave,
  initialRange = { start: null, end: null },
  monthsToShow = 12,
  minDate,
  singleDate = false,
  allowSelectTime = false,
  singleTimeSelection = false,
  initialTimeRange,
}: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialTimeRange ?? DEFAULT_TIME_RANGE,
  );

  // Initialize range and time when modal opens
  useEffect(() => {
    if (visible) {
      // Only clear if no initialRange provided, otherwise use initialRange
      if (!initialRange.start && !initialRange.end) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRange({ start: null, end: null });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRange(initialRange);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeRange(initialTimeRange ?? DEFAULT_TIME_RANGE);
    }
  }, [visible, initialRange, initialTimeRange]);

  // Normalize minDate to midnight for accurate date comparisons
  const normalizedMinDate = useMemo(() => {
    if (!minDate) return undefined;
    const normalized = new Date(minDate);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }, [minDate]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: monthsToShow }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, [monthsToShow]);

  // ─── selection logic ─────────────────────────────────────────
  //
  // End date is NEVER null after a selection (only via Clear button).
  // 1. Nothing selected → single-day range
  // 2. Single-day range (start === end):
  //    - tap same day     → no-op
  //    - tap before       → single-day range on new date
  //    - tap after        → extend end
  // 3. Distinct range:
  //    - tap on start/end → collapse to single-day range
  //    - tap before start → single-day range on new date
  //    - tap after end    → move end
  //    - tap between      → collapse to single-day range on new date
  const handleDayPress = useCallback(
    (date: Date) => {
      if (singleDate) {
        setRange({ start: date, end: date });
        return;
      }

      setRange((prev) => {
        const { start, end } = prev;

        // Case 1: nothing selected
        if (!start) {
          return { start: date, end: date };
        }

        // Case 2: single-day range (start === end)
        if (end && isSameDay(start, end)) {
          if (isSameDay(date, start)) {
            // Re-tapping the same day — do nothing
            return prev;
          }
          if (date < start) {
            return { start: date, end: date };
          }
          return { start, end: date };
        }

        // Case 3: both start and end are selected (distinct range)
        if (isSameDay(date, start) || (end && isSameDay(date, end))) {
          return { start: date, end: date };
        }
        if (date < start) {
          return { start: date, end: date };
        }
        if (end && date > end) {
          return { start, end: date };
        }
        // date is between start and end → collapse to single-day range
        return { start: date, end: date };
      });
    },
    [singleDate],
  );

  const handleClear = () => {
    setRange({ start: null, end: null });
    setTimeRange(DEFAULT_TIME_RANGE);
  };

  const handleSave = () => {
    onSave(range, timeRange);
    onClose();
  };

  const hasRange = !!range.start;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box style={styles.sheet}>
        {/* ─── Header ───────────────────────────────────────────────── */}
        <Box style={styles.header}>
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            padding="xs"
          >
            <Pressable
              onPress={onClose}
              hitSlop={16}
              style={styles.closeButton}
            >
              <X size={24} />
            </Pressable>
            <Text variant="headingSm">
              Select dates
            </Text>
          </Box>

          {/* Selection summary pill */}
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            style={styles.summaryRow}
          >
            <Box
              style={[styles.summaryPill, hasRange && styles.summaryPillActive]}
            >
              <Text
                variant="bodySmMedium"
                style={{
                  color: hasRange ? ColorPalette.gray900 : ColorPalette.gray500,
                }}
              >
                {formatShortDate(range.start)}
              </Text>
            </Box>
            <Text
              variant="bodyXsMedium"
              color="gray500"
              style={styles.summaryArrow}
            >
              →
            </Text>
            <Box
              style={[
                styles.summaryPill,
                !!range.end && styles.summaryPillActive,
              ]}
            >
              <Text
                variant="bodySmMedium"
                style={{
                  color: range.end
                    ? ColorPalette.gray900
                    : ColorPalette.gray500,
                }}
              >
                {formatShortDate(range.end)}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* ─── Weekday labels ───────────────────────────────────────── */}
        <Box flexDirection="row" style={styles.weekdayRow}>
          {DAYS.map((d, i) => (
            <Box key={i} style={styles.weekdayCell}>
              <Text variant="bodyMedium" color="gray500">
                {d}
              </Text>
            </Box>
          ))}
        </Box>

        {/* ─── Calendar + optional time picker ─────────────────────── */}
        <Box style={styles.calendarArea}>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              allowSelectTime && styles.scrollContentWithTimePicker,
            ]}
          >
            {months.map(({ year, month }) => (
              <MonthGrid
                key={`${year}-${month}`}
                year={year}
                month={month}
                range={range}
                minDate={normalizedMinDate}
                onDayPress={handleDayPress}
              />
            ))}
          </ScrollView>

          {allowSelectTime && (
            <Box style={styles.timePickerOverlay}>
              <InlineTimePicker
                singleTime={singleTimeSelection}
                value={timeRange}
                onChange={setTimeRange}
              />
            </Box>
          )}
        </Box>

        {/* ─── Footer ───────────────────────────────────────────────── */}
        <Box style={[styles.footer, { paddingBottom: Layout.spacing.md }]}>
          <Box flexDirection="row" style={styles.footerButtons}>
            {/* Clear button */}
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.footerButtonBase,
                styles.clearButton,
                pressed && styles.clearButtonPressed,
                !hasRange && styles.clearButtonDisabled,
              ]}
              disabled={!hasRange}
            >
              <Text
                variant="bodyMedium"
                style={{
                  color: hasRange ? ColorPalette.gray900 : ColorPalette.gray400,
                }}
              >
                Clear
              </Text>
            </Pressable>

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.footerButtonBase,
                styles.saveButton,
                pressed && styles.saveButtonPressed,
                !hasRange && styles.saveButtonDisabled,
              ]}
              disabled={!hasRange}
            >
              <Text variant="bodyMedium" style={{ color: ColorPalette.white }}>
                Save Dates
              </Text>
            </Pressable>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const RANGE_TINT = ColorPalette.blue25;

const styles = StyleSheet.create({
  /* Sheet */
  sheet: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },

  /* Header */
  header: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: Layout.spacing.sm,
    paddingBottom: Layout.spacing.xs,
  },
  closeButton: {
    position: "absolute",
    right: 0,
  },

  /* Selection summary */
  summaryRow: {
    marginVertical: Layout.spacing.xs,
    gap: Layout.spacing.xs,
  },
  summaryPill: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.gray50,
  },
  summaryPillActive: {
    backgroundColor: ColorPalette.gray50,
    borderColor: ColorPalette.gray300,
  },
  summaryArrow: {
    marginHorizontal: Layout.spacing.xxs,
  },

  /* Weekday labels */
  weekdayRow: {
    paddingHorizontal: GRID_PADDING,
    paddingVertical: Layout.spacing.xs,
    marginBottom: Layout.spacing.xs,
    backgroundColor: ColorPalette.gray50,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: "center",
  },

  /* Calendar area (scroll + optional time picker overlay) */
  calendarArea: {
    flex: 1,
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Layout.spacing.xs,
    paddingBottom: 120,
  },
  scrollContentWithTimePicker: {
    paddingBottom: 340,
  },

  /* Time picker overlay */
  timePickerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  /* Month */
  monthBlock: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: Layout.spacing.md,
  },

  /* Day outer wrapper */
  dayOuter: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Range band */
  rangeBand: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RANGE_TINT,
    height: "75%",
    top: "12.5%",
  },
  rangeBandStart: {
    left: "50%",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  rangeBandEnd: {
    right: "50%",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  /* Day circle */
  dayCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: ColorPalette.blue500,
    borderRadius: CIRCLE_SIZE / 2,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: ColorPalette.gray300,
    borderRadius: CIRCLE_SIZE / 2,
  },

  /* Footer */
  footer: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: Layout.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ColorPalette.gray300,
    backgroundColor: ColorPalette.white,
  },
  footerButtons: {
    gap: 10,
    flexDirection: "row",
  },
  footerButtonBase: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 14,
    borderRadius: CornerRadius.md,
  },
  clearButton: {
    borderColor: ColorPalette.gray300,
    backgroundColor: ColorPalette.gray50,
  },
  clearButtonPressed: {
    opacity: 0.85,
  },
  clearButtonDisabled: {
    borderColor: ColorPalette.gray100,
  },
  saveButton: {
    backgroundColor: ColorPalette.brand500,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    backgroundColor: ColorPalette.gray300,
  },
});
