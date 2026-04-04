import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CoreSize } from "@/design-system/tokens/core-size";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import React, { useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

export type TextFieldProps = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  secureTextEntry?: boolean;
  maxLength?: number;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TextField({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  leftIcon,
  keyboardType,
  autoCapitalize = "none",
  secureTextEntry,
  maxLength,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? ColorPalette.statusError
    : focused
      ? ColorPalette.gray900
      : ColorPalette.gray300;

  return (
    <Box style={styles.container}>
      {label && (
        <Text variant="bodyXsMedium" color="gray900" style={styles.label}>
          {label}
        </Text>
      )}
      <Box
        style={[
          styles.inputRow,
          { borderColor },
          focused && styles.inputRowFocused,
          disabled && styles.inputRowDisabled,
        ]}
      >
        {leftIcon && <Box style={styles.iconWrapper}>{leftIcon}</Box>}
        <TextInput
          style={[
            styles.input,
            disabled && styles.inputDisabled,
            {
              color: disabled ? ColorPalette.gray400 : ColorPalette.gray900,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ColorPalette.gray500}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
        />
      </Box>
      {error && (
        <Text variant="bodyXsMedium" style={styles.error}>
          {error}
        </Text>
      )}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Layout.spacing.xxs,
  },
  label: {
    marginBottom: Layout.spacing.xxs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ColorPalette.gray300,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    minHeight: CoreSize.xl,
  },
  inputRowFocused: {
    borderWidth: 2,
  },
  inputRowDisabled: {
    backgroundColor: ColorPalette.gray50,
    opacity: 0.6,
  },
  iconWrapper: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  error: {
    color: ColorPalette.statusError,
    marginTop: Layout.spacing.xxs,
  },
});
