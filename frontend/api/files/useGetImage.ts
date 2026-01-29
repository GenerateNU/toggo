import { skipToken, useQueries, UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ImageSize } from "../../constants/images";
import { getImageURL } from "../../services/imageService";
import type {
  GetImageURLResponse,
  UploadError400,
  UploadError500,
} from "../../types/images";
import type { ResponseErrorConfig } from "../client";

type GetImageError = ResponseErrorConfig<UploadError400 | UploadError500>;

/**
 * Hook to get presigned download URLs for one or more images.
 *
 * @param imageIds - Array of image IDs (null/undefined values are skipped)
 * @param size - The desired image size
 * @return Object with data array, loading state, and individual query results
 */
export function useGetImage(
  imageIds: (string | null | undefined)[],
  size: ImageSize,
): {
  queries: UseQueryResult<GetImageURLResponse, GetImageError>[];
  data: GetImageURLResponse[];
  isLoading: boolean;
  isSettled: boolean;
  isSuccess: boolean;
  errors: GetImageError[];
} {
  const combine = useCallback(
    (results: UseQueryResult<GetImageURLResponse, GetImageError>[]) => {
      const active = results.filter((r) => r.fetchStatus !== "idle");

      return {
        /** Individual query results */
        queries: results,

        /** All successfully loaded images */
        data: results
          .map((q) => q.data)
          .filter((d): d is GetImageURLResponse => d !== undefined),

        /** True if any active query is loading */
        isLoading: active.some((q) => q.isLoading),

        /** True if all active queries have finished (success or error) */
        isSettled:
          active.length > 0 && active.every((q) => q.isSuccess || q.isError),

        /** True if all active queries succeeded */
        isSuccess: active.length > 0 && active.every((q) => q.isSuccess),

        /** All errors from failed queries */
        errors: results
          .map((q) => q.error as GetImageError | null | undefined)
          .filter((e): e is GetImageError => e != null),
      };
    },
    [],
  );

  return useQueries({
    queries: imageIds.map((imageId) => ({
      queryKey: ["image", imageId, size] as const,
      queryFn: imageId ? () => getImageURL(imageId, size) : skipToken,
    })),
    combine,
  });
}

/**
 * Example usage (getting a profile image):
 * const { data: profileImages, isLoading: profileLoading } = useGetImage(
     [profileImageId],
     "small",
   );
   const profileImageData = profileImages[0];
   ...
 */
