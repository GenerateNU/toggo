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
