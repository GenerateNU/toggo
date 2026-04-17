import { useGetCategoriesByTripID } from "@/api/categories";
import { Box, Button, Text } from "@/design-system";
import BottomSheet from "@/design-system/components/bottom-sheet/bottom-sheet";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types";
import { Plus } from "lucide-react-native";
import { forwardRef } from "react";
import { Pressable, StyleSheet } from "react-native";

type CategoriesSheetProps = {
  tripID: string;
  selected: string[];
  onChange: (categories: string[]) => void;
  onDone: () => void;
};

export const CategoriesSheet = forwardRef<
  BottomSheetMethods,
  CategoriesSheetProps
>(({ tripID, selected, onChange, onDone }, ref) => {
  const { data } = useGetCategoriesByTripID(tripID);
  const categories = (data?.categories ?? []).filter(
    (cat): cat is typeof cat & { name: string } => !!cat.name,
  );

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name],
    );
  };

  return (
    <BottomSheet
      ref={ref}
      snapPoints={["40%"]}
      initialIndex={-1}
      footer={
        <Box paddingHorizontal="sm" paddingBottom="md">
          <Button
            layout="textOnly"
            label="Done"
            variant="Primary"
            onPress={onDone}
          />
        </Box>
      }
    >
      <Box padding="sm" gap="sm">
        <Box
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text variant="bodyMedium" color="gray900">
            Categories
          </Text>
          <Pressable onPress={onDone}>
            <Text variant="bodySmMedium" color="gray500">
              Done
            </Text>
          </Pressable>
        </Box>

        <Box flexDirection="row" flexWrap="wrap" gap="xs">
          {categories.map((cat) => {
            const isSelected = selected.includes(cat.name);
            return (
              <Pressable key={cat.name} onPress={() => toggle(cat.name)}>
                <Box
                  paddingHorizontal="sm"
                  paddingVertical="xxs"
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text
                    variant="bodyXsMedium"
                    style={{
                      color: isSelected
                        ? ColorPalette.white
                        : ColorPalette.gray900,
                    }}
                  >
                    {cat.label ?? cat.name}
                  </Text>
                </Box>
              </Pressable>
            );
          })}

          <Pressable>
            <Box
              flexDirection="row"
              alignItems="center"
              gap="xxs"
              paddingHorizontal="sm"
              paddingVertical="xxs"
              style={styles.chip}
            >
              <Plus size={12} color={ColorPalette.gray500} />
              <Text variant="bodyXsMedium" color="gray500">
                Create amenity
              </Text>
            </Box>
          </Pressable>
        </Box>
      </Box>
    </BottomSheet>
  );
});

CategoriesSheet.displayName = "CategoriesSheet";

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.full,
  },
  chipSelected: {
    backgroundColor: ColorPalette.gray900,
    borderColor: ColorPalette.gray900,
  },
});
