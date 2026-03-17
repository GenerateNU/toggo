import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { Check } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { ColorPalette } from "@/design-system/tokens/color";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckboxOption<T extends string = string> = {
  label: string;
  value: T;
};

export type CheckboxGroupProps<T extends string = string> = {
  label?: string;
  options: CheckboxOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
};

export type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

// ─── Checkbox Mark ───────────────────────────────────────────────────────────

type CheckboxMarkProps = {
  checked: boolean;
  disabled?: boolean;
};

const CheckboxMark = React.memo(({ checked, disabled }: CheckboxMarkProps) => (
  <Box
    style={[
      styles.box,
      checked && styles.boxChecked,
      disabled && !checked && styles.boxDisabled,
    ]}
  >
    {checked && <Check size={14} color={ColorPalette.white} strokeWidth={3} />}
  </Box>
));
CheckboxMark.displayName = "CheckboxMark";

// ─── Single Checkbox ─────────────────────────────────────────────────────────

export function Checkbox({
  label,
  checked,
  onChange,
  disabled = false,
}: CheckboxProps) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
      ]}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <CheckboxMark checked={checked} disabled={disabled} />
      <Text
        variant="smLabel"
        color={disabled ? "textDisabled" : "textSecondary"}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Checkbox Group ──────────────────────────────────────────────────────────

export default function CheckboxGroup<T extends string = string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: CheckboxGroupProps<T>) {
  const handleToggle = (optValue: T) => {
    const next = value.includes(optValue)
      ? value.filter((v) => v !== optValue)
      : [...value, optValue];
    onChange(next);
  };

  return (
    <Box style={styles.container}>
      {label && (
        <Text
          variant="smHeading"
          color="textSecondary"
          style={styles.groupLabel}
        >
          {label}
        </Text>
      )}
      {options.map((opt) => (
        <Checkbox
          key={opt.value}
          label={opt.label}
          checked={value.includes(opt.value)}
          onChange={() => !disabled && handleToggle(opt.value)}
          disabled={disabled}
        />
      ))}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const BOX_SIZE = 22;

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
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: CornerRadius.xs,
    borderWidth: 2,
    borderColor: ColorPalette.borderPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  boxChecked: {
    backgroundColor: ColorPalette.black,
    borderColor: ColorPalette.black,
  },
  boxDisabled: {
    borderColor: ColorPalette.borderSecondary,
  },
});
