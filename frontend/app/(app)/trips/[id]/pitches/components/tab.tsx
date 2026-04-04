import { AnimatedBox, Box, Icon, Text } from "@/design-system";
import { useTheme } from "@/design-system/tokens/theme";
import { BarChart3, MapPin } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Animated, Pressable } from "react-native";

export type SegmentedTabsProps = {
  value: "pitches" | "ranking";
  onChange: (value: "pitches" | "ranking") => void;
};

const TABS = [
  { label: "Pitches", value: "pitches", icon: MapPin },
  { label: "Ranking", value: "ranking", icon: BarChart3 },
];

export function SegmentedTabs({ value, onChange }: SegmentedTabsProps) {
  const theme = useTheme();

  const [translateX] = useState(() => new Animated.Value(0));
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = TABS.findIndex((t) => t.value === value);
  const tabWidth = containerWidth / TABS.length;

  useEffect(() => {
    if (!tabWidth) return;

    Animated.spring(translateX, {
      toValue: activeIndex * tabWidth,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, tabWidth, translateX]);

  return (
    <Box
      flexDirection="row"
      backgroundColor="gray100"
      borderRadius="md"
      padding="xxs"
      overflow="hidden"
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      style={{
        width: "100%",
        maxWidth: theme.layout.content.maxReadableWidth,
        alignSelf: "center",
      }}
    >
      <AnimatedBox
        position="absolute"
        top={4}
        left={4}
        height="100%"
        width={tabWidth ? tabWidth - 8 : 0}
        backgroundColor="white"
        borderRadius="sm"
        style={{
          transform: [{ translateX }],
        }}
      />

      {TABS.map((tab) => (
        <Pressable
          key={tab.value}
          onPress={() => onChange(tab.value as "pitches" | "ranking")}
          style={{ flex: 1 }}
        >
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            paddingVertical="xs"
            paddingHorizontal="md"
            gap="xs"
          >
            <Icon icon={tab.icon} color="gray950" size="xs" />
            <Text variant="bodySmMedium" color="gray950">
              {tab.label}
            </Text>
          </Box>
        </Pressable>
      ))}
    </Box>
  );
}
