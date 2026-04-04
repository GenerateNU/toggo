import type { ModelsPitchAPIResponse } from "@/types/types.gen";
import { ActivityIndicator, ScrollView } from "react-native";
import { Box } from "@/design-system";
import { EmptyPitchState } from "./empty-pitch-state";
import { PitchCard } from "./pitch-card";

interface PitchesTabContentProps {
  pitches: ModelsPitchAPIResponse[];
  isLoadingMore: boolean;
  onFetchMore: () => void;
  onOpenPitch: (pitchID: string) => void;
  onOpenComments: (pitchID: string) => void;
  onCreatePitch: () => void;
}

export function PitchesTabContent({
  pitches,
  isLoadingMore,
  onFetchMore,
  onOpenPitch,
  onOpenComments,
  onCreatePitch,
}: PitchesTabContentProps) {
  const hasPitches = pitches.length > 0;

  if (!hasPitches) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" padding="sm">
        <EmptyPitchState onPress={onCreatePitch} />
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
