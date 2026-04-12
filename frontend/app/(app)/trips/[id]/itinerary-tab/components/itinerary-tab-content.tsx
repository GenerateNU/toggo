import { Box, ErrorState, Text } from "@/design-system";
import { TIME_SECTIONS } from "../constants";
import { useItineraryActivities } from "../hooks/useItineraryActivities";
import { useItineraryDragDrop } from "../hooks/useItineraryDragDrop";
import type { GroupedActivities, ItineraryTabContentProps } from "../types";
import ActivityCardSkeleton from "./activity-card-skeleton";
import ItineraryDateSelector from "./itinerary-date-selector";
import ItineraryEmptyState from "./itinerary-empty-state";
import ItineraryTimeSection from "./itinerary-time-section";

// ─── Component ────────────────────────────────────────────────────────────────

export function ItineraryTabContent({
  tripID,
  startDate,
  endDate,
  parentScrollViewRef,
  parentScrollOffset,
  parentContainerRef,
}: ItineraryTabContentProps) {
  const {
    startDateKey,
    endDateKey,
    selectedDate,
    setSelectedDate,
    activities,
    grouped,
    isLoading,
    isError,
    refetch,
    isSelectedDatePast,
    dateStrings,
    handleActivityPress,
    handleAddActivity,
  } = useItineraryActivities({ tripID, startDate, endDate });

  const {
    hoveredTarget,
    dateSelectorRef,
    sectionRefCallbacks,
    dragScrollCompensationY,
    handleDragStart,
    handleDragMove,
    handleDrop,
  } = useItineraryDragDrop({
    tripID,
    activities,
    dateStrings,
    parentScrollViewRef,
    parentScrollOffset,
    parentContainerRef,
  });

  if (!startDateKey || !endDateKey) {
    return <ItineraryEmptyState />;
  }

  return (
    <Box gap="sm">
      <ItineraryDateSelector
        ref={dateSelectorRef}
        startDate={startDateKey}
        endDate={endDateKey}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        hoveredDate={
          hoveredTarget?.type === "date" ? hoveredTarget.date : null
        }
      />

      {isLoading && (
        <Box gap="xs">
          {TIME_SECTIONS.map((section) => (
            <Box key={section.key}>
              <Box paddingVertical="xs">
                <Text variant="bodySmMedium" color="gray950">
                  {section.title}
                </Text>
              </Box>
              <Box gap="xs" padding="xs">
                {section.key === "unscheduled" || section.key === "morning" ? (
                  <>
                    <ActivityCardSkeleton />
                    <ActivityCardSkeleton />
                  </>
                ) : (
                  <ActivityCardSkeleton />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {isError && (
        <ErrorState title="Couldn't load activities" refresh={refetch} />
      )}

      {!isLoading && !isError && (
        <Box gap="xs">
          {TIME_SECTIONS.map((section) => {
            const sectionActivities =
              grouped[section.key as keyof GroupedActivities];
            return (
              <ItineraryTimeSection
                key={section.key}
                ref={sectionRefCallbacks[section.key]}
                title={section.title}
                activities={sectionActivities}
                onActivityPress={handleActivityPress}
                onAddActivity={handleAddActivity}
                hideAddButton={isSelectedDatePast}
                isDropHovered={
                  hoveredTarget?.type === "time" &&
                  hoveredTarget.key === section.key
                }
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDrop}
                dragScrollCompensationY={dragScrollCompensationY}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default ItineraryTabContent;
