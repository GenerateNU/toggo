import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { CoreSize } from "@/design-system/tokens/core-size";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { FontFamily } from "@/design-system/tokens/typography";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import React, { useContext, useState } from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";
import { InsideBottomSheetContext } from "../bottom-sheet/bottom-sheet";

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
  multiline?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  onBlur?: TextInputProps["onBlur"];
  activeBorderColor?: string;
  highlightWhenFilled?: boolean;
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
  multiline,
  returnKeyType,
  onSubmitEditing,
  onBlur: onBlurProp,
  activeBorderColor,
  highlightWhenFilled = false,
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const isActive = focused || (highlightWhenFilled && hasValue);
  const isInsideBottomSheet = useContext(InsideBottomSheetContext);
  const Input = isInsideBottomSheet ? BottomSheetTextInput : TextInput;

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
          isActive && styles.inputRowFocused,
          isActive && activeBorderColor && { borderColor: activeBorderColor },
          !!error && styles.inputRowError,
          disabled && styles.inputRowDisabled,
        ]}
      >
        {leftIcon && <Box style={styles.iconWrapper}>{leftIcon}</Box>}
        <Input
          style={[styles.input, disabled && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={ColorPalette.gray300}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlurProp?.(e);
          }}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          multiline={multiline}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
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
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    minHeight: CoreSize.xl,
  },
  inputRowFocused: {
    borderWidth: 2,
    borderColor: ColorPalette.blue500,
  },
  inputRowError: {
    borderWidth: 2,
    borderColor: ColorPalette.statusError,
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
    fontFamily: FontFamily.regular,
    color: ColorPalette.gray900,
  },
  inputDisabled: {
    opacity: 0.6,
    color: ColorPalette.gray400,
  },
  error: {
    color: ColorPalette.statusError,
    marginTop: Layout.spacing.xxs,
  },
});
