import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { uploadImage } from "../../services/imageService";
import type {
  UploadError400,
  UploadError500,
  UploadImageResponse,
} from "../../types/images";
import type { ResponseErrorConfig } from "../client";

type UploadError = ResponseErrorConfig<UploadError400 | UploadError500>;

/**
 * Hook to compress and upload a profile picture (small variant only).
 *
 * @param options - Optional mutation options (cropping, etc.)
 * @return Mutation object for uploading profile picture
 *
 * @example
 * ```tsx
 * function ProfilePictureUploader() {
 *   const uploadMutation = useUploadProfilePicture({
 *     onSuccess: (data) => {
 *       console.log("Profile picture uploaded:", data.imageId);
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
 *       aspect: [1, 1],
 *       quality: 1,
 *     });
 *
 *     if (!result.canceled && result.assets[0]?.uri) {
 *       uploadMutation.mutate({ uri: result.assets[0].uri });
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       <Button onPress={handlePickImage} disabled={uploadMutation.isPending}>
 *         {uploadMutation.isPending ? "Uploading..." : "Change Profile Picture"}
 *       </Button>
 *       {uploadMutation.isError && <Text>Upload failed</Text>}
 *     </View>
 *   );
 * }
 * ```
 */
export function useUploadProfilePicture(
  options?: UseMutationOptions<
    UploadImageResponse,
    UploadError,
    { uri: string }
  >,
) {
  return useMutation<UploadImageResponse, UploadError, { uri: string }>({
    mutationKey: ["upload-profile-picture"],
    mutationFn: ({ uri }) => uploadImage({ uri, sizes: ["small"] }),
    ...options,
  });
}
