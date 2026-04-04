import { Box, Button, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import TextField from "@/design-system/components/inputs/text-field";
import { ColorPalette } from "@/design-system/tokens/color";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { X } from "lucide-react-native";
import { useRef, useState } from "react";
import { Alert, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AddLinkSheetProps {
  onClose: () => void;
  onAdd: (url: string) => void;
}

export function AddLinkSheet({ onClose, onAdd }: AddLinkSheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [url, setUrl] = useState("");
  const { bottom } = useSafeAreaInsets();

  const handleClose = () => {
    setUrl("");
    onClose();
  };

  const handleAdd = () => {
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      Alert.alert(
        "Invalid URL",
        "Please enter a URL starting with http:// or https://",
      );
      return;
    }
    onAdd(trimmed);
    handleClose();
  };

  return (
    <BottomSheetComponent
      ref={sheetRef}
      snapPoints={["45%"]}
      initialIndex={0}
      onClose={handleClose}
      footer={
        <Box
          paddingHorizontal="sm"
          paddingTop="xs"
          style={{ paddingBottom: Math.max(bottom, 16) }}
        >
          <Button
            layout="textOnly"
            label="Add link"
            variant="Primary"
            onPress={handleAdd}
            disabled={!url.trim()}
          />
        </Box>
      }
    >
      {/* Header */}
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="sm"
        paddingBottom="xs"
      >
        <Text variant="headingSm" color="gray900">
          Add a link
        </Text>
        <Pressable onPress={handleClose} hitSlop={8}>
          <X size={20} color={ColorPalette.gray500} />
        </Pressable>
      </Box>

      <Box paddingHorizontal="sm" gap="sm">
        <Text variant="bodySmDefault" color="gray500">
          Share a video, photo, or website that helps sell your pitch.
        </Text>

        <TextField
          label="Paste your link"
          value={url}
          onChangeText={setUrl}
          placeholder="https://..."
          keyboardType="url"
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
      </Box>
    </BottomSheetComponent>
  );
}
