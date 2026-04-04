import {
  getPlaceDetailsCustom,
  searchPlacesTypeahead,
} from "@/api/places/custom";
import { Box, Button, Icon, Screen, Text, TextField } from "@/design-system";
import { ColorPalette } from "@/design-system/tokens/color";
import { Layout } from "@/design-system/tokens/layout";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  Camera,
  MapView,
  PointAnnotation,
} from "@maplibre/maplibre-react-native";
import { router } from "expo-router";
import { Search, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// ─── Types ───────────────────────────────────────────────────────────────────

type Prediction = {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
};

type LocationDetails = {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: { lat: number; lng: number };
  };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
const TYPEAHEAD_LIMIT = 10;
const DEFAULT_ZOOM = 11;

// ─── Component ───────────────────────────────────────────────────────────────

export default function SearchLocationScreen() {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationDetails | null>(null);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    if (isSelectingPlace) return;
    if (!debouncedQuery.trim()) {
      setPredictions([]);
      return;
    }
    fetchPredictions(debouncedQuery);
  }, [debouncedQuery, isSelectingPlace]);

  const fetchPredictions = async (q: string) => {
    setIsLoadingPredictions(true);
    try {
      const res = await searchPlacesTypeahead(q, TYPEAHEAD_LIMIT);
      setPredictions(res.data?.predictions ?? []);
    } finally {
      setIsLoadingPredictions(false);
    }
  };

  const handleSelectPrediction = async (prediction: Prediction) => {
    setIsSelectingPlace(true);
    setIsLoadingDetails(true);
    setQuery(prediction.description);
    setPredictions([]);
    try {
      const res = await getPlaceDetailsCustom({
        place_id: prediction.place_id,
      });
      setSelectedLocation(res.data);
    } catch (error) {
      console.error("Failed to fetch place details:", error);
      setIsSelectingPlace(false);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleQueryChange = (text: string) => {
    if (isSelectingPlace) {
      setIsSelectingPlace(false);
      setSelectedLocation(null);
    }
    setQuery(text);
  };

  const showPredictions = predictions.length > 0;
  const showMap = !!selectedLocation && !showPredictions;

  const handleConfirm = () => {
    router.back();
  };

  return (
    <Screen>
      <Box flex={1} backgroundColor="gray50">
        <SearchHeader
          query={query}
          onChangeQuery={handleQueryChange}
          onDismiss={() => router.back()}
          isLoading={isLoadingPredictions}
        />

        {showPredictions ? (
          <PredictionsList
            predictions={predictions}
            onSelect={handleSelectPrediction}
          />
        ) : showMap ? (
          <LocationMapView location={selectedLocation} />
        ) : isLoadingDetails ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <ActivityIndicator size="large" color={ColorPalette.brand500} />
          </Box>
        ) : (
          <Box flex={1} backgroundColor="white" />
        )}

        {showMap && (
          <Box
            paddingHorizontal="sm"
            paddingVertical="sm"
            backgroundColor="white"
            style={styles.confirmBar}
          >
            <Button
              layout="textOnly"
              label={`Select ${selectedLocation.name || selectedLocation.formatted_address}`}
              variant="Primary"
              onPress={handleConfirm}
            />
          </Box>
        )}
      </Box>
    </Screen>
  );
}

// ─── Search Header ────────────────────────────────────────────────────────────

function SearchHeader({
  query,
  onChangeQuery,
  onDismiss,
  isLoading,
}: {
  query: string;
  onChangeQuery: (text: string) => void;
  onDismiss: () => void;
  isLoading: boolean;
}) {
  return (
    <Box
      backgroundColor="white"
      paddingHorizontal="lg"
      paddingTop="lg"
      paddingBottom="sm"
      gap="sm"
      style={styles.header}
    >
      <Box
        flexDirection="row"
        justifyContent="center"
        alignItems="center"
        style={styles.titleRow}
      >
        <Text variant="headingSm" color="gray500">
          Location
        </Text>
        {query.length > 0 && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={styles.hitSlop}
            style={styles.dismissButton}
          >
            <Icon icon={X} color="gray500" size="sm" />
          </TouchableOpacity>
        )}
      </Box>

      <TextField
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Enter a city, neighborhood, or address"
        leftIcon={
          isLoading ? (
            <ActivityIndicator size="small" color={ColorPalette.gray400} />
          ) : (
            <Icon icon={Search} color="gray400" size="sm" />
          )
        }
      />
    </Box>
  );
}

// ─── Predictions List ─────────────────────────────────────────────────────────

function PredictionsList({
  predictions,
  onSelect,
}: {
  predictions: Prediction[];
  onSelect: (prediction: Prediction) => void;
}) {
  return (
    <FlatList
      data={predictions}
      keyExtractor={(item) => item.place_id}
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelect(item)} activeOpacity={0.6}>
          <Box
            paddingHorizontal="lg"
            paddingVertical="md"
            backgroundColor="white"
            style={styles.predictionItem}
          >
            <Text variant="bodyDefault" color="gray500">
              {item.description}
            </Text>
          </Box>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => (
        <Box style={styles.separator} backgroundColor="gray50" />
      )}
      style={styles.predictionsList}
    />
  );
}

// ─── Location Map View ────────────────────────────────────────────────────────

function LocationMapView({ location }: { location: LocationDetails }) {
  const coordinate: [number, number] = [
    location.geometry.location.lng,
    location.geometry.location.lat,
  ];

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        mapStyle={MAP_STYLE_URL}
        logoEnabled={false}
        attributionEnabled={true}
      >
        <Camera
          centerCoordinate={coordinate}
          zoomLevel={DEFAULT_ZOOM}
          animationMode="flyTo"
          animationDuration={600}
        />
        <PointAnnotation id="selected-pin" coordinate={coordinate}>
          <View style={styles.pin}>
            <View style={styles.pinDot} />
          </View>
        </PointAnnotation>
      </MapView>

      <View style={styles.locationLabel} pointerEvents="none">
        <Box
          backgroundColor="white"
          paddingHorizontal="sm"
          paddingVertical="xs"
          style={styles.locationLabelInner}
        >
          <Text variant="bodyXsMedium" color="gray500" numberOfLines={1}>
            {location.name || location.formatted_address}
          </Text>
        </Box>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  titleRow: {
    position: "relative",
  },
  dismissButton: {
    position: "absolute",
    right: 0,
    padding: Layout.spacing.xxs,
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
  predictionsList: {
    backgroundColor: ColorPalette.white,
  },
  predictionItem: {
    minHeight: 48,
    justifyContent: "center",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ColorPalette.brand500,
    borderWidth: 3,
    borderColor: ColorPalette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ColorPalette.white,
  },
  locationLabel: {
    position: "absolute",
    bottom: Layout.spacing.lg,
    left: Layout.spacing.lg,
    right: Layout.spacing.lg,
    alignItems: "center",
  },
  locationLabelInner: {
    borderRadius: 8,
    maxWidth: "80%",
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBar: {
    shadowColor: ColorPalette.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
});
