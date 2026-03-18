import { useCreateActivity } from "@/api/activities";
import { useDeleteImage, useUploadImage } from "@/api/files/custom";
import { Box, Button, Screen, Text } from "@/design-system";
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
  const { id: tripID } = useLocalSearchParams<{ id: string }>();
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
      <Box flex={1} backgroundColor="surfaceBackground">
        <Box
          padding="lg"
          paddingTop="xl"
          backgroundColor="surfaceCard"
          gap="xs"
        >
          <Text variant="smLabel" color="textQuaternary">
            NEW
          </Text>
          <Text variant="lgHeading" color="textSecondary">
            Create Activity
          </Text>
        </Box>

        <ScrollView>
          <Box padding="sm" gap="md">
            <Box gap="xs">
              <Text variant="smLabel" color="textQuaternary">
                NAME *
              </Text>
              <Box
                backgroundColor="surfaceCard"
                borderRadius="sm"
                borderWidth={1}
                borderColor="borderPrimary"
                padding="sm"
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Activity name"
                  placeholderTextColor={ColorPalette.textQuaternary}
                  style={{ fontSize: 15, color: ColorPalette.textSecondary }}
                />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="smLabel" color="textQuaternary">
                DESCRIPTION
              </Text>
              <Box
                backgroundColor="surfaceCard"
                borderRadius="sm"
                borderWidth={1}
                borderColor="borderPrimary"
                padding="sm"
              >
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional description"
                  placeholderTextColor={ColorPalette.textQuaternary}
                  multiline
                  numberOfLines={3}
                  style={{
                    fontSize: 15,
                    color: ColorPalette.textSecondary,
                    minHeight: 72,
                    textAlignVertical: "top",
                  }}
                />
              </Box>
            </Box>

            <Box gap="xs">
              <Text variant="smLabel" color="textQuaternary">
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
                        backgroundColor: ColorPalette.primaryBackground,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text variant="smLabel" color="white">
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
                      borderColor="borderPrimary"
                      backgroundColor="surfaceCard"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Text variant="mdParagraph" color="textQuaternary">
                        + Add
                      </Text>
                    </Box>
                  </Pressable>
                )}
              </Box>
            </Box>

            {isSubmitting ? (
              <Box
                backgroundColor="surfaceCard"
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
