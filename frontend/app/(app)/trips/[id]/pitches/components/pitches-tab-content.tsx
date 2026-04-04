import { Box, ErrorState } from "@/design-system";
import type { ModelsPitchAPIResponse } from "@/types/types.gen";
import { ActivityIndicator, ScrollView } from "react-native";
import { EmptyPitchState } from "./empty-pitch-state";
import { PitchCard } from "./pitch-card";
import { PitchCardSkeleton } from "./pitch-card-skeleton";

const SKELETON_COUNT = 3;

interface PitchesTabContentProps {
  pitches: ModelsPitchAPIResponse[];
  isLoading: boolean;
  isError: boolean;
  isLoadingMore: boolean;
  hasDeadline: boolean;
  onFetchMore: () => void;
  onOpenPitch: (pitchID: string) => void;
  onOpenComments: (pitchID: string) => void;
  onCreatePitch: () => void;
  onRetry: () => void;
}

function PitchesSkeletonList() {
  return (
    <Box paddingTop="xs">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <PitchCardSkeleton key={i} />
      ))}
    </Box>
  );
}

export function PitchesTabContent({
  pitches,
  isLoading,
  isError,
  isLoadingMore,
  hasDeadline,
  onFetchMore,
  onOpenPitch,
  onOpenComments,
  onCreatePitch,
}: PitchesTabContentProps) {
  if (isLoading) {
    return <PitchesSkeletonList />;
  }

  if (isError) {
    return (
      <Box alignItems="center" justifyContent="center" padding="lg">
        <ErrorState />
      </Box>
    );
  }

  if (pitches.length === 0) {
    return (
      <Box
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="sm"
        paddingVertical="xxl"
        marginVertical="xxl"
      >
        <EmptyPitchState onPress={onCreatePitch} hasDeadline={hasDeadline} />
      </Box>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: 4, paddingBottom: 100 }}
      onScrollEndDrag={onFetchMore}
    >
      {pitches.map((pitch) => (
        <PitchCard
          key={pitch.id}
          pitch={pitch}
          onPress={() => pitch.id && onOpenPitch(pitch.id)}
          onCommentPress={() => pitch.id && onOpenComments(pitch.id)}
        />
      ))}
      {isLoadingMore && (
        <Box padding="md" alignItems="center">
          <ActivityIndicator />
        </Box>
      )}
    </ScrollView>
  );
}
