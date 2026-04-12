import { useUploadImage } from "@/api/files/custom";
import {
  useCreatePitch,
  useGetPitch,
  useListPitches,
  useUpdatePitch,
} from "@/api/pitches";
import { Screen } from "@/design-system";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Button,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
} from "react-native";

// Extended types (until frontend types are regenerated)
interface PitchImage {
  id: string;
  medium_url: string;
}

interface ExtendedPitchResponse {
  id: string;
  trip_id: string;
  user_id: string;
  title: string;
  description?: string;
  audio_url?: string;
  duration?: number;
  images?: PitchImage[];
  created_at?: string;
  updated_at?: string;
}

export default function TestPitchImagesScreen() {
  // State for trip ID
  const [tripId, setTripId] = useState("");

  // State for uploaded images
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // State for pitch creation
  const [pitchTitle, setPitchTitle] = useState("Test Pitch");
  const [pitchDescription, setPitchDescription] = useState(
    "Testing pitch with images",
  );
  const [createdPitchId, setCreatedPitchId] = useState<string | null>(null);

  // State for audio file (mock)
  const [audioFileSize] = useState(1024 * 100); // 100KB mock

  // Hooks
  const uploadImageMutation = useUploadImage();
  const createPitchMutation = useCreatePitch();
  const updatePitchMutation = useUpdatePitch();

  // Fetch created pitch details
  const { data: pitchDetails, refetch: refetchPitch } = useGetPitch(
    createdPitchId ?? "",
    tripId ?? "",
    {
      query: {
        enabled: !!createdPitchId && !!tripId,
      },
    },
  );

  // Fetch list of pitches
  const { data: pitchList, refetch: refetchList } = useListPitches(
    tripId ?? "",
    {},
    {
      query: {
        enabled: !!tripId,
      },
    },
  );

  const pickAndUploadImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera roll permission is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;

        uploadImageMutation.mutate(
          { uri, sizes: ["medium", "large"] },
          {
            onSuccess: (data) => {
              console.log("Image uploaded:", data.imageId);
              setUploadedImages((prev) => [...prev, data.imageId]);
              Alert.alert("Success", `Image uploaded: ${data.imageId}`);
            },
            onError: (error) => {
              console.error("Image upload error:", error);
              Alert.alert("Upload Failed", JSON.stringify(error));
            },
          },
        );
      }
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const createPitchWithImages = async () => {
    if (!tripId) {
      Alert.alert("Error", "Please enter a Trip ID first");
      return;
    }

    if (uploadedImages.length === 0) {
      Alert.alert("Error", "Please upload at least one image first");
      return;
    }

    createPitchMutation.mutate(
      {
        tripID: tripId,
        data: {
          title: pitchTitle,
          description: pitchDescription,
          content_type: "audio/mpeg",
          content_length: audioFileSize,
          image_ids: uploadedImages,
        } as any, // Type will be fixed when regenerated
      },
      {
        onSuccess: (response) => {
          console.log("Pitch created:", response);
          const pitchId = (response as any).pitch?.id;
          setCreatedPitchId(pitchId);
          Alert.alert(
            "Success",
            `Pitch created: ${pitchId}\n\nImages: ${uploadedImages.length}\n\nUpload URL received (check console)`,
          );
        },
        onError: (error) => {
          console.error("Pitch creation error:", error);
          Alert.alert("Failed", JSON.stringify(error));
        },
      },
    );
  };

  const addMoreImages = async () => {
    if (!createdPitchId || !tripId) {
      Alert.alert("Error", "Please create a pitch first");
      return;
    }

    // Upload a new image first
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Camera roll permission is required");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;

        // Upload the image
        uploadImageMutation.mutate(
          { uri, sizes: ["medium", "large"] },
          {
            onSuccess: (data) => {
              console.log("New image uploaded:", data.imageId);

              // Update the pitch with the new image
              updatePitchMutation.mutate(
                {
                  tripID: tripId,
                  pitchID: createdPitchId,
                  data: {
                    image_ids: [data.imageId], // Will be merged with existing
                  } as any,
                },
                {
                  onSuccess: () => {
                    Alert.alert("Success", "Image added to pitch!");
                    refetchPitch();
                    refetchList();
                  },
                  onError: (error) => {
                    console.error("Update error:", error);
                    Alert.alert("Failed to add image", JSON.stringify(error));
                  },
                },
              );
            },
            onError: (error) => {
              console.error("Image upload error:", error);
              Alert.alert("Upload Failed", JSON.stringify(error));
            },
          },
        );
      }
    } catch (error) {
      Alert.alert("Error", String(error));
    }
  };

  const clearAllImages = () => {
    if (!createdPitchId || !tripId) {
      Alert.alert("Error", "Please create a pitch first");
      return;
    }

    updatePitchMutation.mutate(
      {
        tripID: tripId,
        pitchID: createdPitchId,
        data: {
          image_ids: [], // Empty array removes all
        } as any,
      },
      {
        onSuccess: () => {
          Alert.alert("Success", "All images removed from pitch!");
          refetchPitch();
          refetchList();
        },
        onError: (error) => {
          console.error("Update error:", error);
          Alert.alert("Failed", JSON.stringify(error));
        },
      },
    );
  };

  const extendedPitchDetails = pitchDetails as unknown as ExtendedPitchResponse;
  const extendedPitchList = pitchList as unknown as {
    items: ExtendedPitchResponse[];
  };

  return (
    <Screen>
      <ScrollView style={{ padding: 20, backgroundColor: "#fff" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
          Pitch Images E2E Test
        </Text>
        <Text style={{ fontSize: 12, color: "#666", marginBottom: 24 }}>
          Test the complete pitch image workflow with presigned URLs
        </Text>

        {/* Step 1: Trip ID Input */}
        <View
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
            1️⃣ Enter Trip ID
          </Text>
          <TextInput
            value={tripId}
            onChangeText={setTripId}
            placeholder="Enter your trip ID"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 4,
              backgroundColor: "#fff",
              fontFamily: "monospace",
            }}
          />
        </View>

        {/* Step 2: Upload Images */}
        <View
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
            2️⃣ Upload Images (Max 5)
          </Text>
          <Button
            title={`Upload Image (${uploadedImages.length}/5)`}
            onPress={pickAndUploadImage}
            disabled={uploadedImages.length >= 5}
          />

          {uploadImageMutation.isPending && (
            <View style={{ marginTop: 8 }}>
              <ActivityIndicator />
              <Text style={{ textAlign: "center", marginTop: 4 }}>
                Uploading...
              </Text>
            </View>
          )}

          {uploadedImages.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                Uploaded Image IDs:
              </Text>
              {uploadedImages.map((id, index) => (
                <Text
                  key={id}
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "#666",
                  }}
                >
                  {index + 1}. {id}
                </Text>
              ))}
              <Button
                title="Clear Uploaded IDs"
                onPress={() => setUploadedImages([])}
                color="#ff6b6b"
              />
            </View>
          )}
        </View>

        {/* Step 3: Create Pitch */}
        <View
          style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
            3️⃣ Create Pitch with Images
          </Text>

          <TextInput
            value={pitchTitle}
            onChangeText={setPitchTitle}
            placeholder="Pitch title"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 4,
              backgroundColor: "#fff",
              marginBottom: 8,
            }}
          />

          <TextInput
            value={pitchDescription}
            onChangeText={setPitchDescription}
            placeholder="Pitch description"
            multiline
            numberOfLines={2}
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 12,
              borderRadius: 4,
              backgroundColor: "#fff",
              marginBottom: 12,
            }}
          />

          <Button
            title="Create Pitch"
            onPress={createPitchWithImages}
            disabled={!tripId || uploadedImages.length === 0}
          />

          {createPitchMutation.isPending && (
            <View style={{ marginTop: 8 }}>
              <ActivityIndicator />
              <Text style={{ textAlign: "center", marginTop: 4 }}>
                Creating...
              </Text>
            </View>
          )}

          {createdPitchId && (
            <View
              style={{
                marginTop: 12,
                padding: 8,
                backgroundColor: "#d4edda",
                borderRadius: 4,
              }}
            >
              <Text style={{ fontWeight: "bold", color: "#155724" }}>
                ✅ Pitch Created!
              </Text>
              <Text
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#155724",
                }}
              >
                ID: {createdPitchId}
              </Text>
            </View>
          )}
        </View>

        {/* Step 4: View Pitch Details */}
        {createdPitchId && (
          <View
            style={{
              marginBottom: 24,
              padding: 16,
              backgroundColor: "#e3f2fd",
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
              4️⃣ Pitch Details (with Images)
            </Text>

            <Button
              title="Refresh Pitch Details"
              onPress={() => refetchPitch()}
            />

            {extendedPitchDetails && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontWeight: "bold", fontSize: 14 }}>
                  {extendedPitchDetails.title}
                </Text>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                  {extendedPitchDetails.description}
                </Text>

                {extendedPitchDetails.images &&
                extendedPitchDetails.images.length > 0 ? (
                  <View>
                    <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                      Images ({extendedPitchDetails.images.length}):
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {extendedPitchDetails.images.map((img) => (
                        <View key={img.id} style={{ marginRight: 12 }}>
                          <Image
                            source={{ uri: img.medium_url }}
                            style={{
                              width: 120,
                              height: 120,
                              borderRadius: 8,
                              backgroundColor: "#ddd",
                            }}
                          />
                          <Text
                            style={{
                              fontSize: 9,
                              fontFamily: "monospace",
                              marginTop: 4,
                            }}
                          >
                            {img.id.substring(0, 8)}...
                          </Text>
                          <Text style={{ fontSize: 9, color: "#666" }}>
                            {img.medium_url.includes("http")
                              ? "✅ Presigned URL"
                              : "❌ Not a URL"}
                          </Text>
                        </View>
                      ))}
                    </ScrollView>

                    <View style={{ marginTop: 12, gap: 8 }}>
                      <Button
                        title="Add Another Image"
                        onPress={addMoreImages}
                      />
                      <Button
                        title="Remove All Images"
                        onPress={clearAllImages}
                        color="#ff6b6b"
                      />
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: "#999", fontStyle: "italic" }}>
                    No images attached
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Step 5: List All Pitches */}
        {tripId && (
          <View
            style={{
              marginBottom: 24,
              padding: 16,
              backgroundColor: "#fff3cd",
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
              5️⃣ All Pitches for Trip
            </Text>

            <Button title="Refresh Pitch List" onPress={() => refetchList()} />

            {extendedPitchList?.items && extendedPitchList.items.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                {extendedPitchList.items.map((pitch) => (
                  <View
                    key={pitch.id}
                    style={{
                      marginBottom: 16,
                      padding: 12,
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor:
                        pitch.id === createdPitchId ? "#007bff" : "#ddd",
                    }}
                  >
                    <Text style={{ fontWeight: "bold", fontSize: 14 }}>
                      {pitch.title}
                      {pitch.id === createdPitchId && " (Current)"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: "#666",
                      }}
                    >
                      {pitch.id}
                    </Text>

                    {pitch.images && pitch.images.length > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "bold" }}>
                          Images ({pitch.images.length}):
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          {pitch.images.map((img) => (
                            <Image
                              key={img.id}
                              source={{ uri: img.medium_url }}
                              style={{
                                width: 60,
                                height: 60,
                                marginRight: 8,
                                borderRadius: 4,
                                backgroundColor: "#ddd",
                              }}
                            />
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text
                style={{ marginTop: 8, color: "#999", fontStyle: "italic" }}
              >
                No pitches found
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>
    </Screen>
  );
}
