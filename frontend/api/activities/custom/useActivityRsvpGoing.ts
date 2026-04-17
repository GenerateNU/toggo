import { getActivityQueryKey } from "@/api/activities/useGetActivity";
import { usePostApiV1TripsTripidActivitiesActivityidRsvp } from "@/api/activities/usePostApiV1TripsTripidActivitiesActivityidRsvp";
import { modelsRSVPStatus } from "@/types/types.gen";
import { useQueryClient } from "@tanstack/react-query";

/**
 * RSVP as "going" for an activity (used for mood-board / detail "heart").
 * Invalidates the activity detail query and all trip activity lists.
 */
export function useActivityRsvpGoing(tripID: string | undefined) {
  const queryClient = useQueryClient();

  return usePostApiV1TripsTripidActivitiesActivityidRsvp({
    mutation: {
      onSuccess: async (_data, variables) => {
        if (!tripID) return;
        await queryClient.invalidateQueries({
          queryKey: getActivityQueryKey(tripID, variables.activityID),
        });
        await queryClient.invalidateQueries({
          queryKey: ["activities", tripID],
        });
      },
    },
  });
}

export const activityRsvpGoingPayload = {
  status: modelsRSVPStatus.RSVPStatusGoing,
} as const;
