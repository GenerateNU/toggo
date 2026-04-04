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
  const trimmedQuery = debouncedQuery.trim();
  const visibleResults = trimmedQuery ? results : [];

  const handleChangeQuery = (nextQuery: string) => {
    setQuery(nextQuery);

    if (!nextQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
  };

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    let isCancelled = false;
    searchPlacesTypeahead(trimmedQuery, 5)
      .then((res) => {
        if (isCancelled) return;
        setResults(res?.data?.predictions ?? []);
      })
      .catch(() => {
        if (isCancelled) return;
        setResults([]);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [trimmedQuery]);

  return (
    <Box flex={1} gap="md">
      <TextField
        placeholder="Search for a destination..."
        value={query}
        onChangeText={handleChangeQuery}
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
          {visibleResults.map((prediction) => (
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
