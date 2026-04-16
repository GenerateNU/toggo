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
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import type { TripMapActivity } from "../types";

// ─── Components ──────────────────────────────────────────────────────────────

type CategoryIconRendererProps = {
  categoryNames?: string[];
  size: number;
  color: string;
};

/**
 * Renders the correct category icon using stable module-level JSX branches.
 *
 * Avoids assigning `getActivityCategoryIcon()`'s return value to a variable
 * and using it as JSX — that pattern triggers react-hooks/static-components
 * because the linter treats a function-call result used as a component as an
 * inline component definition. Each branch here references a stable,
 * module-level Lucide component directly.
 */
export function CategoryIconRenderer({
  categoryNames,
  size,
  color,
}: CategoryIconRendererProps) {
  const key = categoryNames?.[0]?.toLowerCase().trim() ?? "";
  const props = { size, color };

  if (key === "activities" || key === "sightseeing")
    return <Binoculars {...props} />;
  if (
    key === "housing" ||
    key === "accommodation" ||
    key === "hotel" ||
    key === "lodging"
  )
    return <Home {...props} />;
  if (key === "transportation" || key === "transport" || key === "transit")
    return <Bus {...props} />;
  if (key === "food" || key === "restaurant" || key === "dining")
    return <UtensilsCrossed {...props} />;
  if (key === "entertainment" || key === "show") return <Ticket {...props} />;
  if (key === "concert" || key === "nightlife") return <Music {...props} />;
  return <MapPin {...props} />;
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
