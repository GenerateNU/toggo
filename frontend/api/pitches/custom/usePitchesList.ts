import { listPitches } from "@/api/pitches/useListPitches";
import { PAGE_SIZE } from "@/constants/pagination";
import type { ModelsPitchAPIResponse } from "@/types/types.gen";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

export const pitchesQueryKey = (tripID: string) => ["pitches", tripID] as const;

export function usePitchesList(tripID: string | undefined) {
  const queryClient = useQueryClient();
  const isFetchingNextRef = useRef(false);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey: pitchesQueryKey(tripID ?? ""),
      queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
        listPitches(tripID!, { limit: PAGE_SIZE, cursor: pageParam }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.items?.length && lastPage.next_cursor
          ? lastPage.next_cursor
          : undefined,
      refetchOnWindowFocus: false,
      enabled: !!tripID,
    });

  const pitches = useMemo(() => {
    const seen = new Set<string>();
    return (
      data?.pages.flatMap((page) =>
        (page?.items ?? []).filter((item: ModelsPitchAPIResponse) => {
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

  const prependPitch = useCallback(
    (pitch: ModelsPitchAPIResponse) => {
      if (!tripID) return;
      queryClient.setQueryData(pitchesQueryKey(tripID), (old: typeof data) => {
        if (!old?.pages.length) return old;
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, items: [pitch, ...(first?.items ?? [])] },
            ...rest,
          ],
        };
      });
    },
    [queryClient, tripID],
  );

  return {
    pitches,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    fetchMore,
    prependPitch,
  };
}
