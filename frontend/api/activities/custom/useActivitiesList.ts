import { getActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { PAGE_SIZE } from "@/constants/pagination";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

export const activitiesQueryKey = (tripID: string) =>
  ["activities", tripID] as const;

export function useActivitiesList(tripID: string | undefined) {
  const queryClient = useQueryClient();
  const isFetchingNextRef = useRef(false);

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: activitiesQueryKey(tripID ?? ""),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getActivitiesByTripID(tripID!, { limit: PAGE_SIZE, cursor: pageParam }),
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
      queryClient.setQueryData(
        activitiesQueryKey(tripID),
        (old: typeof data) => {
          if (!old?.pages.length) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              { ...first, items: [activity, ...(first?.items ?? [])] },
              ...rest,
            ],
          };
        },
      );
    },
    [queryClient, tripID],
  );

  return {
    activities,
    isLoading,
    isError,
    isLoadingMore: isFetchingNextPage,
    fetchMore,
    refetch,
    prependActivity,
  };
}
