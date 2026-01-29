import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { uploadImage } from "../../services/imageService";
import type {
  UploadError400,
  UploadError500,
  UploadImageRequest,
  UploadImageResponse,
} from "../../types/images";
import type { ResponseErrorConfig } from "../client";

type UploadError = ResponseErrorConfig<UploadError400 | UploadError500>;

/**
 * Hook to compress and upload an image with specified size variants.
 *
 * @param options - Optional mutation options (cropping, etc.)
 * @return Mutation object for uploading image
 *
 * @example
 * ```tsx
 * function ImageUploader() {
 *
 *   const uploadMutation = useUploadImage({
 *     onSuccess: (data) => {
 *       console.log("Picture uploaded:", data.imageId);
 *     },
 *     onError: (error) => {
 *       console.error("Upload failed:", error);
 *     },
 *   });
 *
 *   const handlePickImage = async () => {
 *     // Launch the device's image picker
 *     const result = await ImagePicker.launchImageLibraryAsync({
 *       mediaTypes: ["images"],
 *       allowsEditing: true,  // Allow user to crop before upload
 *       aspect: [1, 1],       // Force square aspect ratio for profile pics
 *       quality: 1,           // Max quality; compression happens in the hook
 *     });
 *
 *     // If user selected an image (didn't cancel), trigger the upload
 *     if (!result.canceled && result.assets[0]?.uri) {
 *       uploadMutation.mutate({ uri: result.assets[0].uri });
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handlePickImage} disabled={uploadMutation.isPending}>
 *         {uploadMutation.isPending ? "Uploading..." : "Change Picture"}
 *       </Button>
 *
 *       {uploadMutation.isError && <Text>Upload failed</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useUploadImage(
  options?: UseMutationOptions<
    UploadImageResponse,
    UploadError,
    UploadImageRequest
  >,
) {
  return useMutation<UploadImageResponse, UploadError, UploadImageRequest>({
    mutationKey: ["upload-image"],
    mutationFn: (data) => uploadImage(data),
    ...options,
  });
}
