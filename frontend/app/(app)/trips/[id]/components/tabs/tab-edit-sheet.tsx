import {
  getCategoriesByTripIDQueryKey,
  useGetCategoriesByTripID,
} from "@/api/categories/useGetCategoriesByTripID";
import { getTripTabsQueryKey } from "@/api/categories/useGetTripTabs";
import { useHideCategory } from "@/api/categories/useHideCategory";
import { useReorderTripTabs } from "@/api/categories/useReorderTripTabs";
import { useShowCategory } from "@/api/categories/useShowCategory";
import { Button } from "@/design-system";
import BottomSheetModal from "@/design-system/components/bottom-sheet/bottom-sheet";
import { Box } from "@/design-system/primitives/box";
import { Text } from "@/design-system/primitives/text";
import { useToast } from "@/design-system/primitives/toast-manager";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import type { ModelsCategoryAPIResponse } from "@/types/types.gen";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { useQueryClient } from "@tanstack/react-query";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import CreateTabSheet, { CreateTabSheetMethods } from "./create-tab-sheet";
import { useTabReorder } from "./hooks/useTabReorder";
import TabRowItem from "./tab-row-item";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TabEditSheetMethods {
  open: () => void;
  close: () => void;
}

interface TabEditSheetProps {
  tripID: string;
  isAdmin: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TabEditSheet = forwardRef<TabEditSheetMethods, TabEditSheetProps>(
  ({ tripID, isAdmin }, ref) => {
    const bottomSheetRef = useRef<BottomSheetMethods>(null);
    const createTabSheetRef = useRef<CreateTabSheetMethods>(null);
    const queryClient = useQueryClient();
    const toast = useToast();

    const { data: categoriesData } = useGetCategoriesByTripID(tripID, {
      include_hidden: true,
    });
    const allTabs = useMemo(
      () => categoriesData?.categories ?? [],
      [categoriesData?.categories],
    );

    const hideCategory = useHideCategory();
    const showCategory = useShowCategory();
    const reorderTabs = useReorderTripTabs();

    const invalidateTabQueries = () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: getTripTabsQueryKey(tripID),
        }),
        queryClient.invalidateQueries({
          queryKey: getCategoriesByTripIDQueryKey(tripID, {
            include_hidden: true,
          }),
        }),
      ]);

    const handleReorder = async (reordered: ModelsCategoryAPIResponse[]) => {
      try {
        await reorderTabs.mutateAsync({
          tripID,
          data: {
            tabs: reordered.map((tab, index) => ({
              name: tab.name ?? "",
              position: index,
            })),
          },
        });
        await invalidateTabQueries();
      } catch {
        toast.show({ message: "Could not reorder tabs. Please try again." });
      }
    };

    const {
      orderedTabs,
      draggingName,
      dragIndex,
      translateY,
      swapBudget,
      listLength,
      setDragging,
      doSwap,
      onDragEnd,
    } = useTabReorder({ tabs: allTabs, onReorder: handleReorder });

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.snapToIndex(0),
      close: () => bottomSheetRef.current?.close(),
    }));

    const handleToggle = async (tab: ModelsCategoryAPIResponse) => {
      const name = tab.name ?? "";
      try {
        if (tab.is_hidden) {
          await showCategory.mutateAsync({ tripID, name });
        } else {
          await hideCategory.mutateAsync({ tripID, name });
        }
        await invalidateTabQueries();
      } catch {
        toast.show({
          message: "Could not update tab visibility. Please try again.",
        });
      }
    };

    const handleClose = () => {
      bottomSheetRef.current?.close();
    };

    return (
      <>
        <BottomSheetModal
          ref={bottomSheetRef}
          snapPoints={["90%"]}
          disableClose={false}
        >
          <Box style={styles.header}>
            <Pressable onPress={handleClose} style={styles.headerButton}>
              <Text variant="bodyDefault" color="gray600">
                Cancel
              </Text>
            </Pressable>
            <Text variant="bodyStrong" color="gray950">
              Edit Tabs
            </Text>
            <Pressable onPress={handleClose} style={styles.headerButton}>
              <Text variant="bodyStrong" style={styles.doneText}>
                Done
              </Text>
            </Pressable>
          </Box>

          <Box style={styles.list}>
            {orderedTabs.map((tab, index) => (
              <TabRowItem
                key={tab.name}
                tab={tab}
                index={index}
                isDragging={draggingName === tab.name}
                isAdmin={isAdmin}
                dragIndex={dragIndex}
                translateY={translateY}
                swapBudget={swapBudget}
                listLength={listLength}
                onToggle={() => handleToggle(tab)}
                setDragging={setDragging}
                doSwap={doSwap}
                onDragEnd={onDragEnd}
              />
            ))}
          </Box>

          <Box padding="sm">
            <Button
              layout="textOnly"
              variant="Secondary"
              label="Create a new tab"
              onPress={() => createTabSheetRef.current?.open()}
            />
          </Box>
        </BottomSheetModal>

        <CreateTabSheet ref={createTabSheetRef} tripID={tripID} />
      </>
    );
  },
);

TabEditSheet.displayName = "TabEditSheet";

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
  doneText: {
    color: ColorPalette.blue500,
    textAlign: "right",
  },
  list: {
    paddingTop: Layout.spacing.xs,
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
  },
  createButton: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Layout.spacing.sm,
    marginTop: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    borderRadius: CornerRadius.md,
    backgroundColor: ColorPalette.gray50,
    borderWidth: 1,
    borderColor: ColorPalette.gray100,
  },
});

export default TabEditSheet;
