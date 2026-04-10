import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { uploadImage } from "../../../services/imageService";
import type {
  UploadError400,
  UploadError500,
  UploadImageResponse,
} from "../../../types/images";
import type { ResponseErrorConfig } from "../../client";

type UploadError = ResponseErrorConfig<UploadError400 | UploadError500>;

/**
 * Hook to upload a trip cover image (medium size variant).
 *
 * @param options - Optional mutation options
 * @return Mutation object for uploading trip cover image
 *
 * @example
 * ```tsx
 * function TripCoverImageUploader() {
 *   const uploadMutation = useUploadTripCoverImage({
 *     onSuccess: (data) => {
 *       console.log("Cover image uploaded:", data.imageId);
 *       // Update trip with the imageId
 *     },
 *     onError: (error) => {
 *       console.error("Upload failed:", error);
 *     },
 *   });
 *
 *   const handlePickImage = async () => {
 *     const result = await ImagePicker.launchImageLibraryAsync({
 *       mediaTypes: ["images"],
 *       allowsEditing: true,
 *       aspect: [16, 9],  // Landscape ratio for cover images
 *       quality: 1,
 *     });
 *
 *     if (!result.canceled && result.assets[0]?.uri) {
 *       uploadMutation.mutate({ uri: result.assets[0].uri });
 *     }
 *   };
 *
 *   return (
 *     <Button onPress={handlePickImage} disabled={uploadMutation.isPending}>
 *       {uploadMutation.isPending ? "Uploading..." : "Add Cover Image"}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useUploadTripCoverImage(
  options?: Omit<
    UseMutationOptions<UploadImageResponse, UploadError, { uri: string }>,
    "mutationKey" | "mutationFn"
  >,
) {
  return useMutation<UploadImageResponse, UploadError, { uri: string }>({
    mutationKey: ["upload-trip-cover-image"],
    mutationFn: ({ uri }) => uploadImage({ uri, sizes: ["medium"] }),
    ...options,
  });
}
