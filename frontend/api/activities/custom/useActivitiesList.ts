import { getActivitiesByTripID } from "@/api/activities/useGetActivitiesByTripID";
import { PAGE_SIZE } from "@/constants/pagination";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

type UseActivitiesListOptions = {
  category?: string;
};

export const activitiesQueryKey = (tripID: string, category?: string) =>
  ["activities", tripID, ...(category ? [category] : [])] as const;

export function useActivitiesList(
  tripID: string | undefined,
  options?: UseActivitiesListOptions,
) {
  const queryClient = useQueryClient();
  const isFetchingNextRef = useRef(false);
  const category = options?.category;

  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: activitiesQueryKey(tripID ?? "", category),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getActivitiesByTripID(tripID!, {
        limit: PAGE_SIZE,
        cursor: pageParam,
        category,
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
      queryClient.setQueryData(
        activitiesQueryKey(tripID, category),
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
    [queryClient, tripID, category],
  );

  return {
    activities,
    isLoading,
    isError,
    isLoadingMore: isFetchingNextPage,
    fetchMore,
    prependActivity,
  };
}
