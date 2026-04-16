import { useCreateCategory } from "@/api/categories/useCreateCategory";
import { getCategoriesByTripIDQueryKey } from "@/api/categories/useGetCategoriesByTripID";
import { getTripTabsQueryKey } from "@/api/categories/useGetTripTabs";
import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import TextField from "@/design-system/components/inputs/text-field";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { modelsCategoryViewType } from "@/types/types.gen";
import type { ModelsCategoryViewType } from "@/types/types.gen";
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
  /** Called with the new tab's `name` after a successful create. */
  onCategoryCreated?: (categoryName: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const CreateTabSheet = forwardRef<CreateTabSheetMethods, CreateTabSheetProps>(
  ({ tripID, onCategoryCreated }, ref) => {
    const bottomSheetRef = useRef<BottomSheetMethods>(null);
    const queryClient = useQueryClient();
    const createCategory = useCreateCategory({
      mutation: {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getTripTabsQueryKey(tripID),
          });
          queryClient.invalidateQueries({
            queryKey: getCategoriesByTripIDQueryKey(tripID, {
              include_hidden: true,
            }),
          });
        },
      },
    });
    const [label, setLabel] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [viewType, setViewType] = useState<ModelsCategoryViewType>(
      modelsCategoryViewType.CategoryViewTypeActivity,
    );

    useImperativeHandle(ref, () => ({
      open: () => {
        setLabel("");
        setError(null);
        setViewType(modelsCategoryViewType.CategoryViewTypeActivity);
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
            view_type:
              viewType === modelsCategoryViewType.CategoryViewTypeMoodboard
                ? modelsCategoryViewType.CategoryViewTypeMoodboard
                : modelsCategoryViewType.CategoryViewTypeActivity,
          },
        });
        onCategoryCreated?.(name);
        bottomSheetRef.current?.close();
      } catch {
        setError("Could not create tab. Please try again.");
      }
    };

    const handleClose = () => {
      bottomSheetRef.current?.close();
    };

    return (
      <BottomSheetModal ref={bottomSheetRef}>
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

        <Box style={styles.content} gap="md">
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

          <Box gap="xs">
            <Text variant="bodySmStrong" color="gray700">
              Tab type
            </Text>
            <Box flexDirection="row" gap="sm">
              <Pressable
                onPress={() =>
                  setViewType(modelsCategoryViewType.CategoryViewTypeActivity)
                }
                style={[
                  styles.typeChip,
                  viewType ===
                    modelsCategoryViewType.CategoryViewTypeActivity &&
                    styles.typeChipSelected,
                ]}
              >
                <Text
                  variant="bodySmMedium"
                  color={
                    viewType ===
                    modelsCategoryViewType.CategoryViewTypeActivity
                      ? "gray950"
                      : "gray600"
                  }
                >
                  Activity list
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setViewType(
                    modelsCategoryViewType.CategoryViewTypeMoodboard,
                  )
                }
                style={[
                  styles.typeChip,
                  viewType ===
                    modelsCategoryViewType.CategoryViewTypeMoodboard &&
                    styles.typeChipSelected,
                ]}
              >
                <Text
                  variant="bodySmMedium"
                  color={
                    viewType ===
                    modelsCategoryViewType.CategoryViewTypeMoodboard
                      ? "gray950"
                      : "gray600"
                  }
                >
                  Mood board
                </Text>
              </Pressable>
            </Box>
          </Box>
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
  typeChip: {
    flex: 1,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    alignItems: "center",
  },
  typeChipSelected: {
    borderColor: ColorPalette.gray900,
    backgroundColor: ColorPalette.gray50,
  },
});

export default CreateTabSheet;
