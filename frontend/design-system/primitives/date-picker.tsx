import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import React, { useCallback, useMemo, useState } from "react";
import {
    Dimensions,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
} from "react-native";
import { ColorPalette } from "../tokens/color";
import { CornerRadius } from "../tokens/corner-radius";
import { Layout } from "../tokens/layout";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DateRange = { start: Date | null; end: Date | null };

export type DateRangePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (range: DateRange) => void;
  initialRange?: DateRange;
  monthsToShow?: number;
  minDate?: Date;
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
const GRID_PADDING = Layout.spacing.sm; // horizontal padding around the grid
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_PADDING * 2) / 7);

// ─── Day Cell ────────────────────────────────────────────────────────────────

type DayCellProps = {
  day: number;
  date: Date;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
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
    isDisabled,
    onPress,
  }: DayCellProps) => {
    const isEndpoint = isStart || isEnd;
    const isSingle = isStart && isEnd;
    const today = isToday(date);

    return (
      <Pressable
        onPress={() => !isDisabled && onPress(date)}
        style={styles.dayOuter}
      >
        {/* Range band — the coloured rectangle behind the circle that visually
            connects the start day to the end day. */}
        {!isSingle && (isInRange || isStart || isEnd) && (
          <Box
            style={[
              styles.rangeBand,
              isStart && styles.rangeBandStart,
              isEnd && styles.rangeBandEnd,
            ]}
          />
        )}

        {/* Day circle / pill */}
        <Box
          style={[
            styles.dayCircle,
            isEndpoint && styles.dayCircleSelected,
            today && !isEndpoint && styles.dayCircleToday,
          ]}
        >
          <Text
            variant="smLabel"
            style={{
              color: isEndpoint
                ? ColorPalette.white
                : isDisabled
                  ? ColorPalette.textDisabled
                  : ColorPalette.textSecondary,
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
        <Text variant="smHeading" color="textSecondary" style={styles.monthLabel}>
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
                  isDisabled={!!minDate && date < minDate && !isSameDay(date, minDate)}
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
}: DateRangePickerProps) {
  const [range, setRange] = useState<DateRange>(initialRange);

  // Simple top inset for the status bar (pageSheet already avoids the home indicator).
  const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: monthsToShow }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }, [monthsToShow]);

  const handleDayPress = useCallback((date: Date) => {
    setRange((prev) => {
      if (!prev.start || prev.end) return { start: date, end: null };
      if (date < prev.start) return { start: date, end: null };
      if (isSameDay(date, prev.start)) return { start: date, end: date };
      return { start: prev.start, end: date };
    });
  }, []);

  const handleClear = () => setRange({ start: null, end: null });
  const handleSave = () => {
    onSave(range);
    onClose();
  };

  const hasRange = !!range.start;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <Box style={[styles.sheet, { paddingTop: topInset }]}>
        {/* ─── Header ───────────────────────────────────────────────── */}
        <Box style={styles.header}>
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Pressable onPress={onClose} hitSlop={12}>
              <Text variant="smLabel" color="textQuaternary">
                Cancel
              </Text>
            </Pressable>
            <Text variant="mdHeading" color="textSecondary">
              Select dates
            </Text>
            <Pressable onPress={handleClear} hitSlop={12}>
              <Text variant="smLabel" color="textQuaternary">
                Clear
              </Text>
            </Pressable>
          </Box>

          {/* Selection summary pill */}
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            style={styles.summaryRow}
          >
            <Box style={[styles.summaryPill, hasRange && styles.summaryPillActive]}>
              <Text
                variant="smLabel"
                style={{
                  color: hasRange
                    ? ColorPalette.textSecondary
                    : ColorPalette.textQuaternary,
                }}
              >
                {formatShortDate(range.start)}
              </Text>
            </Box>
            <Text
              variant="xsLabel"
              color="textQuaternary"
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
                variant="smLabel"
                style={{
                  color: range.end
                    ? ColorPalette.textSecondary
                    : ColorPalette.textQuaternary,
                }}
              >
                {formatShortDate(range.end)}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* ─── Weekday labels ───────────────────────────────────────── */}
        <Box
          flexDirection="row"
          style={styles.weekdayRow}
        >
          {DAYS.map((d, i) => (
            <Box key={i} style={styles.weekdayCell}>
              <Text variant="xsLabel" color="textQuaternary">
                {d}
              </Text>
            </Box>
          ))}
        </Box>

        {/* ─── Calendar scroll ──────────────────────────────────────── */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {months.map(({ year, month }) => (
            <MonthGrid
              key={`${year}-${month}`}
              year={year}
              month={month}
              range={range}
              minDate={minDate}
              onDayPress={handleDayPress}
            />
          ))}
        </ScrollView>

        {/* ─── Footer ───────────────────────────────────────────────── */}
        <Box style={[styles.footer, { paddingBottom: Layout.spacing.md }]}>
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              !hasRange && styles.saveButtonDisabled,
            ]}
            disabled={!hasRange}
          >
            <Text variant="mdLabel" style={{ color: ColorPalette.white }}>
              {hasRange
                ? `Save · ${formatShortDate(range.start)} – ${formatShortDate(range.end)}`
                : "Select dates"}
            </Text>
          </Pressable>
        </Box>
      </Box>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const RANGE_TINT = ColorPalette.secondaryBackground; // subtle grey band

const styles = StyleSheet.create({
  /* Sheet */
  sheet: {
    flex: 1,
    backgroundColor: ColorPalette.white,
  },

  /* Header */
  header: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ColorPalette.borderPrimary,
  },

  /* Selection summary */
  summaryRow: {
    marginTop: 12,
    gap: 8,
  },
  summaryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.surfaceBackground,
  },
  summaryPillActive: {
    backgroundColor: ColorPalette.secondaryBackground,
    borderWidth: 1,
    borderColor: ColorPalette.borderPrimary,
  },
  summaryArrow: {
    marginHorizontal: 4,
  },

  /* Weekday labels */
  weekdayRow: {
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ColorPalette.borderSecondary,
  },
  weekdayCell: {
    width: CELL_SIZE,
    alignItems: "center",
  },

  /* Scroll */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Layout.spacing.xs,
    paddingBottom: 120,
  },

  /* Month */
  monthBlock: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: Layout.spacing.md,
  },
  monthLabel: {
    marginBottom: 8,
  },

  /* Day outer wrapper — every cell in the 7-col grid has this */
  dayOuter: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Range band — full-height colour strip behind the circle */
  rangeBand: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: RANGE_TINT,
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
    width: CELL_SIZE - 8,
    height: CELL_SIZE - 8,
    borderRadius: CornerRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: {
    backgroundColor: ColorPalette.black,
    borderRadius: CornerRadius.sm,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: ColorPalette.borderPrimary,
    borderRadius: CornerRadius.sm,
  },

  /* Footer */
  footer: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: Layout.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ColorPalette.borderPrimary,
    backgroundColor: ColorPalette.white,
  },
  saveButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.black,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    backgroundColor: ColorPalette.disabledBackground,
  },
});