import {
  getPlaceDetailsCustom,
  searchPlacesTypeahead,
} from "@/api/places/custom";
import {
  BottomSheet,
  Box,
  Button,
  DateRangePicker,
  Text,
} from "@/design-system";
import type { DateRange } from "@/design-system/primitives/date-picker";
import { ColorPalette } from "@/design-system/tokens/color";
import { CornerRadius } from "@/design-system/tokens/corner-radius";
import { Layout } from "@/design-system/tokens/layout";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ArrowLeft, Calendar, MapPin, Search, X } from "lucide-react-native";
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

type SelectedLocation = {
  name: string;
  place_id: string;
};

export type CreateTripParams = {
  locationName?: string;
  startDate?: string;
  endDate?: string;
};

type CreateTripSheetProps = {
  bottomSheetRef: React.RefObject<any>;
  onCreate: (params: CreateTripParams) => void;
  onDismiss?: () => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

function formatDateRange(range: DateRange): string | null {
  if (!range.start) return null;
  const start = range.start.toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
  if (!range.end) return start;
  const end = range.end.toLocaleDateString("en-US", DATE_FORMAT_OPTIONS);
  return `${start} – ${end}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTripSheet({
  bottomSheetRef,
  onCreate,
  onDismiss,
}: CreateTripSheetProps) {
  const searchInputRef = useRef<TextInput>(null);

  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<SelectedLocation | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const debouncedQuery = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setPredictions([]);
      return;
    }
    fetchPredictions(debouncedQuery);
  }, [debouncedQuery]);

  const fetchPredictions = async (query: string) => {
    setIsLoadingPredictions(true);
    try {
      const res = await searchPlacesTypeahead(query, 8);
      setPredictions(res.data?.predictions ?? []);
    } catch {
      setPredictions([]);
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const enterSearchMode = () => {
    setIsSearchMode(true);
    setTimeout(() => {
      bottomSheetRef.current?.snapToIndex(0);
      searchInputRef.current?.focus();
    }, 100);
  };

  const exitSearchMode = () => {
    setIsSearchMode(false);
    setSearchQuery("");
    setPredictions([]);
  };

  const handleSelectPrediction = async (prediction: Prediction) => {
    try {
      const res = await getPlaceDetailsCustom({
        place_id: prediction.place_id,
      });
      const name =
        res.data?.name ?? res.data?.formatted_address ?? prediction.description;
      setSelectedLocation({ name, place_id: prediction.place_id });
    } catch {
      setSelectedLocation({
        name: prediction.description,
        place_id: prediction.place_id,
      });
    } finally {
      exitSearchMode();
    }
  };

  const handleDismiss = () => {
    resetState();
    onDismiss?.();
  };

  const resetState = () => {
    setIsSearchMode(false);
    setSearchQuery("");
    setPredictions([]);
    setSelectedLocation(null);
    setDateRange({ start: null, end: null });
  };

  const handleCreate = () => {
    const params: CreateTripParams = {
      locationName: selectedLocation?.name,
      startDate: dateRange.start?.toISOString(),
      endDate: dateRange.end?.toISOString(),
    };
    resetState();
    onCreate(params);
  };

  const formattedDates = formatDateRange(dateRange);

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        onClose={handleDismiss}
        {...(isSearchMode && { snapPoints: ["90%"] })}
      >
        {isSearchMode ? (
          // ─── Search state ───────────────────────────────────────────────
          <Box paddingHorizontal="sm" paddingTop="xs" gap="sm">
            {/* Header */}
            <Box flexDirection="row" alignItems="center" gap="sm">
              <TouchableOpacity
                onPress={exitSearchMode}
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
                {isLoadingPredictions ? (
                  <ActivityIndicator
                    size="small"
                    color={ColorPalette.gray400}
                  />
                ) : (
                  <Search size={16} color={ColorPalette.gray400} />
                )}
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search for a destination"
                  placeholderTextColor={ColorPalette.gray400}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery("");
                      setPredictions([]);
                    }}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <X size={24} color={ColorPalette.gray400} />
                  </TouchableOpacity>
                )}
              </Box>
            </Box>

            {/* Predictions list */}
            {predictions.map((prediction) => (
              <TouchableOpacity
                key={prediction.place_id}
                onPress={() => handleSelectPrediction(prediction)}
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
                  <Text
                    variant="bodyDefault"
                    color="gray950"
                    style={{ flex: 1 }}
                  >
                    {prediction.description}
                  </Text>
                </Box>
              </TouchableOpacity>
            ))}
          </Box>
        ) : (
          // ─── Form state ─────────────────────────────────────────────────
          <Box paddingHorizontal="sm" paddingBottom="lg" gap="xxs">
            {/* Close button */}
            <Box flexDirection="row" justifyContent="space-between">
              <Text variant="headingMd" color="gray950">
                {"Know where you're going?"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  bottomSheetRef.current?.close();
                  handleDismiss();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={24} color={ColorPalette.gray950} />
              </TouchableOpacity>
            </Box>

            <Text variant="bodyDefault" color="gray500" marginBottom="xs">
              Plan a new trip
            </Text>

            <Box gap="sm">
              {/* Location field */}
              <TouchableOpacity
                onPress={enterSearchMode}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Set destination"
              >
                <Box
                  style={styles.fieldRow}
                  flexDirection="row"
                  alignItems="center"
                  gap="xs"
                >
                  <MapPin
                    size={16}
                    color={
                      selectedLocation
                        ? ColorPalette.gray950
                        : ColorPalette.gray300
                    }
                  />
                  <Text
                    variant="bodyDefault"
                    color={selectedLocation ? "gray950" : "gray300"}
                    style={{ flex: 1 }}
                    numberOfLines={1}
                  >
                    {selectedLocation?.name ?? "Destination"}
                  </Text>
                </Box>
              </TouchableOpacity>

              {/* Date field */}
              <TouchableOpacity
                onPress={() => setIsDatePickerVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Set trip dates"
              >
                <Box
                  style={styles.fieldRow}
                  flexDirection="row"
                  alignItems="center"
                  gap="xs"
                >
                  <Calendar
                    size={16}
                    color={
                      formattedDates
                        ? ColorPalette.gray950
                        : ColorPalette.gray300
                    }
                  />
                  <Text
                    variant="bodyDefault"
                    color={formattedDates ? "gray950" : "gray300"}
                  >
                    {formattedDates ?? "Dates"}
                  </Text>
                </Box>
              </TouchableOpacity>

              <Button
                layout="textOnly"
                label="Create Trip"
                variant="Primary"
                onPress={handleCreate}
              />
            </Box>
          </Box>
        )}
      </BottomSheet>

      <DateRangePicker
        visible={isDatePickerVisible}
        onClose={() => setIsDatePickerVisible(false)}
        onSave={(range) => {
          setDateRange(range);
          setIsDatePickerVisible(false);
        }}
        initialRange={dateRange}
        minDate={new Date()}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fieldRow: {
    borderWidth: 1,
    borderColor: ColorPalette.gray200,
    borderRadius: CornerRadius.sm,
    backgroundColor: ColorPalette.white,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    minHeight: 48,
  },
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
