import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { ChevronDown, Plus } from "lucide-react-native";
import { useCallback, useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager } from "react-native";
import ItineraryActivityCard from "./itinerary-activity-card";

// ─── Enable LayoutAnimation on Android ───────────────────────────────────────

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ItineraryTimeSectionProps = {
  title: string;
  activities: ModelsActivityAPIResponse[];
  defaultExpanded?: boolean;
  onActivityPress: (activityID: string) => void;
  onAddActivity: () => void;
  hideAddButton?: boolean;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryTimeSection({
  title,
  activities,
  defaultExpanded = false,
  onActivityPress,
  onAddActivity,
  hideAddButton = false,
}: ItineraryTimeSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <Box>
      <Pressable
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${activities.length} activities`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          paddingVertical="xs"
        >
          <Text variant="bodySmMedium" color="gray950">
            {title}
          </Text>
          <Box
            style={{
              transform: [{ rotate: expanded ? "180deg" : "0deg" }],
            }}
          >
            <ChevronDown size={18} color={ColorPalette.gray500} />
          </Box>
        </Box>
      </Pressable>

      {expanded && (
        <Box gap="xs" paddingTop="xxs">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <ItineraryActivityCard
                key={activity.id}
                activity={activity}
                onPress={() => onActivityPress(activity.id ?? "")}
              />
            ))
          ) : (
            <Box
              alignItems="center"
              paddingVertical="sm"
              borderWidth={1}
              borderColor="gray100"
              borderRadius="md"
              borderStyle="dashed"
            >
              <Text variant="bodyXsDefault" color="gray400">
                No activities scheduled
              </Text>
            </Box>
          )}

          {!hideAddButton && (
            <Pressable
              onPress={onAddActivity}
              accessibilityRole="button"
              accessibilityLabel="Add activity"
              style={({ pressed }) => [
                styles.addButton,
                pressed && styles.addButtonPressed,
              ]}
            >
              <Plus size={16} color={ColorPalette.gray400} />
            </Pressable>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Layout.spacing.xs,
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.xl,
  },
  addButtonPressed: {
    opacity: 0.6,
  },
});

export default ItineraryTimeSection;
