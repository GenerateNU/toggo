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
