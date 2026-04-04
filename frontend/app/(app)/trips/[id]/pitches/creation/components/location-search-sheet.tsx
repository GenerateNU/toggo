import { searchPlacesTypeahead } from "@/api/places/custom/api";
import { Box, Text } from "@/design-system";
import BottomSheetComponent from "@/design-system/components/bottom-sheet/bottom-sheet";
import TextField from "@/design-system/components/inputs/text-field";
import { ColorPalette } from "@/design-system/tokens/color";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ModelsPlacePrediction } from "@/types/types.gen";
import { MapPin, Search, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";

interface LocationSearchSheetProps {
  onClose: () => void;
  onSelect: (prediction: ModelsPlacePrediction) => void;
}

export function LocationSearchSheet({
  onClose,
  onSelect,
}: LocationSearchSheetProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModelsPlacePrediction[]>([]);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    searchPlacesTypeahead(debouncedQuery, 8)
      .then((res) => setResults(res?.data?.predictions ?? []))
      .catch(() => setResults([]))
      .finally(() => {});
  }, [debouncedQuery]);

  const displayResults = debouncedQuery.trim() ? results : [];

  const handleSelect = (prediction: ModelsPlacePrediction) => {
    onSelect(prediction);
  };

  return (
    <BottomSheetComponent
      snapPoints={["85%"]}
      initialIndex={0}
      onClose={onClose}
    >
      {/* Header */}
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingHorizontal="sm"
        paddingBottom="sm"
      >
        <Text variant="headingSm" color="gray900">
          Location
        </Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <X size={20} color={ColorPalette.gray500} />
        </Pressable>
      </Box>

      {/* Search input */}
      <Box paddingHorizontal="sm" paddingBottom="sm">
        <TextField
          value={query}
          onChangeText={setQuery}
          placeholder="Enter a city, neighborhood, or address"
          leftIcon={
            query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8}>
                <X size={18} color={ColorPalette.gray500} />
              </Pressable>
            ) : (
              <Search size={18} color={ColorPalette.gray500} />
            )
          }
          autoCapitalize="none"
        />
      </Box>

      {/* Results */}
      <Box paddingHorizontal="sm">
        {displayResults.map((prediction) => (
          <Pressable
            key={prediction.place_id}
            onPress={() => handleSelect(prediction)}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              gap="sm"
              paddingVertical="sm"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: ColorPalette.gray100,
              }}
            >
              <Box
                width={36}
                height={36}
                borderRadius="full"
                backgroundColor="gray100"
                alignItems="center"
                justifyContent="center"
              >
                <MapPin size={16} color={ColorPalette.gray500} />
              </Box>
              <Box flex={1}>
                <Text variant="bodySmMedium" color="gray900" numberOfLines={1}>
                  {prediction.main_text ?? prediction.description}
                </Text>
                {prediction.secondary_text ? (
                  <Text
                    variant="bodyXsDefault"
                    color="gray500"
                    numberOfLines={1}
                  >
                    {prediction.secondary_text}
                  </Text>
                ) : null}
              </Box>
            </Box>
          </Pressable>
        ))}
      </Box>
    </BottomSheetComponent>
  );
}
