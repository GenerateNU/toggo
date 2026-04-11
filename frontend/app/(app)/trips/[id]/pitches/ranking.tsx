import { usePitchesList } from "@/api/pitches/custom/usePitchesList";
import { useRankingData } from "@/api/pitches/custom/useRankingData";
import { useGetRankPollResults } from "@/api/polls/useGetRankPollResults";
import { useSubmitRanking } from "@/api/polls/useSubmitRanking";
import { useGetTrip } from "@/api/trips/useGetTrip";
import { Box, Button, Icon, Screen, Text, useToast } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import type {
  ModelsOptionWithScore,
  ModelsPitchAPIResponse,
  ModelsUserRankingItem,
} from "@/types/types.gen";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MapPinPlus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PitchPickerSheet } from "./components/pitch-picker-sheet";

const SLOT_COUNT = 3;
const BADGE_SIZE = 40;
const THUMBNAIL_SIZE = 28;

interface Slot {
  option: ModelsOptionWithScore;
  pitch: ModelsPitchAPIResponse;
}

function RankBadge({ number, filled }: { number: number; filled: boolean }) {
  return (
    <Box
      borderRadius="md"
      style={[
        styles.badge,
        {
          backgroundColor: filled ? ColorPalette.blue500 : ColorPalette.gray100,
        },
      ]}
    >
      <Text
        variant="bodyMedium"
        style={{ color: filled ? ColorPalette.white : ColorPalette.gray500 }}
      >
        {number}
      </Text>
    </Box>
  );
}

interface SlotRowProps {
  slotIndex: number;
  slot: Slot | null;
  onPress: () => void;
}

function SlotRow({ slotIndex, slot, onPress }: SlotRowProps) {
  const slotNumber = slotIndex + 1;
  const thumbnail = slot?.pitch.images?.[0]?.medium_url;

  return (
    <Pressable onPress={onPress}>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="xs"
        marginHorizontal="sm"
        marginBottom="xs"
      >
        <RankBadge number={slotNumber} filled={!!slot} />

        <Box
          flex={1}
          flexDirection="row"
          alignItems="center"
          gap="sm"
          paddingVertical="sm"
          paddingHorizontal="sm"
          borderRadius="md"
          style={slot ? styles.filledSlot : styles.emptySlot}
        >
          {slot ? (
            <>
              {thumbnail ? (
                <Image
                  source={{ uri: thumbnail }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
              ) : (
                <Box
                  style={styles.thumbnail}
                  backgroundColor="gray100"
                  borderRadius="md"
                />
              )}
              <Box flex={1}>
                <Text variant="bodySmMedium" color="gray900" numberOfLines={1}>
                  {slot.pitch.title}
                </Text>
                <Text variant="bodyXsStrong" color="gray400">
                  Tap to change
                </Text>
              </Box>
            </>
          ) : (
            <Box flexDirection="row" alignItems="center" gap="sm" flex={1}>
              <Box
                width={THUMBNAIL_SIZE}
                height={THUMBNAIL_SIZE}
                borderRadius="sm"
                backgroundColor="blue50"
                alignItems="center"
                justifyContent="center"
              >
                <Icon icon={MapPinPlus} size="xs" color="blue500" />
              </Box>
              <Box flex={1}>
                <Text variant="bodySmMedium" color="gray900">
                  Select choice #{slotNumber}
                </Text>
                <Text variant="bodyXsDefault" color="blue500">
                  Tap to choose a location
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Pressable>
  );
}

function buildInitialSlots(
  pitches: ModelsPitchAPIResponse[],
  pollOptions: ModelsOptionWithScore[],
  userRanking: ModelsUserRankingItem[],
): [Slot | null, Slot | null, Slot | null] {
  const slots: [Slot | null, Slot | null, Slot | null] = [null, null, null];

  for (const item of userRanking) {
    const slotIndex = (item.rank_position ?? 0) - 1;
    if (slotIndex < 0 || slotIndex >= SLOT_COUNT) continue;

    const option = pollOptions.find((o) => o.option_id === item.option_id);
    if (!option) continue;

    const pitch = pitches.find((p) => p.id === option.entity_id);
    if (!pitch) continue;

    slots[slotIndex] = { option, pitch };
  }

  return slots;
}

export default function RankingPage() {
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { bottom } = useSafeAreaInsets();

  const { data: trip, isLoading: isTripLoading } = useGetTrip(tripID!);
  const { pitches, isLoading: isPitchesLoading } = usePitchesList(tripID);

  const pollId = trip?.rank_poll_id;
  const { data: pollResults, isLoading: isPollLoading } = useGetRankPollResults(
    tripID!,
    pollId ?? "",
    {
      query: { enabled: !!pollId },
    },
  );

  const { pollOptions, userRanking } = useRankingData({
    pitches,
    pollResults,
  });

  const initialSlots = useMemo(
    () => buildInitialSlots(pitches, pollOptions, userRanking),
    [pitches, pollOptions, userRanking],
  );
  const [draftSlots, setDraftSlots] = useState<
    [Slot | null, Slot | null, Slot | null] | null
  >(null);
  const [pickingSlot, setPickingSlot] = useState<0 | 1 | 2 | null>(null);
  const slots = draftSlots ?? initialSlots;
  const { mutateAsync: submitRankingAsync, isPending: isSubmitting } =
    useSubmitRanking();

  const isLoading =
    isTripLoading || isPitchesLoading || (!!pollId && isPollLoading);
  const slotCount = Math.min(SLOT_COUNT, pollOptions.length);
  const allSlotsFilled = slots.slice(0, slotCount).every(Boolean);

  if (isLoading) {
    return (
      <Screen>
        <Box
          flex={1}
          alignItems="center"
          justifyContent="center"
          backgroundColor="white"
        >
          <ActivityIndicator />
        </Box>
      </Screen>
    );
  }

  if (!pollId) {
    return (
      <Screen>
        <Box
          flex={1}
          alignItems="center"
          justifyContent="center"
          padding="lg"
          backgroundColor="white"
        >
          <Text variant="bodySmDefault" color="gray500" textAlign="center">
            Ranking is not available yet for this trip.
          </Text>
        </Box>
      </Screen>
    );
  }

  const handleSelect = (
    slotIndex: 0 | 1 | 2,
    option: ModelsOptionWithScore,
    pitch: ModelsPitchAPIResponse,
  ) => {
    setDraftSlots((prev) => {
      const base = prev ?? initialSlots;
      const next: [Slot | null, Slot | null, Slot | null] = [...base] as [
        Slot | null,
        Slot | null,
        Slot | null,
      ];
      for (let i = 0; i < next.length; i++) {
        if (i !== slotIndex && next[i]?.option.option_id === option.option_id) {
          next[i] = null;
        }
      }
      next[slotIndex] = { option, pitch };
      return next;
    });
  };

  const handleSubmit = async () => {
    const rankings = slots
      .map((slot, i) =>
        slot ? { option_id: slot.option.option_id!, rank: i + 1 } : null,
      )
      .filter(Boolean) as { option_id: string; rank: number }[];

    try {
      await submitRankingAsync({ tripID: tripID!, pollId, data: { rankings } });
      toast.show({ message: "Ranking updated" });
      router.back();
    } catch {
      toast.show({ message: "Failed to update ranking. Please try again." });
    }
  };

  return (
    <Box flex={1} backgroundColor="white" paddingTop="md">
      <Box flex={1} gap="xs">
        <Box paddingHorizontal="sm" paddingBottom="xxs" alignSelf="stretch">
          <Text variant="bodyXsDefault" color="gray500" textAlign="left">
            Tap each box to choose your top{" "}
            {slotCount === 1 ? "location" : `${slotCount} locations`}!
          </Text>
        </Box>

        {slots.slice(0, slotCount).map((slot, index) => (
          <SlotRow
            key={index}
            slotIndex={index}
            slot={slot}
            onPress={() => setPickingSlot(index as 0 | 1 | 2)}
          />
        ))}
      </Box>

      <Box
        paddingHorizontal="sm"
        paddingTop="md"
        style={{ paddingBottom: Math.max(bottom, 16) + 8 }}
        backgroundColor="white"
      >
        <Button
          variant="Primary"
          layout="textOnly"
          label="Update ranking"
          disabled={!allSlotsFilled || isSubmitting}
          loading={isSubmitting}
          onPress={handleSubmit}
        />
      </Box>

      {pickingSlot !== null && (
        <PitchPickerSheet
          visible={true}
          onClose={() => setPickingSlot(null)}
          onSelect={(option, pitch) => {
            if (pickingSlot !== null) {
              handleSelect(pickingSlot, option, pitch);
            }
          }}
          pitches={pitches}
          pollOptions={pollOptions}
          slotNumber={pickingSlot + 1}
          excludeOptionIds={slots
            .map((slot, index) =>
              index === pickingSlot ? undefined : slot?.option.option_id,
            )
            .filter((id): id is string => !!id)}
        />
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 6,
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ColorPalette.blue500,
    backgroundColor: ColorPalette.blue25,
  },
  filledSlot: {
    borderWidth: 1,
    borderColor: ColorPalette.blue500,
    backgroundColor: ColorPalette.white,
  },
});
