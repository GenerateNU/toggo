import { useEntityComments } from "@/api/comments/custom/useEntityComments";
import {
  pitchesQueryKey,
  usePitchesList,
} from "@/api/pitches/custom/usePitchesList";
import { useRankingData } from "@/api/pitches/custom/useRankingData";
import {
  getRankPollResultsQueryKey,
  useGetRankPollResults,
} from "@/api/polls/useGetRankPollResults";
import { getTripQueryKey, useGetTrip } from "@/api/trips/useGetTrip";
import { useUpdateTrip } from "@/api/trips/useUpdateTrip";
import { useUser } from "@/contexts/user";
import { Box, Screen } from "@/design-system";
import CommentSection from "@/design-system/components/comments/comment-section";
import type { CommentData } from "@/design-system/components/comments/comment";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import type { ModelsPitchCursorPageResult } from "@/types/types.gen";
import { modelsEntityType } from "@/types/types.gen";
import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DeadlinePickerFlow } from "./components/deadline-picker-flow";
import { PitchCtaBar } from "./components/pitch-cta-bar";
import { PitchesHeader } from "./components/pitches-header";
import { PitchesTabContent } from "./components/pitches-tab-content";
import { RankingSheet } from "./components/ranking-sheet";
import { RankingTabContent } from "./components/ranking-tab-content";
import { CreatePitchFlowSheet } from "./creation/components/create-pitch-flow-sheet";

export default function Pitches() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<"pitches" | "ranking">("pitches");
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { currentUser } = useUser();
  const [activeCommentPitchId, setActiveCommentPitchId] = useState<
    string | null
  >(null);
  const [rankingSheetVisible, setRankingSheetVisible] = useState(false);
  const [deadlineFlowVisible, setDeadlineFlowVisible] = useState(false);
  const [createPitchFlowVisible, setCreatePitchFlowVisible] = useState(false);
  const [touchBlockVisible, setTouchBlockVisible] = useState(false);

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
    fetchMore,
    isLoadingMore,
  } = usePitchesList(tripID);
  const updateTrip = useUpdateTrip();

  const pollId = trip?.rank_poll_id;

  const { data: pollResults } = useGetRankPollResults(tripID!, pollId ?? "", {
    query: { enabled: !!pollId && tab === "ranking" },
  });

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
    pollOptions,
    userRanking,
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

              return {
                ...pitch,
                comment_count: (pitch.comment_count ?? 0) + 1,
              };
            }),
          })),
        };
      });

      try {
        await onSubmitComment(comment);
      } catch (error) {
        queryClient.setQueryData(queryKey, previous);
        throw error;
      }
    },
    [tripID, activeCommentPitchId, onSubmitComment, queryClient],
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
        gap="sm"
        backgroundColor="white"
        style={{ paddingLeft: insets.left, paddingRight: insets.right }}
      >
        <PitchesHeader
          tab={tab}
          onTabChange={setTab}
          isLoading={isLoading}
          deadline={deadline}
          pitchCount={pitches.length}
          hasCurrentUserPitch={hasCurrentUserPitch}
          onPressAddDeadline={() => setDeadlineFlowVisible(true)}
        />

        {isLoading ? (
          <Box flex={1} alignItems="center" justifyContent="center">
            <ActivityIndicator />
          </Box>
        ) : tab === "pitches" ? (
          <PitchesTabContent
            pitches={pitches}
            isLoadingMore={isLoadingMore}
            onFetchMore={fetchMore}
            onOpenPitch={navigateToPitch}
            onOpenComments={setActiveCommentPitchId}
            onCreatePitch={navigateToPitchCreation}
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
            onOpenRankingSheet={() => setRankingSheetVisible(true)}
            onOpenPitch={navigateToPitch}
          />
        )}

        {!isLoading && hasPitches && hasDeadline && tab === "pitches" && (
          <PitchCtaBar
            insetBottom={insets.bottom}
            onPress={navigateToPitchCreation}
          />
        )}
      </Box>

      {pollId && (
        <RankingSheet
          visible={rankingSheetVisible}
          onClose={() => setRankingSheetVisible(false)}
          tripID={tripID!}
          pollId={pollId}
          pitches={pitches}
          pollOptions={pollOptions}
          userRanking={userRanking}
        />
      )}

      <CommentSection
        visible={!!activeCommentPitchId}
        onClose={() => setActiveCommentPitchId(null)}
        comments={comments}
        isLoading={isLoadingComments}
        isLoadingMore={isLoadingMoreComments}
        onLoadMore={fetchNextPage}
        currentUserId={currentUser?.id ?? ""}
        currentUserName={currentUser?.username ?? currentUser?.name ?? ""}
        currentUserAvatar={currentUser?.profile_picture}
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
