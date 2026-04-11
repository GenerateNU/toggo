import { Box, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import type {
  ModelsOptionWithScore,
  ModelsPitchAPIResponse,
} from "@/types/types.gen";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useRef } from "react";
import { Pressable, StyleSheet } from "react-native";

const THUMBNAIL_SIZE = 48;

interface PitchPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (
    option: ModelsOptionWithScore,
    pitch: ModelsPitchAPIResponse,
  ) => void;
  pitches: ModelsPitchAPIResponse[];
  pollOptions: ModelsOptionWithScore[];
  slotNumber: number;
  excludeOptionIds: string[];
}

interface PitchRowProps {
  pitch: ModelsPitchAPIResponse;
  disabled: boolean;
  onPress: () => void;
}

function PitchRow({ pitch, disabled, onPress }: PitchRowProps) {
  const thumbnail = pitch.images?.[0]?.medium_url;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        gap="sm"
        paddingVertical="sm"
        paddingHorizontal="md"
        marginHorizontal="sm"
        marginBottom="sm"
        borderRadius="lg"
        backgroundColor="white"
        style={styles.rowCard}
      >
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
          <Text
            variant="bodySmMedium"
            color={disabled ? "gray400" : "gray900"}
            numberOfLines={1}
          >
            {pitch.title}
          </Text>
          {pitch.description ? (
            <Text variant="bodyXsDefault" color="gray500" numberOfLines={2}>
              {pitch.description}
            </Text>
          ) : null}
        </Box>
      </Box>
    </Pressable>
  );
}

export function PitchPickerSheet({
  visible,
  onClose,
  onSelect,
  pitches,
  pollOptions,
  slotNumber,
  excludeOptionIds,
}: PitchPickerSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);

  if (!visible) {
    return null;
  }

  const availablePitches = pitches.flatMap((pitch) => {
    const option = pollOptions.find((o) => o.entity_id === pitch.id);
    if (!option) return [];
    return [
      {
        pitch,
        option,
        disabled: excludeOptionIds.includes(option.option_id ?? ""),
      },
    ];
  });

  return (
    <BottomSheetComponent
      ref={sheetRef}
      initialIndex={0}
      snapPoints={["42%"]}
      onClose={onClose}
      hideHandle={true}
    >
      <Box style={{ paddingBottom: 16, paddingTop: 12 }}>
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="sm"
          paddingBottom="md"
          style={{ paddingTop: 0 }}
        >
          <Text variant="bodyMedium" color="gray900">
            Select your #{slotNumber} choice
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={18} color={ColorPalette.gray900} />
          </Pressable>
        </Box>

        <Box>
          {availablePitches.map(({ pitch, option, disabled }) => (
            <PitchRow
              key={pitch.id}
              pitch={pitch}
              disabled={disabled}
              onPress={() => {
                onSelect(option, pitch);
                onClose();
              }}
            />
          ))}
        </Box>
      </Box>
    </BottomSheetComponent>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
  },
  rowCard: {
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
});
