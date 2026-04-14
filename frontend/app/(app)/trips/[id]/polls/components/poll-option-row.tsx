import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { ReactNode } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const BADGE_SIZE = 24;

// Left offset to align DashedBorderBox / add-option row with the text field
export const OPTION_LEFT_OFFSET = BADGE_SIZE + Layout.spacing.xs;

// ─── Component ────────────────────────────────────────────────────────────────

type OptionRowProps = {
  index: number;
  /** Badge is filled (blue) when the option has content, outlined when empty */
  filled?: boolean;
  /** Element rendered to the right of the text field (e.g. remove button) */
  right?: ReactNode;
  children: ReactNode;
};

export function OptionRow({
  index,
  filled = true,
  right,
  children,
}: OptionRowProps) {
  return (
    <Box flexDirection="row" alignItems="center" gap="xs">
      <Box
        style={{
          width: BADGE_SIZE,
          height: BADGE_SIZE,
          borderRadius: BADGE_SIZE / 2,
          backgroundColor: filled ? ColorPalette.blue500 : ColorPalette.gray200,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Text
          variant="bodyXsMedium"
          style={{ color: filled ? ColorPalette.white : ColorPalette.gray500 }}
        >
          {index + 1}
        </Text>
      </Box>

      <Box flex={1}>{children}</Box>

      {right}
    </Box>
  );
}
