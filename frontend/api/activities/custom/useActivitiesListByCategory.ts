import { activitiesQueryKey, useActivitiesList } from "./useActivitiesList";

export const activitiesByCategoryQueryKey = (
  tripID: string,
  categoryName: string,
) => activitiesQueryKey(tripID, categoryName);

/** @deprecated Use `useActivitiesList(tripID, categoryName)` instead. */
export function useActivitiesListByCategory(
  tripID: string | undefined,
  categoryName: string | undefined,
) {
  return useActivitiesList(tripID, categoryName);
}
