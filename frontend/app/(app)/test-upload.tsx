import { useGetImage, useUploadProfilePicture } from "@/api/files";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Button, Image, Text, View, ScrollView } from "react-native";

const S3_ENDPOINT = "http://0.0.0.0:4566"; // Update to your IP

export default function TestUploadScreen() {
  const [imageId, setImageId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>("");
  const [s3Status, setS3Status] = useState<string>("");
  const [s3Files, setS3Files] = useState<string[]>([]);
  const [s3FilesError, setS3FilesError] = useState<string>("");
  const uploadMutation = useUploadProfilePicture();

  const { data: imageData } = useGetImage(imageId ?? "", "small", {
    enabled: !!imageId,
  });

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

  const pickAndUploadImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission denied");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      uploadMutation.mutate(
        { uri: result.assets[0].uri },
        {
          onSuccess: (data) => {
            console.log("Upload success:", data);
            setImageId(data.imageId);
          },
          onError: (error) => {
            console.error("Upload error:", error);
            alert("Upload failed: " + JSON.stringify(error));
          },
        },
      );
    }
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
        Database Images
      </Text>

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
        Image Upload Test
      </Text>

      <Button title="Pick and Upload Image" onPress={pickAndUploadImage} />

      {uploadMutation.isPending && <Text>Uploading...</Text>}

      {uploadMutation.isSuccess && (
        <View style={{ marginTop: 16 }}>
          <Text>Upload successful!</Text>
          <Text>Image ID: {uploadMutation.data.imageId}</Text>
        </View>
      )}

      {imageData && (
        <View style={{ marginTop: 16 }}>
          <Text>Retrieved Image URL:</Text>
          <Image
            source={{ uri: imageData.url }}
            style={{ width: 200, height: 200, marginTop: 8 }}
          />
        </View>
      )}

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}
