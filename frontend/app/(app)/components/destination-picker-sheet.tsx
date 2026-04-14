import {
  getPlaceDetailsCustom,
  searchPlacesTypeahead,
} from "@/api/places/custom";
import { BottomSheet, Box, Text } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ArrowLeft, MapPin, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

type Prediction = {
  place_id: string;
  description: string;
};

export type SelectedLocation = {
  name: string;
  place_id: string;
};

type DestinationPickerSheetProps = {
  sheetRef: React.RefObject<any>;
  onSelect: (location: SelectedLocation) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DestinationPickerSheet({
  sheetRef,
  onSelect,
}: DestinationPickerSheetProps) {
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setPredictions([]);
      return;
    }
    fetchPredictions(debouncedQuery);
  }, [debouncedQuery]);

  const fetchPredictions = async (q: string) => {
    setIsLoading(true);
    try {
      const res = await searchPlacesTypeahead(q, 8);
      setPredictions(res.data?.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setQuery("");
    setPredictions([]);
    sheetRef.current?.close();
  };

  const handleSelect = async (prediction: Prediction) => {
    try {
      const res = await getPlaceDetailsCustom({ place_id: prediction.place_id });
      const name =
        res.data?.name ?? res.data?.formatted_address ?? prediction.description;
      onSelect({ name, place_id: prediction.place_id });
    } catch {
      onSelect({ name: prediction.description, place_id: prediction.place_id });
    } finally {
      handleClose();
    }
  };

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={["90%"]}
      onClose={() => {
        setQuery("");
        setPredictions([]);
      }}
      onChange={(index) => {
        if (index === 0) setTimeout(() => inputRef.current?.focus(), 100);
      }}
    >
      <Box paddingHorizontal="sm" paddingTop="xs" gap="sm">
        {/* Header */}
        <Box flexDirection="row" alignItems="center" gap="sm">
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={20} color={ColorPalette.gray950} />
          </TouchableOpacity>
          <Box
            flex={1}
            flexDirection="row"
            alignItems="center"
            gap="xs"
            style={styles.searchBar}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={ColorPalette.gray400} />
            ) : (
              <Search size={16} color={ColorPalette.gray400} />
            )}
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search for a destination"
              placeholderTextColor={ColorPalette.gray400}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery("");
                  setPredictions([]);
                }}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <X size={14} color={ColorPalette.gray400} />
              </TouchableOpacity>
            )}
          </Box>
        </Box>

        {/* Results */}
        {predictions.map((prediction) => (
          <TouchableOpacity
            key={prediction.place_id}
            onPress={() => handleSelect(prediction)}
            activeOpacity={0.7}
          >
            <Box
              flexDirection="row"
              alignItems="center"
              gap="sm"
              paddingVertical="sm"
              style={styles.predictionItem}
            >
              <MapPin size={16} color={ColorPalette.gray400} />
              <Text variant="bodyDefault" color="gray950" style={{ flex: 1 }}>
                {prediction.description}
              </Text>
            </Box>
          </TouchableOpacity>
        ))}
      </Box>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchBar: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: ColorPalette.gray950,
    paddingVertical: 0,
  },
  predictionItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ColorPalette.gray100,
  },
});
