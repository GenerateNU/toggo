import { getTripTabsQueryKey, useGetTripTabs } from "@/api";
import { useHideCategory } from "@/api/categories/useHideCategory";
import { useGetMembership } from "@/api/memberships/useGetMembership";
import { useUser } from "@/contexts/user";
import { Chip, SkeletonRect, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { getCategoryIcon } from "@/utilities/category-icons";
import { useQueryClient } from "@tanstack/react-query";
import { BellDot, Settings2 } from "lucide-react-native";
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type FixedTabKey = "new" | "itinerary" | "polls" | "settings";
export type TabKey = FixedTabKey | string;

type TripTabBarProps = {
  tripID: string;
  activeTab: string;
  onTabPress: (tab: string) => void;
  onCategoryCreated?: (categoryName: string) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripTabBar({
  tripID,
  activeTab,
  onTabPress,
  onCategoryCreated,
}: TripTabBarProps) {
  const editSheetRef = useRef<TabEditSheetMethods>(null);
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  const { data, isLoading } = useGetTripTabs(tripID);
  const tabs = data?.tabs ?? [];
  const { data: myMembership } = useGetMembership(
    tripID,
    currentUser?.id ?? "",
  );
  const isAdmin = myMembership?.is_admin ?? false;

  const hideCategory = useHideCategory();
  const toast = useToast();

  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<TabMenuPosition | null>(
    null,
  );
  const [menuTabName, setMenuTabName] = useState<string | null>(null);

  const handleEditPress = () => {
    editSheetRef.current?.open();
  };

  const handleLongPress = (name: string, event: GestureResponderEvent) => {
    if (name === "new") return;

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
      toast.show({ message: "Could not hide tab. Please try again." });
    }
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {isLoading ? (
          [80, 100, 72, 88].map((width, i) => (
            <SkeletonRect
              key={i}
              borderRadius="sm"
              style={{ width, height: 38 }}
            />
          ))
        ) : (
          <Chip
            label="New"
            icon={BellDot}
            selected={activeTab === "new"}
            onPress={() => onTabPress("new")}
            variant="filled"
          />
        )}

        {!isLoading &&
          tabs.map((tab) => {
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
                  iconSize={18}
                  selected={activeTab === name}
                  onPress={() => onTabPress(name)}
                  variant="filled"
                />
              </Pressable>
            );
          })}

        {!isLoading && (
          <Pressable
            onPress={handleEditPress}
            style={styles.editButton}
            accessibilityLabel="Edit tabs"
            accessibilityRole="button"
          >
            <Settings2 size={16} color={ColorPalette.gray950} />
          </Pressable>
        )}
      </ScrollView>

      <TabEditSheet
        ref={editSheetRef}
        tripID={tripID}
        isAdmin={isAdmin}
        onCategoryCreated={onCategoryCreated}
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
  },
  editButton: {
    paddingHorizontal: Layout.spacing.sm,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.gray25,
    alignSelf: "stretch",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TripTabBar;
