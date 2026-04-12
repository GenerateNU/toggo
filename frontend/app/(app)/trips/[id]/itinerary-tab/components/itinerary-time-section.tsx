import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { Plus } from "lucide-react-native";
import { forwardRef, useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { ItineraryTimeSectionProps } from "../types";
import ItineraryActivityCard from "./itinerary-activity-card";

// ─── Component ────────────────────────────────────────────────────────────────

export const ItineraryTimeSection = forwardRef<View, ItineraryTimeSectionProps>(
  function ItineraryTimeSection(
    {
      title,
      activities,
      onActivityPress,
      onAddActivity,
      hideAddButton = false,
      draggable = true,
      isDropHovered = false,
      onDragStart,
      onDragMove,
      onDragEnd,
      dragScrollCompensationY,
    },
    ref,
  ) {
    const [hasDraggingCard, setHasDraggingCard] = useState(false);

    const handleCardDragStart = useCallback(
      (activityId: string) => {
        setHasDraggingCard(true);
        onDragStart?.(activityId);
      },
      [onDragStart],
    );

    const handleCardDragEnd = useCallback(() => {
      setHasDraggingCard(false);
      onDragEnd?.();
    }, [onDragEnd]);

    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.dropContainer,
          hasDraggingCard && styles.elevated,
          isDropHovered ? styles.dropHighlight : styles.dropDefault,
        ]}
      >
        <Box paddingBottom="xxs">
          <Text variant="bodyMedium" color="gray500">
            {title}
          </Text>
        </Box>

        <Box gap="sm" overflow="visible">
          {activities.length > 0 &&
            activities.map((activity) => (
              <ItineraryActivityCard
                key={activity.id}
                activity={activity}
                onPress={() => onActivityPress(activity.id ?? "")}
                draggable={draggable}
                onDragStart={handleCardDragStart}
                onDragMove={onDragMove}
                onDragEnd={handleCardDragEnd}
                dragScrollCompensationY={dragScrollCompensationY}
              />
            ))}

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

          {hideAddButton && activities.length === 0 && (
            <Text variant="bodySmDefault" color="gray400">
              No activities scheduled
            </Text>
          )}
        </Box>
      </View>
    );
  },
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Layout.spacing.xs,
    borderWidth: 1,
    borderColor: ColorPalette.gray500,
    borderRadius: CornerRadius.xl,
    borderStyle: "dashed",
  },
  addButtonPressed: {
    opacity: 0.6,
  },
  elevated: {
    zIndex: 100,
  },
  dropContainer: {
    borderWidth: 2,
    borderRadius: CornerRadius.md,
    padding: Layout.spacing.xs,
  },
  dropDefault: {
    borderColor: "transparent",
  },
  dropHighlight: {
    borderColor: ColorPalette.blue500,
    backgroundColor: ColorPalette.blue50,
  },
});

export default ItineraryTimeSection;
