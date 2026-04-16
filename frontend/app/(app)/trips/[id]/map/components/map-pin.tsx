import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { CoreSize } from "@/design-system/tokens/core-size";
import { Shadow } from "@/design-system/tokens/elevation";
import { Layout } from "@/design-system/tokens/layout";
import {
  Binoculars,
  Bus,
  Home,
  MapPin,
  Music,
  Ticket,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import type { TripMapActivity } from "../types";

// ─── Category icon map ────────────────────────────────────────────────────────

// Placeholder category-to-icon mapping.
// To swap an icon for a specific category, update the value for its key here.
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  activities: Binoculars,
  sightseeing: Binoculars,
  housing: Home,
  accommodation: Home,
  hotel: Home,
  lodging: Home,
  transportation: Bus,
  transport: Bus,
  transit: Bus,
  food: UtensilsCrossed,
  restaurant: UtensilsCrossed,
  dining: UtensilsCrossed,
  entertainment: Ticket,
  show: Ticket,
  concert: Music,
  nightlife: Music,
};

export function getActivityCategoryIcon(categoryNames?: string[]): LucideIcon {
  if (!categoryNames?.length) return MapPin;
  const first = categoryNames[0];
  if (!first) return MapPin;
  const key = first.toLowerCase().trim();
  return CATEGORY_ICON_MAP[key] ?? MapPin;
}

// ─── Components ──────────────────────────────────────────────────────────────

type CategoryIconRendererProps = {
  categoryNames?: string[];
  size: number;
  color: string;
};

/**
 * Stable helper component that resolves the correct Lucide icon for a category
 * and renders it. Defined at module level to satisfy react/no-unstable-nested-components.
 */
export function CategoryIconRenderer({
  categoryNames,
  size,
  color,
}: CategoryIconRendererProps) {
  const Icon = getActivityCategoryIcon(categoryNames);
  return <Icon size={size} color={color} />;
}

type ActivityMapPinProps = {
  activity: TripMapActivity;
  isSelected?: boolean;
};

export function ActivityMapPin({
  activity,
  isSelected = false,
}: ActivityMapPinProps) {
  const backgroundColor = isSelected
    ? ColorPalette.brand500
    : ColorPalette.brand50;
  const iconColor = isSelected ? ColorPalette.white : ColorPalette.brand500;

  // pointerEvents="none" ensures all touches pass through to MapLibre's native
  // tap detection, preventing the SVG icon from intercepting the PointAnnotation tap.
  return (
    <View style={[styles.pin, { backgroundColor }]} pointerEvents="none">
      <CategoryIconRenderer
        categoryNames={activity.category_names}
        size={CoreSize.xs}
        color={iconColor}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pin: {
    // Figma: min-w-[32px] min-h-[32px] p-[8px] rounded-[99px]
    minWidth: CoreSize.md,
    minHeight: CoreSize.md,
    padding: Layout.spacing.xs,
    borderRadius: CornerRadius.full,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.xl,
  },
});
