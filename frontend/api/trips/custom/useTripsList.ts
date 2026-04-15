import { getAllTrips } from "@/api/trips/useGetAllTrips";
import { PAGE_SIZE } from "@/constants/pagination";
import type { ModelsTripAPIResponse } from "@/types/types.gen";
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

export const TRIPS_QUERY_KEY = ["trips"] as const;

export type TripsPage = {
  items: ModelsTripAPIResponse[];
  next_cursor?: string;
};

export function useTripsList() {
  const queryClient = useQueryClient();
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
    typeof TRIPS_QUERY_KEY,
    string | undefined
  >({
    queryKey: TRIPS_QUERY_KEY,
    queryFn: ({ pageParam }) =>
      getAllTrips({
        limit: PAGE_SIZE,
        cursor: pageParam as string | undefined,
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

  const prependTrip = useCallback(
    (trip: ModelsTripAPIResponse) => {
      queryClient.setQueryData<InfiniteData<TripsPage>>(
        TRIPS_QUERY_KEY,
        (old) => {
          if (!old?.pages?.length) return old;
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              { ...first, items: [trip, ...(first?.items ?? [])] },
              ...rest,
            ],
          };
        },
      );
    },
    [queryClient],
  );

  return {
    trips,
    isLoading,
    isError,
    isLoadingMore: isFetchingNextPage,
    isRefetching: isFetching && !isLoading && !isFetchingNextPage,
    fetchMore,
    refetch,
    prependTrip,
  };
}
