import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import React, { useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { ColorPalette } from "@/design-system//tokens/color";
import { CornerRadius } from "@/design-system//tokens/corner-radius";
import { Layout } from "@/design-system//tokens/layout";

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
    ? ERROR_COLOR
    : focused
      ? ColorPalette.black
      : ColorPalette.borderPrimary;

  return (
    <Box style={styles.container}>
      {label && (
        <Text variant="smLabel" color="textSecondary" style={styles.label}>
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
              color: disabled
                ? ColorPalette.textDisabled
                : ColorPalette.textSecondary,
            },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ColorPalette.textQuaternary}
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
        <Text variant="xsLabel" style={styles.error}>
          {error}
        </Text>
      )}
    </Box>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ERROR_COLOR = "#DC2626";

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  label: {
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ColorPalette.borderPrimary,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    minHeight: 48,
  },
  inputRowFocused: {
    borderWidth: 2,
  },
  inputRowDisabled: {
    backgroundColor: ColorPalette.surfaceBackground,
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
    color: ERROR_COLOR,
    marginTop: 4,
  },
});
