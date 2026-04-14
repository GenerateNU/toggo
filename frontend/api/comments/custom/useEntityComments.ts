import {
  useAddCommentReaction,
  useRemoveCommentReaction,
} from "@/api/comment-reactions";
import { getCommentReactionsSummary } from "@/api/comment-reactions/useGetCommentReactionsSummary";
import { useCreateComment } from "@/api/comments";
import { getPaginatedComments } from "@/api/comments/useGetPaginatedComments";
import { PAGE_SIZE } from "@/constants/pagination";
import type {
  CommentData,
  Reaction,
} from "@/design-system/components/comments/comment";
import type {
  ModelsCommentAPIResponse,
  ModelsCommentReactionSummary,
  ModelsEntityType,
} from "@/types/types.gen";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useRef } from "react";

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return "just now";
  const diffSeconds = Math.floor(
    (Date.now() - new Date(isoString).getTime()) / 1000,
  );
  if (diffSeconds < 60) return "just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

async function attachReactions(
  items: ModelsCommentAPIResponse[],
): Promise<CommentData[]> {
  const itemsWithId = items.filter((i) => i.id);
  const reactionResults = await Promise.allSettled(
    itemsWithId.map((i) => getCommentReactionsSummary(i.id!)),
  );

  const reactionsById: Record<string, Reaction[]> = {};
  itemsWithId.forEach((item, index) => {
    const result = reactionResults[index];
    reactionsById[item.id!] =
      result?.status === "fulfilled" && result.value?.reactions
        ? result.value.reactions.map((r: ModelsCommentReactionSummary) => ({
            emoji: r.emoji ?? "",
            count: r.count ?? 0,
            reactedByMe: r.reacted_by_me ?? false,
          }))
        : [];
  });

  return items.map((item) => ({
    id: item.id ?? "",
    authorName: item.name ?? "Unknown",
    authorAvatar: item.profile_picture_url ?? undefined,
    authorSeed: item.user_id,
    body: item.content ?? "",
    timestamp: formatRelativeTime(item.created_at),
    reactions: item.id ? (reactionsById[item.id] ?? []) : [],
  }));
}

type UseEntityCommentsParams = {
  tripID: string;
  entityType: ModelsEntityType;
  entityID: string;
  enabled?: boolean;
};

export type UseEntityCommentsResult = {
  comments: CommentData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  fetchNextPage: () => void;
  onSubmitComment: (comment: CommentData) => Promise<void>;
  onReact: (commentId: string, emoji: string) => void;
};

export const commentsQueryKey = (
  tripID: string,
  entityType: ModelsEntityType,
  entityID: string,
) => ["comments", tripID, entityType, entityID] as const;

export function useEntityComments({
  tripID,
  entityType,
  entityID,
  enabled = true,
}: UseEntityCommentsParams): UseEntityCommentsResult {
  const queryClient = useQueryClient();
  const { mutateAsync: createCommentAsync } = useCreateComment();
  const { mutateAsync: addReactionAsync } = useAddCommentReaction();
  const { mutateAsync: removeReactionAsync } = useRemoveCommentReaction();
  const isFetchingNextRef = useRef(false);

  const queryKey = commentsQueryKey(tripID, entityType, entityID);

  const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } =
    useInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
        const result = await getPaginatedComments(
          tripID,
          entityType,
          entityID,
          {
            limit: PAGE_SIZE,
            cursor: pageParam,
          },
        );
        const transformed = await attachReactions(result?.items ?? []);
        return { items: transformed, next_cursor: result?.next_cursor };
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage?.items?.length && lastPage.next_cursor
          ? lastPage.next_cursor
          : undefined,
      refetchOnWindowFocus: false,
      enabled: enabled && !!tripID && !!entityID,
    });

  const comments = useMemo(() => {
    const seen = new Set<string>();
    return (
      data?.pages.flatMap((page) =>
        (page?.items ?? []).filter((item) => {
          if (!item.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }),
      ) ?? []
    );
  }, [data]);

  const fetchNextPageGuarded = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchingNextRef.current) return;
    isFetchingNextRef.current = true;
    fetchNextPage().finally(() => {
      isFetchingNextRef.current = false;
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateComments = useCallback(
    (updater: (items: CommentData[]) => CommentData[]) => {
      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: updater(page.items),
          })),
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, ...queryKey],
  );

  const onSubmitComment = useCallback(
    async (comment: CommentData) => {
      const created = await createCommentAsync({
        data: {
          content: comment.body,
          entity_id: entityID,
          entity_type: entityType,
          trip_id: tripID,
        },
      });

      const confirmed: CommentData = {
        ...comment,
        id: created?.id ?? comment.id,
        reactions: [],
      };

      queryClient.setQueryData(queryKey, (old: typeof data) => {
        if (!old?.pages.length) return old;
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, items: [confirmed, ...(first?.items ?? [])] },
            ...rest,
          ],
        };
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      createCommentAsync,
      entityID,
      entityType,
      tripID,
      queryClient,
      ...queryKey,
    ],
  );

  const onReact = useCallback(
    (commentId: string, emoji: string) => {
      updateComments((items) =>
        items.map((c) => {
          if (c.id !== commentId) return c;
          const existing = c.reactions.find((r) => r.emoji === emoji);

          if (existing?.reactedByMe) {
            removeReactionAsync({
              commentID: commentId,
              data: { emoji },
            }).catch(() => {
              updateComments((prev) =>
                prev.map((cc) => {
                  if (cc.id !== commentId) return cc;
                  const r = cc.reactions.find((x) => x.emoji === emoji);
                  if (r) {
                    return {
                      ...cc,
                      reactions: cc.reactions.map((x) =>
                        x.emoji === emoji
                          ? { ...x, count: x.count + 1, reactedByMe: true }
                          : x,
                      ),
                    };
                  }
                  return {
                    ...cc,
                    reactions: [
                      ...cc.reactions,
                      { emoji, count: 1, reactedByMe: true },
                    ],
                  };
                }),
              );
            });

            return {
              ...c,
              reactions: c.reactions
                .map((r) =>
                  r.emoji === emoji
                    ? { ...r, count: r.count - 1, reactedByMe: false }
                    : r,
                )
                .filter((r) => r.count > 0),
            };
          } else {
            addReactionAsync({ commentID: commentId, data: { emoji } }).catch(
              () => {
                updateComments((prev) =>
                  prev.map((cc) => {
                    if (cc.id !== commentId) return cc;
                    return {
                      ...cc,
                      reactions: cc.reactions
                        .map((x) =>
                          x.emoji === emoji
                            ? { ...x, count: x.count - 1, reactedByMe: false }
                            : x,
                        )
                        .filter((x) => x.count > 0),
                    };
                  }),
                );
              },
            );

            return {
              ...c,
              reactions: existing
                ? c.reactions.map((r) =>
                    r.emoji === emoji
                      ? { ...r, count: r.count + 1, reactedByMe: true }
                      : r,
                  )
                : [...c.reactions, { emoji, count: 1, reactedByMe: true }],
            };
          }
        }),
      );
    },
    [addReactionAsync, removeReactionAsync, updateComments],
  );

  return {
    comments,
    isLoading,
    isLoadingMore: isFetchingNextPage,
    fetchNextPage: fetchNextPageGuarded,
    onSubmitComment,
    onReact,
  };
}
