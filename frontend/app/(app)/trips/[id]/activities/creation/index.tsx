import { useCreateActivity } from "@/api/activities";
import { useDeleteImage, useUploadImage } from "@/api/files/custom";
import { Box, Button, Screen, Text } from "@/design-system";
import type { ModelsActivityTimeOfDay } from "@/types/types.gen";
import { ColorPalette } from "@/design-system/tokens/color";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";

export default function CreateActivity() {
  const { id: tripID, date, timeOfDay } = useLocalSearchParams<{
    id: string;
    date?: string;
    timeOfDay?: string;
  }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadImageMutation = useUploadImage();
  const deleteImageMutation = useDeleteImage();
  const createActivityMutation = useCreateActivity();

  const pickImage = async () => {
    if (imageUris.length >= 5) {
      Alert.alert("Limit reached", "You can add up to 5 images.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Media library access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });

    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) {
      setImageUris((prev) => [...prev, uri]);
    }
  };

  const removeImage = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Activity name is required.");
      return;
    }

    setIsSubmitting(true);

    const uploadedImageIds: string[] = [];

    try {
      for (const uri of imageUris) {
        const res = await uploadImageMutation.mutateAsync({
          uri,
          sizes: ["medium"],
        });
        uploadedImageIds.push(res.imageId);
      }

      const activity = await createActivityMutation.mutateAsync({
        tripID,
        data: {
          trip_id: tripID,
          name: name.trim(),
          description: description.trim() || undefined,
          image_ids: uploadedImageIds,
          ...(date ? { dates: [{ start: date, end: date }] } : {}),
          ...(timeOfDay
            ? { time_of_day: timeOfDay as ModelsActivityTimeOfDay }
            : {}),
        },
      });

      router.replace(
        `/trips/${tripID}/activities/${activity.id}?tripID=${tripID}`,
      );
    } catch {
      await Promise.allSettled(
        uploadedImageIds.map((id) => deleteImageMutation.mutateAsync(id)),
      );
      Alert.alert("Error", "Failed to create activity. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <Box flex={1} backgroundColor="gray50">
        <Box padding="lg" paddingTop="xl" backgroundColor="white" gap="xs">
          <Text variant="bodySmMedium" color="gray500">
            NEW
          </Text>
          <Text variant="headingMd" color="gray900">
            Create Activity
          </Text>
        </Box>

        <ScrollView>
          <Box padding="sm" gap="md">
            <Box gap="xs">
              <Text variant="bodySmMedium" color="gray500">
                NAME *
              </Text>
              <Box
                backgroundColor="white"
                borderRadius="sm"
                borderWidth={1}
                borderColor="gray300"
                padding="sm"
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Activity name"
                  placeholderTextColor={ColorPalette.gray500}
                  style={{ fontSize: 15, color: ColorPalette.gray900 }}
                />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="bodySmMedium" color="gray500">
                DESCRIPTION
              </Text>
              <Box
                backgroundColor="white"
                borderRadius="sm"
                borderWidth={1}
                borderColor="gray300"
                padding="sm"
              >
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional description"
                  placeholderTextColor={ColorPalette.gray500}
                  multiline
                  numberOfLines={3}
                  style={{
                    fontSize: 15,
                    color: ColorPalette.gray900,
                    minHeight: 72,
                    textAlignVertical: "top",
                  }}
                />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="bodySmMedium" color="gray500">
                IMAGES ({imageUris.length}/5)
              </Text>
              <Box flexDirection="row" flexWrap="wrap" gap="xs">
                {imageUris.map((uri, i) => (
                  <Box
                    key={i}
                    width={80}
                    height={80}
                    borderRadius="sm"
                    overflow="hidden"
                  >
                    <Image source={{ uri }} style={{ width: 80, height: 80 }} />
                    <Pressable
                      onPress={() => removeImage(i)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: ColorPalette.gray900,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text variant="bodySmMedium" color="gray900">
                        ×
                      </Text>
                    </Pressable>
                  </Box>
                ))}

                {imageUris.length < 5 && (
                  <Pressable onPress={pickImage}>
                    <Box
                      width={80}
                      height={80}
                      borderRadius="sm"
                      borderWidth={1}
                      borderColor="gray300"
                      backgroundColor="white"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text variant="bodyDefault" color="gray500">
                        + Add
                      </Text>
                    </Box>
                  </Pressable>
                )}
              </Box>
            </Box>

            {isSubmitting ? (
              <Box
                backgroundColor="white"
                borderRadius="sm"
                padding="sm"
                alignItems="center"
              >
                <ActivityIndicator />
              </Box>
            ) : (
              <Button
                layout="textOnly"
                label="Create Activity"
                variant="Primary"
                onPress={handleCreate}
                disabled={isSubmitting}
              />
            )}
          </Box>
        </ScrollView>
      </Box>
    </Screen>
  );
}
