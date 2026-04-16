import { getAllTrips } from "@/api/trips/useGetAllTrips";
import { PAGE_SIZE } from "@/constants/pagination";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

export const PAST_TRIPS_QUERY_KEY = ["trips", "past"] as const;

type TripsPage = {
  items: ModelsTripAPIResponse[];
  next_cursor?: string;
};

export function usePastTripsList(endDateBefore: string) {
  const isFetchingNextRef = useRef(false);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery<
    TripsPage,
    Error,
    InfiniteData<TripsPage>,
    readonly [string, string, string],
    string | undefined
  >({
    queryKey: [...PAST_TRIPS_QUERY_KEY, endDateBefore] as const,
    queryFn: ({ pageParam }) =>
      getAllTrips({
        limit: PAGE_SIZE,
        cursor: pageParam,
        end_date_before: endDateBefore,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.items?.length && lastPage.next_cursor
        ? lastPage.next_cursor
        : undefined,
    refetchOnWindowFocus: false,
  });

  const trips = useMemo(() => {
    const seen = new Set<string>();
    return (
      data?.pages.flatMap((page) =>
        (page.items ?? []).filter((item) => {
          if (!item.id || !item.end_date || seen.has(item.id)) return false;
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

  return {
    trips,
    isLoading,
    isError,
    isLoadingMore: isFetchingNextPage,
    isRefetching: isFetching && !isLoading && !isFetchingNextPage,
    fetchMore,
    refetch,
  };
}
