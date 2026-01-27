import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { getImageAllSizes } from "../../services/imageService";
import type {
    GetImageAllSizesResponse,
    UploadError400,
    UploadError500,
} from "../../types/images";
import type { ResponseErrorConfig } from "../client";

type GetImageError = ResponseErrorConfig<UploadError400 | UploadError500>;

/**
 * Hook to get presigned download URLs for all sizes of an image.
 *
 * @param imageId - The ID of the image to retrieve
 * @param options - Optional query options
 * @return Query object for fetching all image URLs
 */
export function useGetImageAllSizes(
  imageId: string,
  options?: UseQueryOptions<GetImageAllSizesResponse, GetImageError>,
) {
  return useQuery<GetImageAllSizesResponse, GetImageError>({
    queryKey: ["image-all-sizes", imageId],
    queryFn: () => getImageAllSizes(imageId),
    ...options,
  });
}
