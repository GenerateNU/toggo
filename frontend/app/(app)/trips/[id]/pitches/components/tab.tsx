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
      backgroundColor="gray50"
      borderRadius="md"
      padding="xxs"
      borderWidth={1}
      borderColor="gray100"
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
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
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
            paddingHorizontal="sm"
            gap="xs"
          >
            <Icon
              icon={tab.icon}
              color={value === tab.value ? "gray950" : "gray500"}
              size="xs"
            />
            <Text
              variant="bodySmMedium"
              color={value === tab.value ? "gray950" : "gray500"}
            >
              {tab.label}
            </Text>
          </Box>
        </Pressable>
      ))}
    </Box>
  );
}
