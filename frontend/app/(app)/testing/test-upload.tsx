import {
  useConfirmUpload,
  useCreateUploadURLs,
  useGetFile,
  useGetFileAllSizes,
} from "@/api/files";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import { Button, Image, ScrollView, Text, View } from "react-native";

const S3_ENDPOINT = "http://0.0.0.0:4566"; // Update to your IP

const DEFAULT_CONTENT_TYPE = "image/jpeg";

async function uploadBlobToPresignedUrls(
  uri: string,
  uploadUrls: { size?: string; url?: string }[],
  contentType: string,
): Promise<void> {
  const response = await fetch(uri);
  const blob = await response.blob();

  for (const u of uploadUrls) {
    if (!u.url) continue;
    const putRes = await fetch(u.url, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": contentType },
    });
    if (!putRes.ok) {
      throw new Error(`PUT failed for size ${u.size}: ${putRes.status}`);
    }
  }
}

export default function TestUploadScreen() {
  const [profileImageId, setProfileImageId] = useState<string | null>(null);
  const [galleryImageId, setGalleryImageId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>("");
  const [s3Status, setS3Status] = useState<string>("");
  const [s3Files, setS3Files] = useState<string[]>([]);
  const [s3FilesError, setS3FilesError] = useState<string>("");

  const createUploadURLsMutation = useCreateUploadURLs();
  const confirmUploadMutation = useConfirmUpload();

  const { data: profileFile, isLoading: profileLoading } = useGetFile(
    profileImageId ?? "",
    "small",
    { query: { enabled: !!profileImageId } },
  );

  const { data: galleryAllSizes, isLoading: galleryLoading } =
    useGetFileAllSizes(galleryImageId ?? "", {
      query: { enabled: !!galleryImageId },
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

  const pickImage = useCallback(async (): Promise<string | null> => {
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
  }, []);

  const handleUploadProfilePicture = useCallback(async () => {
    const uri = await pickImage();
    if (!uri) return;

    const fileKey = `profile-${Date.now()}`;
    createUploadURLsMutation.mutate(
      {
        data: {
          contentType: DEFAULT_CONTENT_TYPE,
          fileKey,
          sizes: ["small"],
        },
      },
      {
        onSuccess: async (res) => {
          try {
            if (!res.imageId || !res.uploadUrls?.length) {
              alert("No upload URLs returned");
              return;
            }
            await uploadBlobToPresignedUrls(
              uri,
              res.uploadUrls,
              DEFAULT_CONTENT_TYPE,
            );
            confirmUploadMutation.mutate(
              { data: { imageId: res.imageId } },
              {
                onSuccess: () => setProfileImageId(res.imageId ?? null),
                onError: (err) =>
                  alert("Confirm failed: " + (err?.message ?? String(err))),
              },
            );
          } catch (e) {
            alert("Upload to S3 failed: " + (e instanceof Error ? e.message : e));
          }
        },
        onError: (err) =>
          alert("Create URLs failed: " + (err?.message ?? String(err))),
      },
    );
  }, [pickImage, createUploadURLsMutation, confirmUploadMutation]);

  const handleUploadGalleryImage = useCallback(async () => {
    const uri = await pickImage();
    if (!uri) return;

    const fileKey = `gallery-${Date.now()}`;
    createUploadURLsMutation.mutate(
      {
        data: {
          contentType: DEFAULT_CONTENT_TYPE,
          fileKey,
          sizes: ["large", "medium", "small"],
        },
      },
      {
        onSuccess: async (res) => {
          try {
            if (!res.imageId || !res.uploadUrls?.length) {
              alert("No upload URLs returned");
              return;
            }
            await uploadBlobToPresignedUrls(
              uri,
              res.uploadUrls,
              DEFAULT_CONTENT_TYPE,
            );
            confirmUploadMutation.mutate(
              { data: { imageId: res.imageId } },
              {
                onSuccess: () => setGalleryImageId(res.imageId ?? null),
                onError: (err) =>
                  alert("Confirm failed: " + (err?.message ?? String(err))),
              },
            );
          } catch (e) {
            alert("Upload to S3 failed: " + (e instanceof Error ? e.message : e));
          }
        },
        onError: (err) =>
          alert("Create URLs failed: " + (err?.message ?? String(err))),
      },
    );
  }, [pickImage, createUploadURLsMutation, confirmUploadMutation]);

  const isUploading =
    createUploadURLsMutation.isPending || confirmUploadMutation.isPending;
  const uploadError =
    createUploadURLsMutation.error ?? confirmUploadMutation.error;

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
        Profile Picture (useCreateUploadURLs + useConfirmUpload)
      </Text>

      <View style={{ gap: 8, marginBottom: 24 }}>
        <Button
          title="Upload Profile Picture (small only)"
          onPress={handleUploadProfilePicture}
          disabled={isUploading}
        />

        {isUploading && <Text>Uploading...</Text>}

        {uploadError && (
          <Text style={{ color: "red" }}>
            Error: {uploadError?.message ?? String(uploadError)}
          </Text>
        )}

        {profileLoading && <Text>Loading profile image...</Text>}

        {profileFile?.url && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: "bold" }}>
              Retrieved via useGetFile (small):
            </Text>
            <Image
              source={{ uri: profileFile.url }}
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
        Gallery Image (useCreateUploadURLs + useConfirmUpload)
      </Text>

      <View style={{ gap: 8, marginBottom: 24 }}>
        <Button
          title="Upload Gallery Image (all sizes)"
          onPress={handleUploadGalleryImage}
          disabled={isUploading}
        />

        {galleryLoading && <Text>Loading gallery image...</Text>}

        {galleryAllSizes?.files && galleryAllSizes.files.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: "bold" }}>
              Retrieved via useGetFileAllSizes:
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              {galleryAllSizes.files.map((sizeData) => (
                <View key={sizeData.size ?? ""} style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 10, marginBottom: 4 }}>
                    {sizeData.size}
                  </Text>
                  {sizeData.url ? (
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
                  ) : null}
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
