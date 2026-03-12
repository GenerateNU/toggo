import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { ColorPalette } from "@/design-system/tokens/color";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RadioOption<T extends string = string> = {
  label: string;
  value: T;
};

export type RadioGroupProps<T extends string = string> = {
  label?: string;
  options: RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
};

// ─── Radio Dot ───────────────────────────────────────────────────────────────

type RadioDotProps = {
  selected: boolean;
  disabled?: boolean;
};

const RadioDot = React.memo(({ selected, disabled }: RadioDotProps) => (
  <Box
    style={[
      styles.outer,
      selected && styles.outerSelected,
      disabled && styles.outerDisabled,
    ]}
  >
    {selected && <Box style={styles.inner} />}
  </Box>
));
RadioDot.displayName = "RadioDot";

// ─── Radio Group ─────────────────────────────────────────────────────────────

export default function RadioGroup<T extends string = string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: RadioGroupProps<T>) {
  return (
    <Box style={styles.container}>
      {label && (
        <Text variant="smHeading" color="textSecondary" style={styles.groupLabel}>
          {label}
        </Text>
      )}
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => !disabled && onChange(opt.value)}
            style={({ pressed }) => [
              styles.row,
              pressed && !disabled && styles.rowPressed,
            ]}
            disabled={disabled}
          >
            <RadioDot selected={selected} disabled={disabled} />
            <Text
              variant="smLabel"
              style={{
                color: disabled
                  ? ColorPalette.textDisabled
                  : ColorPalette.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const OUTER_SIZE = 22;
const INNER_SIZE = 12;

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  groupLabel: {
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.7,
  },
  outer: {
    width: OUTER_SIZE,
    height: OUTER_SIZE,
    borderRadius: OUTER_SIZE / 2,
    borderWidth: 2,
    borderColor: ColorPalette.borderPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  outerSelected: {
    borderColor: ColorPalette.black,
  },
  outerDisabled: {
    borderColor: ColorPalette.borderSecondary,
  },
  inner: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: INNER_SIZE / 2,
    backgroundColor: ColorPalette.black,
  },
});