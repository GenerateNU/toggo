import { Box, Text } from "@/design-system";
import { Pressable, ScrollView } from "react-native";

export type PollType = "single" | "multi" | "rank" | "yesno";

const POLL_TYPES: {
  type: PollType;
  label: string;
}[] = [
  {
    type: "single",
    label: "Single Choice",
  },
  {
    type: "multi",
    label: "Multiple Choice",
  },
  {
    type: "rank",
    label: "Ranked Choice",
  },
  {
    type: "yesno",
    label: "Yes/No",
  },
];

interface StepPollTypeProps {
  selected: PollType;
  onSelect: (type: PollType) => void;
}

export default function StepPollType({
  selected,
  onSelect,
}: StepPollTypeProps) {
  return (
    <Box gap="sm">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
      >
        <Box flexDirection="row" gap="xs">
          {POLL_TYPES.map((item) => {
            const isSelected = selected === item.type;
            return (
              <Pressable key={item.type} onPress={() => onSelect(item.type)}>
                <Box
                  paddingHorizontal="sm"
                  paddingVertical="xxs"
                  borderRadius="sm"
                  backgroundColor={isSelected ? "brand500" : "white"}
                >
                  <Text
                    variant="bodySmMedium"
                    color={isSelected ? "white" : "gray900"}
                  >
                    {item.label}
                  </Text>
                </Box>
              </Pressable>
            );
          })}
        </Box>
      </ScrollView>
    </Box>
  );
}
