import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
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
 * Hook to get a presigned download URL for a specific image size.
 *
 * @param imageId - The ID of the image to retrieve
 * @param size - The desired image size
 * @param options - Optional query options
 * @return Query object for fetching the image URL
 */
export function useGetImage(
  imageId: string,
  size: ImageSize,
  options?: UseQueryOptions<GetImageURLResponse, GetImageError>,
) {
  return useQuery<GetImageURLResponse, GetImageError>({
    queryKey: ["image", imageId, size],
    queryFn: () => getImageURL(imageId, size),
    ...options,
  });
}
