import { Chip } from "@/design-system";
import { Layout } from "@/design-system/tokens/layout";
import {
  BellDot,
  Binoculars,
  ChartColumnBig,
  House,
  List,
  PiggyBank,
  type LucideIcon,
} from "lucide-react-native";
import { ScrollView, StyleSheet } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TabKey =
  | "new"
  | "itinerary"
  | "polls"
  | "housing"
  | "budget"
  | "activities"
  | "settings";

type TripTabBarProps = {
  activeTab: TabKey;
  onTabPress: (tab: TabKey) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TripTabBar({ activeTab, onTabPress }: TripTabBarProps) {
  const tabs: { key: TabKey; label?: string; icon: LucideIcon | undefined }[] =
    [
      { key: "new", label: "New", icon: BellDot },
      { key: "itinerary", label: "Itinerary", icon: List },
      { key: "polls", label: "Polls", icon: ChartColumnBig },
      { key: "housing", label: "Housing", icon: House },
      { key: "budget", label: "Budget", icon: PiggyBank },
      { key: "activities", label: "Activities", icon: Binoculars },
    ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {tabs.map(({ key, label, icon }) => (
        <Chip
          key={key}
          label={label ?? ""}
          icon={icon}
          selected={activeTab === key}
          onPress={() => onTabPress(key)}
          variant="filled"
        />
      ))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
  },
});

export default TripTabBar;
