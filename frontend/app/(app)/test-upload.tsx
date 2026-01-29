import {
  useGetImage,
  useGetImageAllSizes,
  useUploadImage,
  useUploadProfilePicture,
} from "@/api/files";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Button, Image, ScrollView, Text, View } from "react-native";

const S3_ENDPOINT = "http://0.0.0.0:4566"; // Update to your IP

export default function TestUploadScreen() {
  const [profileImageId, setProfileImageId] = useState<string | null>(null);
  const [galleryImageId, setGalleryImageId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>("");
  const [s3Status, setS3Status] = useState<string>("");
  const [s3Files, setS3Files] = useState<string[]>([]);
  const [s3FilesError, setS3FilesError] = useState<string>("");

  // Upload hooks
  const uploadProfilePictureMutation = useUploadProfilePicture();
  const uploadGalleryImageMutation = useUploadImage();

  // Get image hooks
  const { data: profileImages, isLoading: profileLoading } = useGetImage(
    [profileImageId],
    "small",
  );
  const profileImageData = profileImages[0];

  const { data: galleryImagesAllSizes, isLoading: galleryLoading } =
    useGetImageAllSizes([galleryImageId]);
  const galleryImageAllSizes = galleryImagesAllSizes[0];

  const checkLocalStackHealth = async () => {
    setHealthStatus("Checking...");
    try {
      const response = await fetch(`${S3_ENDPOINT}/_localstack/health`);
      const data = await response.json();
      setHealthStatus(
        `✅ LocalStack healthy\nS3: ${data.services?.s3 || "unknown"}\nVersion: ${data.version || "unknown"}`,
      );
    } catch (error) {
      setHealthStatus(`❌ Failed to connect to LocalStack\n${error}`);
    }
  };

  const checkS3Bucket = async () => {
    setS3Status("Checking...");
    try {
      const response = await fetch(`${S3_ENDPOINT}/toggo-development-media`, {
        method: "HEAD",
      });

      if (response.ok || response.status === 200) {
        setS3Status(`✅ Bucket 'toggo-development-media' exists`);
      } else if (response.status === 404) {
        setS3Status(`❌ Bucket 'toggo-development-media' not found`);
      } else {
        setS3Status(`⚠️ S3 responded with ${response.status}`);
      }
    } catch (error) {
      setS3Status(`❌ Failed to connect to S3\n${error}`);
    }
  };

  const testS3Upload = async () => {
    setS3Status("Testing upload...");
    try {
      const testData = new Blob(["test"], { type: "text/plain" });
      const response = await fetch(
        `${S3_ENDPOINT}/toggo-development-media/test-${Date.now()}.txt`,
        {
          method: "PUT",
          body: testData,
          headers: { "Content-Type": "text/plain" },
        },
      );

      if (response.ok) {
        setS3Status(`✅ S3 upload test passed`);
      } else {
        const text = await response.text();
        setS3Status(
          `❌ S3 upload failed: ${response.status}\n${text.slice(0, 200)}`,
        );
      }
    } catch (error) {
      setS3Status(`❌ S3 upload test failed\n${error}`);
    }
  };

  const fetchS3Files = async () => {
    setS3FilesError("");
    setS3Files([]);
    try {
      const response = await fetch(
        `${S3_ENDPOINT}/toggo-development-media?list-type=2`,
      );

      if (response.ok) {
        const text = await response.text();
        // Parse XML response for file keys
        const keyMatches = text.match(/<Key>([^<]+)<\/Key>/g);
        const files = keyMatches
          ? keyMatches.map((m) => m.replace(/<\/?Key>/g, ""))
          : [];
        setS3Files(files);
      } else {
        setS3FilesError(`Failed to list: ${response.status}`);
      }
    } catch (error) {
      setS3FilesError(`Error: ${error}`);
    }
  };

  const pickImage = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission denied");
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      return result.assets[0].uri;
    }
    return null;
  };

  const handleUploadProfilePicture = async () => {
    const uri = await pickImage();
    if (!uri) return;

    uploadProfilePictureMutation.mutate(
      { uri },
      {
        onSuccess: (data) => {
          console.log("Profile picture upload success:", data);
          setProfileImageId(data.imageId);
        },
        onError: (error) => {
          console.error("Profile picture upload error:", error);
          alert("Upload failed: " + JSON.stringify(error));
        },
      },
    );
  };

  const handleUploadGalleryImage = async () => {
    const uri = await pickImage();
    if (!uri) return;

    uploadGalleryImageMutation.mutate(
      { uri, sizes: ["large", "medium", "small"] },
      {
        onSuccess: (data) => {
          console.log("Gallery image upload success:", data);
          setGalleryImageId(data.imageId);
        },
        onError: (error) => {
          console.error("Gallery image upload error:", error);
          alert("Upload failed: " + JSON.stringify(error));
        },
      },
    );
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
        Connection Tests
      </Text>

      <View style={{ gap: 8, marginBottom: 24 }}>
        <Button
          title="Check LocalStack Health"
          onPress={checkLocalStackHealth}
        />
        {healthStatus ? (
          <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
            {healthStatus}
          </Text>
        ) : null}

        <Button title="Check S3 Bucket" onPress={checkS3Bucket} />
        <Button title="Test S3 Upload" onPress={testS3Upload} />
        {s3Status ? (
          <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
            {s3Status}
          </Text>
        ) : null}
      </View>

      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
        S3 Files
      </Text>

      <View style={{ gap: 8, marginBottom: 24 }}>
        <Button title="List S3 Files" onPress={fetchS3Files} />
        {s3FilesError ? (
          <Text style={{ color: "red", fontSize: 12 }}>{s3FilesError}</Text>
        ) : null}
        {s3Files.length > 0 ? (
          <View
            style={{ backgroundColor: "#f5f5f5", padding: 8, borderRadius: 4 }}
          >
            <Text
              style={{ fontFamily: "monospace", fontSize: 11, marginBottom: 4 }}
            >
              {s3Files.length} files:
            </Text>
            {s3Files.map((file, i) => (
              <Text key={i} style={{ fontFamily: "monospace", fontSize: 10 }}>
                • {file}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
        Profile Picture Upload (useUploadProfilePicture)
      </Text>

      <View style={{ gap: 8, marginBottom: 24 }}>
        <Button
          title="Upload Profile Picture (small only)"
          onPress={handleUploadProfilePicture}
        />

        {uploadProfilePictureMutation.isPending && (
          <Text>Uploading profile picture...</Text>
        )}

        {uploadProfilePictureMutation.isError && (
          <Text style={{ color: "red" }}>
            Error: {uploadProfilePictureMutation.error?.message}
          </Text>
        )}

        {uploadProfilePictureMutation.isSuccess && (
          <View>
            <Text style={{ color: "green" }}>✅ Profile picture uploaded!</Text>
            <Text>Image ID: {uploadProfilePictureMutation.data.imageId}</Text>
          </View>
        )}

        {profileLoading && <Text>Loading profile image...</Text>}

        {profileImageData && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: "bold" }}>
              Retrieved via useGetImage (small):
            </Text>
            <Image
              source={{ uri: profileImageData.url }}
              style={{
                width: 150,
                height: 150,
                marginTop: 8,
                borderRadius: 75,
              }}
            />
          </View>
        )}
      </View>

      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>
        Gallery Image Upload (useUploadImage)
      </Text>

      <View style={{ gap: 8, marginBottom: 24 }}>
        <Button
          title="Upload Gallery Image (all sizes)"
          onPress={handleUploadGalleryImage}
        />

        {uploadGalleryImageMutation.isPending && (
          <Text>Uploading gallery image...</Text>
        )}

        {uploadGalleryImageMutation.isError && (
          <Text style={{ color: "red" }}>
            Error: {uploadGalleryImageMutation.error?.message}
          </Text>
        )}

        {uploadGalleryImageMutation.isSuccess && (
          <View>
            <Text style={{ color: "green" }}>✅ Gallery image uploaded!</Text>
            <Text>Image ID: {uploadGalleryImageMutation.data.imageId}</Text>
          </View>
        )}

        {galleryLoading && <Text>Loading gallery image...</Text>}

        {galleryImageAllSizes?.files && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: "bold" }}>
              Retrieved via useGetImageAllSizes:
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {galleryImageAllSizes.files.map((sizeData) => (
                <View key={sizeData.size} style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 10, marginBottom: 4 }}>
                    {sizeData.size}
                  </Text>
                  <Image
                    source={{ uri: sizeData.url }}
                    style={{
                      width:
                        sizeData.size === "large"
                          ? 100
                          : sizeData.size === "medium"
                            ? 75
                            : 50,
                      height:
                        sizeData.size === "large"
                          ? 100
                          : sizeData.size === "medium"
                            ? 75
                            : 50,
                      borderRadius: 4,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}
