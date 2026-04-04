import { searchPlacesTypeahead } from "@/api/places/custom/api";
import { Box, Text } from "@/design-system";
import TextField from "@/design-system/components/inputs/text-field";
import type { ModelsPlacePrediction } from "@/types/types.gen";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MapPin, Search } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView } from "react-native";
import { ColorPalette } from "@/design-system/tokens/color";

interface LocationSearchProps {
  onSelect: (prediction: ModelsPlacePrediction) => void;
}

export function LocationSearch({ onSelect }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ModelsPlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    searchPlacesTypeahead(debouncedQuery, 5)
      .then((res) => setResults(res?.data?.predictions ?? []))
      .catch(() => setResults([]))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery]);

  return (
    <Box flex={1} gap="md">
      <TextField
        placeholder="Search for a destination..."
        value={query}
        onChangeText={setQuery}
        leftIcon={<Search size={18} color={ColorPalette.gray500} />}
        autoFocus
      />

      {isLoading && (
        <Box alignItems="center" paddingTop="md">
          <ActivityIndicator />
        </Box>
      )}

      <ScrollView keyboardShouldPersistTaps="handled">
        <Box gap="xs">
          {results.map((prediction) => (
            <Pressable
              key={prediction.place_id}
              onPress={() => onSelect(prediction)}
            >
              <Box
                flexDirection="row"
                alignItems="center"
                gap="sm"
                padding="sm"
                backgroundColor="white"
                borderRadius="md"
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
                <Box flex={1} gap="xxs">
                  <Text
                    variant="bodySmMedium"
                    color="gray900"
                    numberOfLines={1}
                  >
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
      </ScrollView>
    </Box>
  );
}
