import { Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { CoreSize } from "@/design-system/tokens/core-size";
import { Layout, ModalHandle } from "@/design-system/tokens/layout";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MapSpacing } from "../tokens";
import {
  formatCategoryLabel,
  type MapCategoryFilter,
  type TripMapActivity,
} from "../types";
import { CategoryIconRenderer } from "./map-pin";
import { MapLocationCard } from "./map-location-card";

// ─── Constants ────────────────────────────────────────────────────────────────

// The BottomSheetScrollView wrapper (disableScrollView=false) adds paddingHorizontal: 8
// and paddingVertical: 16 to the scroll container. We add Layout.spacing.xs (8) here
// to reach the Figma spec of 16px total horizontal padding from the screen edge.
const CONTENT_H_PADDING = Layout.spacing.xs;

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryTab = {
  key: MapCategoryFilter;
  label: string;
  count: number;
};

type MapLocationListSheetProps = {
  activities: TripMapActivity[];
  selectedFilter: MapCategoryFilter;
  onFilterChange: (filter: MapCategoryFilter) => void;
  onActivityPress: (activity: TripMapActivity) => void;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildCategoryTabs(activities: TripMapActivity[]): CategoryTab[] {
  const counts: Record<string, number> = {};
  for (const activity of activities) {
    const category = activity.category_names?.[0] ?? "Activity";
    counts[category] = (counts[category] ?? 0) + 1;
  }

  const tabs: CategoryTab[] = [
    { key: "all", label: "All", count: activities.length },
  ];

  for (const [category, count] of Object.entries(counts)) {
    tabs.push({
      key: category,
      label: formatCategoryLabel(category),
      count,
    });
  }

  return tabs;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MapLocationListSheetContent({
  activities,
  selectedFilter,
  onFilterChange,
  onActivityPress,
}: MapLocationListSheetProps) {
  const tabs = buildCategoryTabs(activities);

  const filteredActivities =
    selectedFilter === "all"
      ? activities
      : activities.filter(
          (a) => (a.category_names?.[0] ?? "Activity") === selectedFilter,
        );

  return (
    <View style={styles.root}>
      {/* Drag handle — Figma: w-[38px] h-[4px] centered */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Content column — Figma: gap-[15px] between title, tabs, and cards */}
      <View style={styles.contentColumn}>
        {/* Title — Figma: font-semibold text-[18px] */}
        <Text variant="headingLg" color="gray950">
          {activities.length} location{activities.length !== 1 ? "s" : ""} in
          view
        </Text>

        {/* Category filter tabs — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScrollView}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => {
            const isActive = tab.key === selectedFilter;
            return (
              <Pressable
                key={tab.key}
                onPress={() => onFilterChange(tab.key)}
                style={[
                  styles.tab,
                  isActive ? styles.tabActive : styles.tabInactive,
                ]}
              >
                {tab.key !== "all" && (
                  <CategoryIconRenderer
                    categoryNames={[tab.key]}
                    size={CoreSize.xs}
                    color={isActive ? ColorPalette.white : ColorPalette.gray950}
                  />
                )}
                <Text
                  variant="bodyMedium"
                  style={isActive ? styles.tabLabelActive : styles.tabLabel}
                >
                  {tab.label}
                </Text>
                <Text
                  variant="bodyDefault"
                  style={isActive ? styles.tabLabelActive : styles.tabLabel}
                >
                  {tab.count}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Location cards */}
        {filteredActivities.map((activity) => (
          <MapLocationCard
            key={activity.id}
            activity={activity}
            onPress={() => onActivityPress(activity)}
          />
        ))}

        {/* Bottom padding: Figma pb-[32px] minus scrollview's built-in 16px = 16px */}
        <View style={styles.bottomPad} />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // The BottomSheetScrollView adds paddingHorizontal: Layout.spacing.xs and
  // paddingVertical: Layout.spacing.sm to the scroll container.
  root: {
    // Figma: gap-[12px] between handle and content column
    gap: MapSpacing.handleContentGap,
  },
  handleContainer: {
    alignItems: "center",
    // The scrollview's paddingTop:16 provides the Figma pt-[16px]
  },
  handle: {
    // Figma: w-[38px] h-[4px] rounded-[2px]
    width: ModalHandle.width,
    height: ModalHandle.height,
    borderRadius: ModalHandle.borderRadius,
    backgroundColor: ColorPalette.gray200,
  },
  contentColumn: {
    // Figma: gap-[15px]
    gap: MapSpacing.contentSectionGap,
    paddingHorizontal: CONTENT_H_PADDING,
  },
  // Extend tabs past content h-padding to bleed to the sheet edge
  tabsScrollView: {
    marginHorizontal: -CONTENT_H_PADDING,
  },
  tabsContent: {
    paddingHorizontal: CONTENT_H_PADDING,
    gap: Layout.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
  },
  // Figma: px-[12px] py-[8px] rounded-[8px] gap-[6px]
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: MapSpacing.innerGap,
    paddingHorizontal: MapSpacing.tabPaddingH,
    paddingVertical: Layout.spacing.xs,
    borderRadius: CornerRadius.sm,
  },
  tabActive: {
    backgroundColor: ColorPalette.brand500,
  },
  tabInactive: {
    backgroundColor: ColorPalette.gray25,
  },
  tabLabel: {
    color: ColorPalette.gray950,
  },
  tabLabelActive: {
    color: ColorPalette.white,
  },
  // Figma: pb-[32px] total; scrollview contributes Layout.spacing.sm (16px)
  bottomPad: {
    height: Layout.spacing.sm,
  },
});
