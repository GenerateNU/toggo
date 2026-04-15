import { useCreateCategory } from "@/api/categories/useCreateCategory";
import { getTripTabsQueryKey } from "@/api/categories/useGetTripTabs";
import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import TextField from "@/design-system/components/inputs/text-field";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useQueryClient } from "@tanstack/react-query";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateTabSheetMethods {
  open: () => void;
  close: () => void;
}

interface CreateTabSheetProps {
  tripID: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateTabSheet = forwardRef<CreateTabSheetMethods, CreateTabSheetProps>(
  ({ tripID }, ref) => {
    const bottomSheetRef = useRef<BottomSheetMethods>(null);
    const queryClient = useQueryClient();
    const createCategory = useCreateCategory();
    const [label, setLabel] = useState("");
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      open: () => {
        setLabel("");
        setError(null);
        bottomSheetRef.current?.snapToIndex(0);
      },
      close: () => bottomSheetRef.current?.close(),
    }));

    const handleCreate = async () => {
      const trimmed = label.trim();
      if (!trimmed) {
        setError("Tab name is required.");
        return;
      }

      const name = trimmed.toLowerCase().replace(/\s+/g, "_");

      try {
        await createCategory.mutateAsync({
          tripID,
          data: {
            name,
            label: trimmed,
            trip_id: tripID,
          },
        });
        await queryClient.invalidateQueries({
          queryKey: getTripTabsQueryKey(tripID),
        });
        bottomSheetRef.current?.close();
      } catch {
        setError("Could not create tab. Please try again.");
      }
    };

    const handleClose = () => {
      bottomSheetRef.current?.close();
    };

    return (
      <BottomSheetModal ref={bottomSheetRef} size="sm" hideHandle={false}>
        {/* Header */}
        <Box style={styles.header}>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <Text variant="bodySmDefault" color="gray600">
              Cancel
            </Text>
          </Pressable>
          <Text variant="bodySmStrong" color="gray950">
            New Tab
          </Text>
          <Pressable
            onPress={handleCreate}
            disabled={createCategory.isPending}
            style={styles.headerButton}
          >
            <Text
              variant="bodySmStrong"
              style={[
                styles.createText,
                createCategory.isPending && styles.createTextDisabled,
              ]}
            >
              {createCategory.isPending ? "Creating..." : "Create"}
            </Text>
          </Pressable>
        </Box>

        {/* Input */}
        <Box style={styles.content}>
          <TextField
            label="Tab name"
            placeholder="e.g. Fashion Inspo"
            value={label}
            onChangeText={(text) => {
              setLabel(text);
              if (error) setError(null);
            }}
            error={error ?? undefined}
            maxLength={255}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
        </Box>
      </BottomSheetModal>
    );
  },
);

CreateTabSheet.displayName = "CreateTabSheet";

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerButton: {
    minWidth: 60,
  },
  createText: {
    color: ColorPalette.blue500,
    textAlign: "right",
  },
  createTextDisabled: {
    opacity: 0.5,
  },
  content: {
    padding: Layout.spacing.sm,
    paddingTop: Layout.spacing.md,
  },
});

export default CreateTabSheet;