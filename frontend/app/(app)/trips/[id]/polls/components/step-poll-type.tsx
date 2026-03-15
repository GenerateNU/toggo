import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CircleDot, ListChecks, ListOrdered, ToggleLeft } from "lucide-react-native";
import React from "react";
import { Pressable } from "react-native";

export type PollType = "single" | "multi" | "rank" | "yesno";

const POLL_TYPES: {
  type: PollType;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ size: number; color: string }>;
}[] = [
  {
    type: "single",
    label: "Single Choice",
    subtitle: "Pick one option",
    icon: CircleDot,
  },
  {
    type: "multi",
    label: "Multiple Choice",
    subtitle: "Pick several",
    icon: ListChecks,
  },
  {
    type: "rank",
    label: "Ranked Choice",
    subtitle: "Rank by preference",
    icon: ListOrdered,
  },
  {
    type: "yesno",
    label: "Yes / No",
    subtitle: "Simple vote",
    icon: ToggleLeft,
  },
];


interface StepPollTypeProps {
  selected: PollType;
  onSelect: (type: PollType) => void;
}

const CARD_MIN_HEIGHT = 108;

export default function StepPollType({ selected, onSelect }: StepPollTypeProps) {
  const rows = [POLL_TYPES.slice(0, 2), POLL_TYPES.slice(2, 4)];

  return (
    <Box gap="sm">
      <Text variant="xsLabel" color="textQuaternary">
        Type
      </Text>
      <Box gap="sm">
        {rows.map((row, rowIndex) => (
          <Box key={rowIndex} flexDirection="row" gap="sm">
            {row.map(({ type, label, subtitle, icon: Icon }) => {
              const isSelected = selected === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => onSelect(type)}
                  style={{ flex: 1 }}
                >
                  <Box
                    flex={1}
                    padding="sm"
                    borderRadius="md"
                    backgroundColor="surfaceCard"
                    alignItems="center"
                    gap="xs"
                    style={{
                      minHeight: CARD_MIN_HEIGHT,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? ColorPalette.black : ColorPalette.borderPrimary,
                    }}
                  >
                    <Icon
                      size={20}
                      color={isSelected ? ColorPalette.textSecondary : ColorPalette.textQuaternary}
                    />
                    <Text variant="smLabel" color="textSecondary" numberOfLines={1}>
                      {label}
                    </Text>
                    <Text variant="xxsParagraph" color="textQuaternary" numberOfLines={1}>
                      {subtitle}
                    </Text>
                  </Box>
                </Pressable>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
