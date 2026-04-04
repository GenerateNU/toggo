import { Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import type {
  ModelsOptionWithScore,
  ModelsPitchAPIResponse,
} from "@/types/types.gen";
import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const THUMBNAIL_SIZE = 60;

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
  option: ModelsOptionWithScore;
  disabled: boolean;
  onPress: () => void;
}

function PitchRow({ pitch, disabled, onPress }: PitchRowProps) {
  const thumbnail = pitch.images?.[0]?.medium_url;

  return (
    <Pressable onPress={disabled ? undefined : onPress}>
      <Box
        flexDirection="row"
        alignItems="center"
        gap="sm"
        padding="sm"
        style={disabled ? styles.disabledRow : undefined}
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
          <Text variant="bodyXsDefault" color="gray400" numberOfLines={2}>
            {disabled ? "Already selected" : pitch.description}
          </Text>
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
  const { bottom } = useSafeAreaInsets();

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
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box flex={1} backgroundColor="white">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="sm"
          paddingVertical="sm"
          style={styles.header}
        >
          <Text variant="bodySmMedium" color="gray900">
            Select your #{slotNumber} choice
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={20} color={ColorPalette.gray900} />
          </Pressable>
        </Box>

        <ScrollView contentContainerStyle={{ paddingBottom: bottom + 16 }}>
          {availablePitches.map(({ pitch, option, disabled }) => (
            <PitchRow
              key={pitch.id}
              pitch={pitch}
              option={option}
              disabled={disabled}
              onPress={() => {
                onSelect(option, pitch);
                onClose();
              }}
            />
          ))}
        </ScrollView>
      </Box>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    borderBottomColor: ColorPalette.gray100,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
  },
  disabledRow: {
    opacity: 0.5,
  },
});
