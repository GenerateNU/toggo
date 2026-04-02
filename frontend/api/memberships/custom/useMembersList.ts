import { getTripMembers } from "@/api/memberships/useGetTripMembers";
import { PAGE_SIZE } from "@/constants/pagination";
import type { ModelsMembershipAPIResponse } from "@/types/types.gen";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

export const membersQueryKey = (tripID: string) => ["members", tripID] as const;

export function useMembersList(tripID: string | undefined) {
  const isFetchingNextRef = useRef(false);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: membersQueryKey(tripID ?? ""),
      queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
        getTripMembers(tripID!, { limit: PAGE_SIZE, cursor: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.items?.length && lastPage.next_cursor
          ? lastPage.next_cursor
          : undefined,
      refetchOnWindowFocus: false,
      enabled: !!tripID,
    });

  const members = useMemo(() => {
    const seen = new Set<string>();
    return (
      data?.pages.flatMap((page) =>
        (page?.items ?? []).filter((item: ModelsMembershipAPIResponse) => {
          if (!item.user_id || seen.has(item.user_id)) return false;
          seen.add(item.user_id);
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

  return { members, isLoading, isLoadingMore: isFetchingNextPage, fetchMore };
}
