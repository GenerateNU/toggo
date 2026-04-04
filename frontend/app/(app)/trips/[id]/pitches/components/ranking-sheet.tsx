import { useSubmitRanking } from "@/api/polls/useSubmitRanking";
import { Box, Button, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import type {
  ModelsOptionWithScore,
  ModelsPitchAPIResponse,
  ModelsUserRankingItem,
} from "@/types/types.gen";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PitchPickerSheet } from "./pitch-picker-sheet";

const SLOT_COUNT = 3;
const BADGE_SIZE = 32;
const THUMBNAIL_SIZE = 60;

interface Slot {
  option: ModelsOptionWithScore;
  pitch: ModelsPitchAPIResponse;
}

interface RankingSheetProps {
  visible: boolean;
  onClose: () => void;
  tripID: string;
  pollId: string;
  pitches: ModelsPitchAPIResponse[];
  pollOptions: ModelsOptionWithScore[];
  userRanking: ModelsUserRankingItem[];
}

function RankBadge({ number, filled }: { number: number; filled: boolean }) {
  return (
    <Box
      style={[
        styles.badge,
        {
          backgroundColor: filled
            ? ColorPalette.brand500
            : ColorPalette.gray100,
        },
      ]}
    >
      <Text
        variant="bodySmMedium"
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
        gap="sm"
        padding="sm"
        marginHorizontal="sm"
        marginBottom="xs"
        borderRadius="md"
        style={slot ? styles.filledSlot : styles.emptySlot}
      >
        <RankBadge number={slotNumber} filled={!!slot} />

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
              <Text variant="bodyXsDefault" color="gray500">
                Tap to change
              </Text>
            </Box>
          </>
        ) : (
          <Box flex={1}>
            <Text variant="bodySmMedium" color="gray900">
              Select choice #{slotNumber}
            </Text>
            <Text variant="bodyXsDefault" color="gray500">
              Tap to choose a location
            </Text>
          </Box>
        )}
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

export function RankingSheet({
  visible,
  onClose,
  tripID,
  pollId,
  pitches,
  pollOptions,
  userRanking,
}: RankingSheetProps) {
  const { bottom } = useSafeAreaInsets();
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

  const handleClose = () => {
    setDraftSlots(null);
    setPickingSlot(null);
    onClose();
  };

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
      // If this option is already in another slot, clear that slot (swap)
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

    await submitRankingAsync({ tripID, pollId, data: { rankings } });
    handleClose();
  };

  const slotCount = Math.min(SLOT_COUNT, pollOptions.length);
  const allSlotsFilled = slots.slice(0, slotCount).every(Boolean);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <Box flex={1} backgroundColor="white">
        <Box
          alignItems="center"
          justifyContent="center"
          paddingHorizontal="sm"
          paddingVertical="sm"
          backgroundColor="white"
          style={{ position: "relative" }}
        >
          <Text variant="headingSm" color="gray900">
            My ranking
          </Text>
          <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
            <X size={20} color={ColorPalette.gray900} />
          </Pressable>
        </Box>

        <Box flex={1}>
          <Box paddingHorizontal="sm" paddingVertical="sm">
            <Text variant="bodyXsDefault" color="gray500">
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
      </Box>

      {/* Pitch picker sheet */}
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
          excludeOptionIds={[]}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
  },
  emptySlot: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: ColorPalette.gray200,
  },
  filledSlot: {
    borderWidth: 1,
    borderColor: ColorPalette.brand500,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    top: 16,
  },
});
