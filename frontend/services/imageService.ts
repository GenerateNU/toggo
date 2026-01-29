import * as Crypto from "expo-crypto";

import type { RequestConfig, ResponseErrorConfig } from "../api/client";
import fetch from "../api/client";
import type { ImageSize } from "../constants/images";
import type {
    GetImageAllSizesResponse,
    GetImageURLResponse,
    UploadError400,
    UploadError500,
    UploadImageRequest,
    UploadImageResponse,
} from "../types/images";
import { compressImage, uriToBlob } from "../utilities/images";

interface UploadURLsResponse {
  imageId: string;
  fileKey: string;
  uploadUrls: { size: string; url: string }[];
  expiresAt: string;
}

interface ConfirmUploadResponse {
  imageId: string;
  status: string;
  confirmed: number;
}

/**
 * Gets presigned upload URLs for the specified image sizes.
 */
async function getUploadURLs(
  fileKey: string,
  sizes: ImageSize[],
  contentType: string,
  config: Partial<RequestConfig> = {},
): Promise<UploadURLsResponse> {
  const res = await fetch<
    UploadURLsResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>
  >({
    method: "POST",
    url: "/api/v0/files/upload",
    data: { fileKey, sizes, contentType },
    ...config,
  });
  return res.data;
}

/**
 * Confirms the completion of an image upload to the server.
 */
async function confirmUpload(
  imageId: string,
  size?: ImageSize,
  config: Partial<RequestConfig> = {},
): Promise<ConfirmUploadResponse> {
  const res = await fetch<
    ConfirmUploadResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>
  >({
    method: "POST",
    url: "/api/v0/files/confirm",
    data: size ? { imageId, size } : { imageId },
    ...config,
  });
  return res.data;
}

/**
 * Uploads a Blob to the specified S3 presigned URL.
 */
async function uploadToS3(url: string, blob: Blob): Promise<void> {
  const response = await globalThis.fetch(url, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": "image/jpeg" },
  });
  console.log("[S3] Uploading to URL:", url);
  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

// =============================================================================
// Public Service Functions
// =============================================================================

/**
 * Compresses and uploads an image with specified size variants.
 *
 * Flow:
 * 1. Compress image to requested size variants
 * 2. Get presigned upload URLs from server
 * 3. Upload all variants to S3 in parallel
 * 4. Confirm upload with server
 *
 * @param request - Upload request with URI and optional sizes
 * @param config - Optional request configuration
 * @returns Promise resolving to image ID and uploaded variants
 */
export async function uploadImage(
  { uri, sizes = ["large", "medium", "small"] }: UploadImageRequest,
  config: Partial<RequestConfig> = {},
): Promise<UploadImageResponse> {
  
  // Compress all variants client-side
  const variants = await compressImage(uri, sizes);

  // Generate a file key for this upload
  const timestamp = Date.now();
  const fileKey = `uploads/${timestamp}-${Crypto.randomUUID()}`;

  // Get presigned URLs from server
  const uploadResponse = await getUploadURLs(fileKey, sizes, "image/jpeg", config);

  // Upload all variants to S3 in parallel
  await Promise.all(
    variants.map(async (variant) => {
      const presignedURL = uploadResponse.uploadUrls.find(
        (u) => u.size === variant.size,
      );
      if (!presignedURL) {
        throw new Error(`No presigned URL for ${variant.size}`);
      }

      const blob = await uriToBlob(variant.uri);
      await uploadToS3(presignedURL.url, blob);
    }),
  );

  // Confirm upload with server
  await confirmUpload(uploadResponse.imageId, undefined, config);

  return { imageId: uploadResponse.imageId, variants: sizes };
}

/**
 * Uploads a profile picture (small variant only).
 *
 * @param uri - The local URI of the profile picture
 * @param config - Optional request configuration
 * @returns Promise resolving to the uploaded image ID
 */
export async function uploadProfilePicture(
  uri: string,
  config: Partial<RequestConfig> = {},
): Promise<string> {
  const { imageId } = await uploadImage({ uri, sizes: ["small"] }, config);
  return imageId;
}

/**
 * Uploads a gallery image (all size variants).
 *
 * @param uri - The local URI of the gallery image
 * @param config - Optional request configuration
 * @returns Promise resolving to the uploaded image ID
 */
export async function uploadGalleryImage(
  uri: string,
  config: Partial<RequestConfig> = {},
): Promise<string> {
  const { imageId } = await uploadImage(
    { uri, sizes: ["large", "medium", "small"] },
    config,
  );
  return imageId;
}

/**
 * Gets a presigned download URL for a specific image size.
 *
 * @param imageId - The ID of the image
 * @param size - The size variant to retrieve
 * @param config - Optional request configuration
 * @returns Promise resolving to image URL response
 */
export async function getImageURL(
  imageId: string,
  size: ImageSize,
  config: Partial<RequestConfig> = {},
): Promise<GetImageURLResponse> {
  const res = await fetch<
    GetImageURLResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>
  >({
    method: "GET",
    url: `/api/v0/files/${imageId}/${size}`,
    ...config,
  });
  return res.data;
}

/**
 * Gets presigned download URLs for all sizes of an image.
 *
 * @param imageId - The ID of the image
 * @param config - Optional request configuration
 * @returns Promise resolving to all image URLs
 */
export async function getImageAllSizes(
  imageId: string,
  config: Partial<RequestConfig> = {},
): Promise<GetImageAllSizesResponse> {
  const res = await fetch<
    GetImageAllSizesResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>
  >({
    method: "GET",
    url: `/api/v0/files/${imageId}`,
    ...config,
  });
  return res.data;
}
