import { getTripTabsQueryKey, useGetTripTabs } from "@/api/categories/useGetTripTabs";
import { useHideCategory } from "@/api/categories/useHideCategory";
import { Chip } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { getCategoryIcon } from "@/utilities/category-icons";
import { useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import TabContextMenu, { type TabMenuPosition } from "./tabs/tab-context-menu";
import TabEditSheet, { TabEditSheetMethods } from "./tabs/tab-edit-sheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTEXT_MENU_WIDTH = 180;
const screenWidth = Dimensions.get("window").width;

const FIXED_TABS: { key: FixedTabKey; label: string }[] = [
  { key: "new", label: "New" },
  { key: "itinerary", label: "Itinerary" },
  { key: "polls", label: "Polls" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type FixedTabKey = "new" | "itinerary" | "polls" | "settings";

type TripTabBarProps = {
  tripID: string;
  activeTab: string;
  onTabPress: (tab: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripTabBar({ tripID, activeTab, onTabPress }: TripTabBarProps) {
  const editSheetRef = useRef<TabEditSheetMethods>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetTripTabs(tripID);
  const tabs = data?.tabs ?? [];
  const isAdmin = tabs.some((tab) => tab.is_hidden !== undefined);

  const hideCategory = useHideCategory();

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<TabMenuPosition | null>(null);
  const [menuTabName, setMenuTabName] = useState<string | null>(null);

  const handleEditPress = () => {
    editSheetRef.current?.open();
  };

  const handleLongPress = (name: string, event: GestureResponderEvent) => {
    const isFixed = FIXED_TABS.some((t) => t.key === name);
    if (isFixed) return;

    const { pageX, pageY } = event.nativeEvent;
    const clampedLeft = Math.min(
      pageX,
      screenWidth - CONTEXT_MENU_WIDTH - Layout.spacing.sm,
    );
    setMenuTabName(name);
    setMenuPosition({ top: pageY, left: clampedLeft });
    setMenuVisible(true);
  };

  const handleHideTab = async () => {
    if (!menuTabName) return;
    try {
      await hideCategory.mutateAsync({ tripID, name: menuTabName });
      await queryClient.invalidateQueries({
        queryKey: getTripTabsQueryKey(tripID),
      });
    } catch {
      // tab reverts to server state on next fetch
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {isLoading
          ? FIXED_TABS.map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                selected={activeTab === key}
                onPress={() => onTabPress(key)}
                variant="filled"
              />
            ))
          : tabs.map((tab) => {
              const name = tab.name ?? "";
              const label = tab.label ?? name;
              const Icon = getCategoryIcon(name);
              return (
                <Pressable
                  key={name}
                  onLongPress={(e) => handleLongPress(name, e)}
                  delayLongPress={400}
                >
                  <Chip
                    label={label}
                    icon={Icon}
                    selected={activeTab === name}
                    onPress={() => onTabPress(name)}
                    variant="filled"
                  />
                </Pressable>
              );
            })}
      </ScrollView>

      <Pressable
        onPress={handleEditPress}
        style={styles.editButton}
        accessibilityLabel="Edit tabs"
        accessibilityRole="button"
      >
        <SlidersHorizontal size={16} color={ColorPalette.gray600} />
      </Pressable>

      <TabEditSheet
        ref={editSheetRef}
        tripID={tripID}
        tabs={tabs}
        isAdmin={isAdmin}
      />

      <TabContextMenu
        visible={menuVisible}
        anchorPosition={menuPosition}
        onClose={() => setMenuVisible(false)}
        onHide={handleHideTab}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
  },
  editButton: {
    padding: Layout.spacing.xs,
    marginRight: Layout.spacing.xs,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.gray50,
  },
});

export default TripTabBar;