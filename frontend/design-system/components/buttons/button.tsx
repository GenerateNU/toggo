import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorName } from "@/design-system/tokens/color";
import { useTheme } from "@/design-system/tokens/theme";
import { LucideProps } from "lucide-react-native";
import React from "react";
import { StyleProp, TouchableOpacity, ViewStyle } from "react-native";
import { ButtonSize, ButtonVariant, resolveButtonStyle } from "./variant";

type LucideIconComponent = React.ComponentType<LucideProps>;

type ButtonLayout =
  | { layout: "textOnly"; label: string }
  | { layout: "leadingIcon"; label: string; leftIcon: LucideIconComponent }
  | {
      layout: "leadingAndTrailingIcon";
      label: string;
      leftIcon: LucideIconComponent;
      rightIcon: LucideIconComponent;
    }
  | {
      layout: "iconOnly";
      accessibilityLabel: string;
      icon: LucideIconComponent;
    };

type ButtonProps = ButtonLayout & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const Button: React.FC<ButtonProps> = ({
  variant = "Primary" as ButtonVariant,
  size = "medium" as ButtonSize,
  disabled = false,
  loading = false,
  loadingLabel = "Loading...",
  onPress,
  style,
  ...layoutProps
}) => {
  const { colors } = useTheme();
  const resolved = resolveButtonStyle(variant, size, disabled);

  const isIconOnly = layoutProps.layout === "iconOnly";
  const isDisabled = disabled || loading;
  const iconColor = colors[resolved.contentColor as keyof typeof colors];

  const a11yLabel =
    layoutProps.layout === "iconOnly"
      ? layoutProps.accessibilityLabel
      : layoutProps.label;

  const renderContent = () => {
    if (loading) {
      return (
        <Text variant="mdLabel" color={resolved.contentColor as ColorName}>
          {loadingLabel}
        </Text>
      );
    }

    switch (layoutProps.layout) {
      case "textOnly":
        return (
          <Text
            variant="mdLabel"
            color={resolved.contentColor as ColorName}
            numberOfLines={1}
          >
            {layoutProps.label}
          </Text>
        );

      case "leadingIcon": {
        const Icon = layoutProps.leftIcon;
        return (
          <Box flexDirection="row" alignItems="center" gap="xs">
            <Icon size={resolved.iconSize} color={iconColor} />
            <Text
              variant="mdLabel"
              color={resolved.contentColor as ColorName}
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {layoutProps.label}
            </Text>
          </Box>
        );
      }

      case "leadingAndTrailingIcon": {
        const Left = layoutProps.leftIcon;
        const Right = layoutProps.rightIcon;
        return (
          <Box flexDirection="row" alignItems="center" gap="xs">
            <Left size={resolved.iconSize} color={iconColor} />
            <Text
              variant="mdLabel"
              color={resolved.contentColor as ColorName}
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {layoutProps.label}
            </Text>
            <Right size={resolved.iconSize} color={iconColor} />
          </Box>
        );
      }

      case "iconOnly": {
        const Icon = layoutProps.icon;
        return <Icon size={resolved.iconSize} color={iconColor} />;
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessible
      accessibilityRole="button"
      accessibilityLabel={loading ? "Loading" : a11yLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        alignSelf="stretch"
        style={[
          {
            minHeight: resolved.minHeight,
            paddingHorizontal: isIconOnly ? 0 : resolved.paddingHorizontal,
            borderRadius: resolved.borderRadius,
            borderWidth: resolved.borderWidth,
            borderColor: resolved.borderColor
              ? colors[resolved.borderColor as keyof typeof colors]
              : undefined,
            backgroundColor:
              resolved.backgroundColor === "transparent"
                ? "transparent"
                : colors[resolved.backgroundColor as keyof typeof colors],
            width: isIconOnly ? resolved.minHeight : "auto",
          },
          style,
        ]}
      >
        {renderContent()}
      </Box>
    </TouchableOpacity>
  );
};
