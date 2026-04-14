import apiClient from "@/api/client";
import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import { useGetImage } from "@/api/files/custom/useGetImage";
import {
  pitchesQueryKey,
  usePitchesList,
} from "@/api/pitches/custom/usePitchesList";
import { useRankingData } from "@/api/pitches/custom/useRankingData";
import {
  getRankPollResultsQueryKey,
  useGetRankPollResults,
} from "@/api/polls/useGetRankPollResults";
import { useGetRankPollVoters } from "@/api/polls/useGetRankPollVoters";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { useUser } from "@/contexts/user";
import { Box, Screen, useToast } from "@/design-system";
import type { CommentData } from "@/design-system/components/comments/comment";
import CommentSection from "@/design-system/components/comments/comment-section";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import type {
  ModelsCommenterPreview,
  ModelsPitchCursorPageResult,
  ModelsVoterInfo,
} from "@/types/types.gen";
import { modelsEntityType } from "@/types/types.gen";
import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeadlinePickerFlow } from "./components/deadline-picker-flow";
import { PitchCtaBar } from "./components/pitch-cta-bar";
import { PitchesHeader } from "./components/pitches-header";
import { PitchesTabContent } from "./components/pitches-tab-content";
import { RankingTabContent } from "./components/ranking-tab-content";
import { RankingVotersSheet } from "./components/ranking-voters-sheet";
import { SetDestinationConfirmModal } from "./components/set-destination-confirm-modal";
import { CreatePitchFlowSheet } from "./creation/components/create-pitch-flow-sheet";

interface SelectedChoiceVoters {
  position: number;
  count: number;
  optionID?: string;
  pitchName?: string;
}

export default function Pitches() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"pitches" | "ranking">("pitches");
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  const { data: currentUserProfileImages } = useGetImage(
    [currentUser?.profile_picture],
    "small",
  );
  const currentUserProfilePhotoUrl = currentUserProfileImages[0]?.url;
  const toast = useToast();
  const [activeCommentPitchId, setActiveCommentPitchId] = useState<
    string | null
  >(null);
  const [deadlineFlowVisible, setDeadlineFlowVisible] = useState(false);
  const [createPitchFlowVisible, setCreatePitchFlowVisible] = useState(false);
  const [touchBlockVisible, setTouchBlockVisible] = useState(false);
  const [destinationToConfirm, setDestinationToConfirm] = useState<
    string | null
  >(null);
  const [selectedChoiceVoters, setSelectedChoiceVoters] =
    useState<SelectedChoiceVoters | null>(null);
  const [choiceVoters, setChoiceVoters] = useState<ModelsVoterInfo[]>([]);
  const [isChoiceVotersLoading, setIsChoiceVotersLoading] = useState(false);

  const {
    comments,
    isLoading: isLoadingComments,
    isLoadingMore: isLoadingMoreComments,
    fetchNextPage,
    onSubmitComment,
    onReact,
  } = useEntityComments({
    tripID: tripID ?? "",
    entityType: modelsEntityType.PitchEntity,
    entityID: activeCommentPitchId ?? "",
    enabled: !!activeCommentPitchId && !!tripID,
  });

  const { data: trip, isLoading: tripLoading } = useGetTrip(tripID!);
  const {
    pitches,
    isLoading: pitchesLoading,
    isError: pitchesError,
    refetch: refetchPitches,
    fetchMore,
    isLoadingMore,
  } = usePitchesList(tripID);
  const updateTrip = useUpdateTrip();

  const pollId = trip?.rank_poll_id;

  const { data: pollResults } = useGetRankPollResults(tripID!, pollId ?? "", {
    query: { enabled: !!pollId && tab === "ranking" },
  });

  const { data: pollVoters } = useGetRankPollVoters(tripID!, pollId ?? "", {
    query: { enabled: !!pollId && tab === "ranking" },
  });

  useEffect(() => {
    const optionID = selectedChoiceVoters?.optionID;
    const rankPosition = selectedChoiceVoters?.position;

    if (
      !selectedChoiceVoters ||
      !tripID ||
      !pollId ||
      !optionID ||
      !rankPosition
    ) {
      setChoiceVoters([]);
      return;
    }

    let isCancelled = false;

    const fetchChoiceVoters = async () => {
      setIsChoiceVotersLoading(true);
      try {
        const response = await apiClient<{
          voters?: ModelsVoterInfo[];
        }>({
          method: "GET",
          url: `/api/v1/trips/${tripID}/rank-polls/${pollId}/options/${optionID}/ranks/${rankPosition}/voters`,
        });

        if (!isCancelled) {
          setChoiceVoters(response.data?.voters ?? []);
        }
      } catch {
        if (!isCancelled) {
          setChoiceVoters([]);
        }
      } finally {
        if (!isCancelled) {
          setIsChoiceVotersLoading(false);
        }
      }
    };

    fetchChoiceVoters();

    return () => {
      isCancelled = true;
    };
  }, [selectedChoiceVoters, tripID, pollId]);

  useTripRealtime(tripID, (event) => {
    if (event.topic === "poll.ranking_submitted" && pollId) {
      queryClient.invalidateQueries({
        queryKey: getRankPollResultsQueryKey(tripID!, pollId),
      });
    }
  });

  const {
    rankedPitches,
    unrankedCount,
    totalVoters,
    userHasVoted,
    userRankingCount,
  } = useRankingData({
    pitches,
    pollResults,
  });

  const isLoading = tripLoading || pitchesLoading;
  const deadline = trip?.pitch_deadline ? new Date(trip.pitch_deadline) : null;
  const hasDeadline = !!deadline;
  const hasPitches = pitches.length > 0;
  const hasCurrentUserPitch = pitches.some(
    (pitch) => !!currentUser?.id && pitch.user_id === currentUser.id,
  );
  const handleSaveDeadline = async (date: Date) => {
    await updateTrip.mutateAsync({
      tripID: tripID!,
      data: { pitch_deadline: date.toISOString() },
    });
    await queryClient.invalidateQueries({ queryKey: getTripQueryKey(tripID!) });
  };

  const navigateToPitch = (pitchID: string) => {
    router.push({
      pathname: `/trips/${tripID}/pitches/${pitchID}` as any,
      params: { tripID },
    });
  };

  const navigateToPitchCreation = () => {
    if (!hasDeadline) {
      setDeadlineFlowVisible(true);
      return;
    }
    setCreatePitchFlowVisible(true);
  };

  const handleSetDestination = useCallback((locationName: string) => {
    const destination = locationName.trim();
    if (!destination) return;
    setDestinationToConfirm(destination);
  }, []);

  const handleConfirmDestination = useCallback(async () => {
    if (!tripID || !destinationToConfirm) return;

    try {
      await updateTrip.mutateAsync({
        tripID,
        data: { location: destinationToConfirm },
      });
      await queryClient.invalidateQueries({
        queryKey: getTripQueryKey(tripID),
      });
      toast.show({
        message: `Location has been set to ${destinationToConfirm}.`,
      });
      setDestinationToConfirm(null);
    } catch {
      toast.show({ message: "Couldn't set destination. Please try again." });
    }
  }, [destinationToConfirm, queryClient, toast, tripID, updateTrip]);

  const handleSubmitPitchComment = useCallback(
    async (comment: CommentData) => {
      if (!tripID || !activeCommentPitchId) {
        await onSubmitComment(comment);
        return;
      }

      const queryKey = pitchesQueryKey(tripID);
      type PitchesData = InfiniteData<
        ModelsPitchCursorPageResult,
        string | undefined
      >;
      const previous = queryClient.getQueryData<PitchesData>(queryKey);

      queryClient.setQueryData<PitchesData>(queryKey, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: ModelsPitchCursorPageResult) => ({
            ...page,
            items: (page.items ?? []).map((pitch) => {
              if (pitch?.id !== activeCommentPitchId) return pitch;

              const optimisticPreview: ModelsCommenterPreview = {
                user_id: currentUser?.id ?? comment.authorSeed,
                name: comment.authorName ?? currentUser?.name,
                profile_picture_url:
                  comment.authorAvatar ?? currentUserProfilePhotoUrl,
              };

              const existingPreviews = pitch.comment_previews ?? [];
              const nextPreviews = [
                optimisticPreview,
                ...existingPreviews.filter(
                  (preview) => preview.user_id !== currentUser?.id,
                ),
              ].slice(0, 3);

              return {
                ...pitch,
                comment_count: (pitch.comment_count ?? 0) + 1,
                comment_previews: nextPreviews,
              };
            }),
          })),
        };
      });

      try {
        await onSubmitComment(comment);
        queryClient.invalidateQueries({ queryKey });
      } catch (error) {
        queryClient.setQueryData(queryKey, previous);
        throw error;
      }
    },
    [
      tripID,
      activeCommentPitchId,
      currentUser?.id,
      currentUser?.name,
      currentUserProfilePhotoUrl,
      onSubmitComment,
      queryClient,
    ],
  );

  const handleCloseCreatePitchFlow = () => {
    setCreatePitchFlowVisible(false);
    setTouchBlockVisible(true);
    setTimeout(() => setTouchBlockVisible(false), 420);
  };

  return (
    <Screen>
      <Box
        flex={1}
        backgroundColor="white"
        style={{ paddingLeft: insets.left, paddingRight: insets.right }}
      >
        <Box flex={1} gap="sm">
          <PitchesHeader
            tab={tab}
            onTabChange={setTab}
            isLoading={isLoading}
            deadline={deadline}
            pitchCount={pitches.length}
            hasCurrentUserPitch={hasCurrentUserPitch}
            onPressAddDeadline={() => setDeadlineFlowVisible(true)}
          />

          {tab === "pitches" ? (
            <PitchesTabContent
              pitches={pitches}
              isLoading={isLoading}
              isError={pitchesError}
              isLoadingMore={isLoadingMore}
              hasDeadline={hasDeadline}
              onFetchMore={fetchMore}
              onOpenPitch={navigateToPitch}
              onOpenComments={setActiveCommentPitchId}
              onRetry={refetchPitches}
            />
          ) : (
            <RankingTabContent
              unrankedCount={unrankedCount}
              userHasVoted={userHasVoted}
              userRankingCount={userRankingCount}
              totalVoters={totalVoters}
              rankedPitches={rankedPitches}
              pollId={pollId}
              hasPitches={hasPitches}
              onOpenRankingSheet={() =>
                router.push(`/trips/${tripID}/pitches/ranking` as any)
              }
              onOpenPitch={navigateToPitch}
              onSetDestination={handleSetDestination}
              onOpenVoters={(position, count, optionID, pitchName) =>
                setSelectedChoiceVoters({
                  position,
                  count,
                  optionID,
                  pitchName,
                })
              }
            />
          )}
        </Box>

        {!isLoading &&
          !!currentUser &&
          deadline &&
          deadline > new Date() &&
          tab === "pitches" && (
            <PitchCtaBar
              insetBottom={insets.bottom}
              onPress={navigateToPitchCreation}
            />
          )}
      </Box>

      <CommentSection
        visible={!!activeCommentPitchId}
        onClose={() => setActiveCommentPitchId(null)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={fetchNextPage}
        currentUserId={currentUser?.id ?? ""}
        currentUserName={currentUser?.name ?? ""}
        currentUserAvatar={currentUserProfilePhotoUrl}
        currentUserSeed={currentUser?.id}
        onSubmitComment={handleSubmitPitchComment}
        onReact={onReact}
      />

      {deadlineFlowVisible && (
        <DeadlinePickerFlow
          onClose={() => setDeadlineFlowVisible(false)}
          onSave={handleSaveDeadline}
        />
      )}

      <CreatePitchFlowSheet
        tripID={tripID!}
        visible={createPitchFlowVisible}
        onClose={handleCloseCreatePitchFlow}
      />

      <SetDestinationConfirmModal
        visible={!!destinationToConfirm}
        destinationName={destinationToConfirm ?? ""}
        onCancel={() => setDestinationToConfirm(null)}
        onConfirm={handleConfirmDestination}
      />

      <RankingVotersSheet
        visible={!!selectedChoiceVoters}
        onClose={() => {
          setSelectedChoiceVoters(null);
          setChoiceVoters([]);
        }}
        choiceLabel={
          selectedChoiceVoters
            ? `#${selectedChoiceVoters.position} Choice`
            : "Choice"
        }
        choiceCount={selectedChoiceVoters?.count ?? 0}
        pitchTitle={selectedChoiceVoters?.pitchName}
        voters={
          selectedChoiceVoters?.optionID
            ? choiceVoters
            : (pollVoters?.voters ?? [])
        }
        isLoading={
          selectedChoiceVoters?.optionID ? isChoiceVotersLoading : false
        }
      />

      {touchBlockVisible && (
        <Pressable onPress={() => {}} style={styles.touchBlocker} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  touchBlocker: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
