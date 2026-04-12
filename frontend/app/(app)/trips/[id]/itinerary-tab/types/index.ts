import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import type { ScrollView, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

// ─── Tab Content ─────────────────────────────────────────────────────────────

export type ItineraryTabContentProps = {
  tripID: string;
  startDate?: string;
  endDate?: string;
  parentScrollViewRef?: React.RefObject<ScrollView | null>;
  parentScrollOffset?: React.RefObject<number>;
  parentContainerRef?: React.RefObject<View | null>;
};

export type GroupedActivities = {
  unscheduled: ModelsActivityAPIResponse[];
  morning: ModelsActivityAPIResponse[];
  afternoon: ModelsActivityAPIResponse[];
  evening: ModelsActivityAPIResponse[];
};

export type DropTarget =
  | { type: "time"; key: string }
  | { type: "date"; date: string };

// ─── Date Selector ───────────────────────────────────────────────────────────

export type DateItem = {
  dateString: string;
  dayAbbrev: string;
  dayNumber: number;
  monthAbbrev: string;
};

export type ItineraryDateSelectorProps = {
  startDate: string;
  endDate: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  hoveredDate?: string | null;
};

export type DateSelectorHandle = {
  measureScrollView: () => Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  getScrollOffset: () => number;
  scrollBy: (dx: number) => void;
};

// ─── Time Section ────────────────────────────────────────────────────────────

export type ItineraryTimeSectionProps = {
  title: string;
  activities: ModelsActivityAPIResponse[];
  onActivityPress: (activityID: string) => void;
  onAddActivity: () => void;
  hideAddButton?: boolean;
  isDropHovered?: boolean;
  onDragStart?: (activityId: string) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  dragScrollCompensationY?: SharedValue<number>;
};

// ─── Activity Card ───────────────────────────────────────────────────────────

export type ItineraryActivityCardProps = {
  activity: ModelsActivityAPIResponse;
  onPress: () => void;
  onDragStart?: (activityId: string) => void;
  onDragMove?: (absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  dragScrollCompensationY?: SharedValue<number>;
};
