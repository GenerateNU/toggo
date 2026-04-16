import { Avatar, Box, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useEffect, useRef } from "react";
import { AudioPlayerContent } from "../../components/audio-sheet";
import { getPitchBarHeights } from "../../utils/waveform";

const BAR_COUNT = 50;

interface AudioPlayerSheetProps {
  visible: boolean;
  onClose: () => void;
  audioUrl: string;
  pitchId: string;
  name?: string;
  profilePictureUrl?: string;
  userId?: string;
}

export function AudioPlayerSheet({
  visible,
  onClose,
  audioUrl,
  pitchId,
  name,
  profilePictureUrl,
  userId,
}: AudioPlayerSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const barHeights = getPitchBarHeights(pitchId, BAR_COUNT);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  return (
    <BottomSheetComponent
      ref={sheetRef}
      snapPoints={["45%"]}
      initialIndex={-1}
      onClose={onClose}
      disableScrollView
    >
      <Box paddingHorizontal="sm" paddingBottom="sm">
        <Text variant="headingSm" color="gray900">
          Audio Pitch
        </Text>
      </Box>

      <Box
        flexDirection="row"
        alignItems="center"
        gap="xs"
        paddingHorizontal="sm"
        paddingBottom="md"
      >
        <Avatar profilePhoto={profilePictureUrl} seed={userId} variant="sm" />
        <Text variant="bodySmMedium" color="gray700">
          {name ?? "Unknown"}
        </Text>
      </Box>

      <Box paddingHorizontal="sm">
        <AudioPlayerContent audioUri={audioUrl} barHeights={barHeights} />
      </Box>
    </BottomSheetComponent>
  );
}
