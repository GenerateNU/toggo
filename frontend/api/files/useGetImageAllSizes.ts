import { useQueries, skipToken } from "@tanstack/react-query";
import { getImageAllSizes } from "../../services/imageService";
import type {
  GetImageAllSizesResponse,
  UploadError400,
  UploadError500,
} from "../../types/images";
import type { ResponseErrorConfig } from "../client";

type GetImageError = ResponseErrorConfig<UploadError400 | UploadError500>;

/**
 * Hook to get presigned download URLs for all sizes of one or more images.
 *
 * @param imageIds - Array of image IDs (null/undefined values are skipped)
 * @return Object with data array, loading state, and individual query results
 */
export function useGetImageAllSizes(imageIds: (string | null | undefined)[]) {
  const queries = useQueries({
    queries: imageIds.map((imageId) => ({
      queryKey: ["image-all-sizes", imageId] as const,
      queryFn: imageId ? () => getImageAllSizes(imageId) : skipToken,
    })),
  });

  return {
    /** Individual query results */
    queries,
    /** All successfully loaded images */
    data: queries // You'll mainly be using this for successfully loaded images!
      .map((q) => q.data)
      .filter((d): d is GetImageAllSizesResponse => d !== undefined),
    /** True if any query is loading */
    isLoading: queries.some((q) => q.isLoading),
    /** True if all queries have finished (success or error) */
    isSettled: queries.every((q) => q.isSuccess || q.isError),
    /** True if all queries succeeded */
    isSuccess: queries.every((q) => q.isSuccess),
    /** All errors from failed queries */
    errors: queries
      .map((q) => q.error as GetImageError | null | undefined)
      .filter((e): e is GetImageError => e !== null),
  };
}

/**
 * Example usage :
   const { data: galleryImagesAllSizes, isLoading: galleryLoading } =
     useGetImageAllSizes([galleryImageId]);
   const galleryImageAllSizes = galleryImagesAllSizes[0];
 */
