import { Box, Text } from "@/design-system";
import SkeletonRect from "@/design-system/components/skeleton/rectangle";
import { ColorPalette } from "@/design-system/tokens/color";
import type { ModelsCategoryAPIResponse } from "@/types/types.gen";
import { getCategoryIcon } from "@/utilities/category-icons";
import { Settings2 } from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView } from "react-native";

const DEFAULT_LABELS = ["Housing", "Transportation", "Activities", "Polls", "Itinerary"];
const CHAR_WIDTH = 8;
const PILL_PADDING = 52; // icon(14) + gap(6) + paddingHorizontal(12*2) + buffer(8)

const SKELETON_WIDTHS = DEFAULT_LABELS.map(
  (label) => label.length * CHAR_WIDTH + PILL_PADDING,
);

interface TabBarProps {
  categories: ModelsCategoryAPIResponse[];
  activeTab: string;
  onTabPress: (name: string) => void;
  onEditPress: () => void;
  loading?: boolean;
}

export default function TabBar({
  categories,
  activeTab,
  onTabPress,
  onEditPress,
  loading = false,
}: TabBarProps) {
  const visibleCategories = categories.filter((c) => !c.is_hidden);

  return (
    <Box flexDirection="row" alignItems="center">
      <Box flex={1}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {loading
            ? SKELETON_WIDTHS.map((w, i) => (
                <SkeletonRect
                  key={i}
                  borderRadius="sm"
                  height="md"
                  style={{ width: w }}
                />
              ))
            : visibleCategories.map((category) => {
                const name = category.name ?? "";
                const label = category.label ?? name;
                const isActive = name === activeTab;
                const TabIcon = getCategoryIcon(name);
                const iconColor = isActive
                  ? ColorPalette.textPrimary
                  : ColorPalette.textSecondary;

                return (
                  <Pressable key={name} onPress={() => onTabPress(name)}>
                    <Box
                      flexDirection="row"
                      alignItems="center"
                      borderRadius="sm"
                      backgroundColor={
                        isActive ? "primaryBackground" : "surfaceBackground"
                      }
                      style={{
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                      }}
                    >
                      {React.createElement(TabIcon, {
                        size: 14,
                        color: iconColor,
                      })}
                      <Text
                        variant="xsLabel"
                        color={isActive ? "textPrimary" : "textSecondary"}
                      >
                        {label}
                      </Text>
                    </Box>
                  </Pressable>
                );
              })}
        </ScrollView>
      </Box>

      <Pressable onPress={onEditPress}>
        <Box
          borderRadius="sm"
          backgroundColor="surfaceBackground"
          marginRight="md"
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          {React.createElement(Settings2, {
            size: 11,
            color: ColorPalette.iconSecondary,
          })}
        </Box>
      </Pressable>
    </Box>
  );
}