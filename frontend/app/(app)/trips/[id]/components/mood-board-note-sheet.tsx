import { useCreateActivity } from "@/api/activities";
import { Box, Button, Text, TextField, useToast } from "@/design-system";
import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsActivityAPIResponse } from "@/types/types.gen";
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet } from "react-native";
import { assertMoodBoardActivityXor } from "./mood-board-utils";

export type MoodBoardNoteSheetHandle = {
  open: () => void;
  close: () => void;
};

type MoodBoardNoteSheetProps = {
  tripID: string;
  categoryName: string;
  onSaved: (activity: ModelsActivityAPIResponse) => void;
};

const NOTE_TITLE = "Note";

export const MoodBoardNoteSheet = forwardRef<
  MoodBoardNoteSheetHandle,
  MoodBoardNoteSheetProps
>(({ tripID, categoryName, onSaved }, ref) => {
  const sheetRef = useRef<BottomSheetMethods>(null);
  const [body, setBody] = useState("");
  const createActivity = useCreateActivity();
  const toast = useToast();

  useImperativeHandle(ref, () => ({
    open: () => {
      setBody("");
      sheetRef.current?.snapToIndex(0);
    },
    close: () => sheetRef.current?.close(),
  }));

  const handleSave = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const payload = {
      name: NOTE_TITLE,
      description: trimmed,
    };
    try {
      assertMoodBoardActivityXor("text", {
        ...payload,
      });
    } catch (e) {
      toast.show({ message: (e as Error).message });
      return;
    }
    try {
      const created = await createActivity.mutateAsync({
        tripID,
        data: {
          name: payload.name,
          description: payload.description,
          category_names: [categoryName],
        },
      });
      sheetRef.current?.close();
      if (created) onSaved(created as ModelsActivityAPIResponse);
    } catch {
      toast.show({ message: "Could not save note." });
    }
  };

  return (
    <BottomSheetModal ref={sheetRef}>
      <Box style={styles.header}>
        <Pressable onPress={() => sheetRef.current?.close()}>
          <Text variant="bodySmDefault" color="gray600">
            Cancel
          </Text>
        </Pressable>
        <Text variant="bodySmStrong" color="gray950">
          Add note
        </Text>
        <Button
          layout="textOnly"
          label="Save"
          variant="Primary"
          disabled={!body.trim() || createActivity.isPending}
          loading={createActivity.isPending}
          onPress={handleSave}
        />
      </Box>
      <Box padding="sm" gap="sm">
        <TextField
          label="Note"
          placeholder="Write something…"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={6}
        />
      </Box>
    </BottomSheetModal>
  );
});

MoodBoardNoteSheet.displayName = "MoodBoardNoteSheet";

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ColorPalette.gray100,
  },
});
