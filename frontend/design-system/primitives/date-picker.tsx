import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import BottomSheetModal from "../components/bottom-sheet/bottom-sheet";
import { X } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dimensions, Pressable, StyleSheet } from "react-native";
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
  singleDate?: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

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
const SNAP_POINTS = ["90%"];

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
        <Text variant="bodyLargeStrong">{formatMonth(year, month)}</Text>

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
}: DateRangePickerProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [range, setRange] = useState<DateRange>(initialRange);

  // Open/close bottom sheet based on visible prop
  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  // Initialize range when opened
  useEffect(() => {
    if (visible) {
      if (!initialRange.start && !initialRange.end) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRange({ start: null, end: null });
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRange(initialRange);
      }
    }
  }, [visible, initialRange]);

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
  const handleDayPress = useCallback(
    (date: Date) => {
      if (singleDate) {
        setRange({ start: date, end: date });
        return;
      }

      setRange((prev) => {
        const { start, end } = prev;

        if (!start) {
          return { start: date, end: date };
        }

        if (end && isSameDay(start, end)) {
          if (isSameDay(date, start)) return prev;
          if (date < start) return { start: date, end: date };
          return { start, end: date };
        }

        if (isSameDay(date, start) || (end && isSameDay(date, end))) {
          return { start: date, end: date };
        }
        if (date < start) return { start: date, end: date };
        if (end && date > end) return { start, end: date };
        return { start: date, end: date };
      });
    },
    [singleDate],
  );

  const handleClear = () => {
    setRange({ start: null, end: null });
  };

  const handleSave = () => {
    onSave(range);
    onClose();
  };

  const hasRange = !!range.start;

  const footer = (
    <Box style={styles.footerContainer}>
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
            {singleDate ? "Save Date" : "Save Dates"}
          </Text>
        </Pressable>
      </Box>
    </Box>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={SNAP_POINTS}
      onClose={onClose}
      disableScrollView
      footer={footer}
    >
      {/* ─── Header ───────────────────────────────────────────────── */}
      <Box style={styles.header}>
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          padding="xs"
        >
          <Pressable onPress={onClose} hitSlop={16} style={styles.closeButton}>
            <X size={24} />
          </Pressable>
          <Text variant="headingSm">{singleDate ? "Select date" : "Select dates"}</Text>
        </Box>

        {/* Selection summary pill */}
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          style={styles.summaryRow}
        >
          {singleDate ? (
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
          ) : (
            <>
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
                    color: range.end ? ColorPalette.gray900 : ColorPalette.gray500,
                  }}
                >
                  {formatShortDate(range.end)}
                </Text>
              </Box>
            </>
          )}
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

      {/* ─── Calendar ────────────────────────────────────────────── */}
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const RANGE_TINT = ColorPalette.blue25;

const styles = StyleSheet.create({
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

  /* Scroll */
  scrollContent: {
    paddingTop: Layout.spacing.xs,
    paddingBottom: 120,
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
  footerContainer: {
    paddingVertical: Layout.spacing.xs,
    paddingHorizontal: GRID_PADDING,
    paddingBottom: Layout.spacing.md,
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
