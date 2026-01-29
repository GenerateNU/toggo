import { skipToken, useQueries } from "@tanstack/react-query";
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
) {
  const queries = useQueries({
    queries: imageIds.map((imageId) => ({
      queryKey: ["image", imageId, size] as const,
      queryFn: imageId ? () => getImageURL(imageId, size) : skipToken,
    })),
  });

  return {
    /** Individual query results */
    queries,
    /** All successfully loaded images */
    data: queries // You'll mainly be using this for successfully loaded images!
      .map((q) => q.data)
      .filter((d): d is GetImageURLResponse => d !== undefined),
    /** True if any query is loading */
    isLoading: queries.some((q) => q.isLoading),
    /** True if all queries have finished (success or error) */
    isSettled: queries.every((q) => q.isSuccess || q.isError),
    /** True if all queries succeeded */
    isSuccess: queries.every((q) => q.isSuccess),
    /** All errors from failed queries */
    errors: queries
      .map((q) => q.error as GetImageError | null)
      .filter((e): e is GetImageError => e !== null),
  };
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
