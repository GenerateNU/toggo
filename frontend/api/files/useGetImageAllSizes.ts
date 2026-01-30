import { skipToken, useQueries, UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
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
export function useGetImageAllSizes(imageIds: (string | null | undefined)[]): {
  queries: UseQueryResult<GetImageAllSizesResponse, GetImageError>[];
  data: GetImageAllSizesResponse[];
  isLoading: boolean;
  isSettled: boolean;
  isSuccess: boolean;
  errors: GetImageError[];
} {
  const combine = useCallback(
    (results: UseQueryResult<GetImageAllSizesResponse, GetImageError>[]) => {
      const active = results.filter(
        (r) => r.fetchStatus !== "idle" || r.isSuccess || r.isError,
      );

      return {
        /** Individual query results */
        queries: results,

        /** All successfully loaded images */
        data: results
          .map((q) => q.data)
          .filter((d): d is GetImageAllSizesResponse => d !== undefined),

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
      queryKey: ["image-all-sizes", imageId] as const,
      queryFn: imageId ? () => getImageAllSizes(imageId) : skipToken,
    })),
    combine,
  });
}

/**
 * Example usage :
   const { data: galleryImagesAllSizes, isLoading: galleryLoading } =
     useGetImageAllSizes([galleryImageId]);
   const galleryImageAllSizes = galleryImagesAllSizes[0];
 */
