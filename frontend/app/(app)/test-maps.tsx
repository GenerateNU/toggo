import { getPlaceDetails, searchPlacesTypeahead } from "@/api/places";
import { useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function TestMapsScreen() {
  const [typeaheadQuery, setTypeaheadQuery] = useState("");
  const [typeaheadResult, setTypeaheadResult] = useState<any>(null);
  const [typeaheadLoading, setTypeaheadLoading] = useState(false);
  const [typeaheadError, setTypeaheadError] = useState("");

  const [detailsPlaceId, setDetailsPlaceId] = useState("");
  const [detailsInput, setDetailsInput] = useState("");
  const [detailsResult, setDetailsResult] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const handleTypeaheadSearch = async () => {
    if (!typeaheadQuery.trim()) {
      setTypeaheadError("Please enter a search query");
      return;
    }

    setTypeaheadLoading(true);
    setTypeaheadError("");
    setTypeaheadResult(null);

    try {
      const response = await searchPlacesTypeahead(typeaheadQuery, 5);
      setTypeaheadResult(response.data);
    } catch (error: any) {
      setTypeaheadError(error.message || "Failed to search places");
      console.error("Typeahead error:", error);
    } finally {
      setTypeaheadLoading(false);
    }
  };

  const handleGetDetails = async () => {
    if (!detailsPlaceId.trim() && !detailsInput.trim()) {
      setDetailsError("Please enter either a place_id or search text");
      return;
    }

    setDetailsLoading(true);
    setDetailsError("");
    setDetailsResult(null);

    try {
      const params: any = {};
      if (detailsPlaceId.trim()) {
        params.place_id = detailsPlaceId.trim();
      } else if (detailsInput.trim()) {
        params.input = detailsInput.trim();
      }

      const response = await getPlaceDetails(params);
      setDetailsResult(response.data);
    } catch (error: any) {
      setDetailsError(error.message || "Failed to get place details");
      console.error("Details error:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const useTypeaheadResult = (placeId: string) => {
    setDetailsPlaceId(placeId);
    setDetailsInput("");
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
          Google Maps API Test
        </Text>

        {/* Typeahead Section */}
        <View
          style={{
            marginBottom: 30,
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
            1. Typeahead Search
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
            GET /api/v1/search/places/typeahead
          </Text>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
              backgroundColor: "#fff",
              fontSize: 16,
            }}
            placeholder="Search for a place (e.g., Eiffel Tower)"
            value={typeaheadQuery}
            onChangeText={setTypeaheadQuery}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={{
              backgroundColor: "#007AFF",
              padding: 14,
              borderRadius: 6,
              alignItems: "center",
            }}
            onPress={handleTypeaheadSearch}
            disabled={typeaheadLoading}
          >
            {typeaheadLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                Search
              </Text>
            )}
          </TouchableOpacity>

          {typeaheadError && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: "#fee",
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#c00" }}>{typeaheadError}</Text>
            </View>
          )}

          {typeaheadResult && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: "#fff",
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#ddd",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: "#333",
                }}
              >
                Response:
              </Text>
              <ScrollView
                horizontal
                style={{ maxHeight: 300 }}
                nestedScrollEnabled
              >
                <Text
                  style={{
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    fontSize: 12,
                    color: "#333",
                  }}
                >
                  {JSON.stringify(typeaheadResult, null, 2)}
                </Text>
              </ScrollView>

              {typeaheadResult.predictions?.length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                  >
                    Quick Actions:
                  </Text>
                  {typeaheadResult.predictions.map((pred: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        padding: 10,
                        backgroundColor: "#e8f4ff",
                        borderRadius: 6,
                        marginBottom: 6,
                      }}
                      onPress={() => useTypeaheadResult(pred.place_id)}
                    >
                      <Text style={{ fontSize: 12, color: "#007AFF" }}>
                        Use "{pred.main_text}" in details below
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Place Details Section */}
        <View
          style={{
            marginBottom: 30,
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 12 }}>
            2. Get Place Details
          </Text>
          <Text style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
            POST /api/v1/search/places/details
          </Text>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              marginBottom: 8,
              color: "#333",
            }}
          >
            Option A: Use place_id (from typeahead)
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
              backgroundColor: "#fff",
              fontSize: 14,
            }}
            placeholder="Place ID (e.g., ChIJLU7jZClu5kcR4PcOOO6p3I0)"
            value={detailsPlaceId}
            onChangeText={(text) => {
              setDetailsPlaceId(text);
              if (text) setDetailsInput("");
            }}
            autoCapitalize="none"
          />

          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              marginBottom: 8,
              color: "#333",
            }}
          >
            Option B: Direct text search
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
              backgroundColor: "#fff",
              fontSize: 14,
            }}
            placeholder="Search text (e.g., Eiffel Tower)"
            value={detailsInput}
            onChangeText={(text) => {
              setDetailsInput(text);
              if (text) setDetailsPlaceId("");
            }}
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={{
              backgroundColor: "#34C759",
              padding: 14,
              borderRadius: 6,
              alignItems: "center",
            }}
            onPress={handleGetDetails}
            disabled={detailsLoading}
          >
            {detailsLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                Get Details
              </Text>
            )}
          </TouchableOpacity>

          {detailsError && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: "#fee",
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#c00" }}>{detailsError}</Text>
            </View>
          )}

          {detailsResult && (
            <View
              style={{
                marginTop: 12,
                padding: 12,
                backgroundColor: "#fff",
                borderRadius: 6,
                borderWidth: 1,
                borderColor: "#ddd",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: "#333",
                }}
              >
                Response:
              </Text>
              <ScrollView
                horizontal
                style={{ maxHeight: 400 }}
                nestedScrollEnabled
              >
                <Text
                  style={{
                    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                    fontSize: 12,
                    color: "#333",
                  }}
                >
                  {JSON.stringify(detailsResult, null, 2)}
                </Text>
              </ScrollView>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View
          style={{
            padding: 16,
            backgroundColor: "#fff3cd",
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
            💡 How to use:
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 20 }}>
            1. Use Typeahead to search and get predictions{"\n"}
            2. Click "Use in details" or manually enter place_id/text{"\n"}
            3. Get full details with coordinates, photos, ratings, etc.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
