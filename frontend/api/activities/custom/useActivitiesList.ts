import { getActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { PAGE_SIZE } from "@/constants/pagination";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

export const activitiesQueryKey = (tripID: string, categoryName?: string) =>
  categoryName?.length
    ? (["activities", tripID, "category", categoryName] as const)
    : (["activities", tripID] as const);

/**
 * Paginated activities for a trip, optionally filtered to a single category tab.
 */
export function useActivitiesList(
  tripID: string | undefined,
  categoryName?: string,
) {
  const queryClient = useQueryClient();
  const isFetchingNextRef = useRef(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: activitiesQueryKey(tripID ?? "", categoryName),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getActivitiesByTripID(tripID!, {
        limit: PAGE_SIZE,
        cursor: pageParam,
        ...(categoryName ? { category: categoryName } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.items?.length && lastPage.next_cursor
        ? lastPage.next_cursor
        : undefined,
    refetchOnWindowFocus: false,
    enabled: !!tripID,
  });

  const activities = useMemo(() => {
    const seen = new Set<string>();
    return (
      data?.pages.flatMap((page) =>
        (page?.items ?? []).filter((item: ModelsActivityAPIResponse) => {
          if (!item.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }),
      ) ?? []
    );
  }, [data]);

  const fetchMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchingNextRef.current) return;
    isFetchingNextRef.current = true;
    fetchNextPage().finally(() => {
      isFetchingNextRef.current = false;
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const prependActivity = useCallback(
    (activity: ModelsActivityAPIResponse) => {
      if (!tripID) return;
      const key = activitiesQueryKey(tripID, categoryName);
      queryClient.setQueryData(key, (old: typeof data) => {
        if (!old?.pages.length) return old;
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, items: [activity, ...(first?.items ?? [])] },
            ...rest,
          ],
        };
      });
    },
    [queryClient, tripID, categoryName, data],
  );

  return {
    activities,
    isLoading,
    isError,
    isLoadingMore: isFetchingNextPage,
    hasNextPage: hasNextPage ?? false,
    fetchMore,
    prependActivity,
  };
}
