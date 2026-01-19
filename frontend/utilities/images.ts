import * as Crypto from "expo-crypto";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

import fetch from "../api/client";
import type { RequestConfig, ResponseErrorConfig } from "../api/client";
import { IMAGE_CONFIG, ImageSize } from "../constants/images";
import type {
  CompressedVariant,
  ImageDimensions,
  BulkUploadURLRequest,
  BulkUploadURLResponse,
  BulkConfirmUploadRequest,
  ConfirmUploadResponse,
  UploadError400,
  UploadError500,
} from "../types/images";
import { ImageCompressionError } from "../types/images";

// =============================================================================
// Image Dimension & File Utilities
// =============================================================================

async function getImageDimensions(uri: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(new Error(`Failed to get image dimensions: ${error}`)),
    );
  });
}

async function getFileSize(uri: string): Promise<number> {
  const response = await globalThis.fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await globalThis.fetch(uri);
  return response.blob();
}

// =============================================================================
// Compression Functions
// =============================================================================

async function compressLarge(
  uri: string,
  dimensions: ImageDimensions,
): Promise<CompressedVariant> {
  const config = IMAGE_CONFIG.large;

  let result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: config.quality,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  let fileSize = await getFileSize(result.uri);

  if (fileSize > config.maxBytes) {
    const qualitySteps = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6];

    for (const quality of qualitySteps) {
      result = await ImageManipulator.manipulateAsync(uri, [], {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      fileSize = await getFileSize(result.uri);

      if (fileSize <= config.maxBytes) break;
    }

    if (fileSize > config.maxBytes) {
      const scaleSteps = [0.9, 0.8, 0.7, 0.6, 0.5];

      for (const scale of scaleSteps) {
        result = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: Math.round(dimensions.width * scale) } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
        );
        fileSize = await getFileSize(result.uri);

        if (fileSize <= config.maxBytes) break;
      }
    }

    if (fileSize > config.maxBytes) {
      throw new ImageCompressionError(
        `Image cannot be compressed below ${config.maxBytes / 1024 / 1024}MB limit`,
        "large",
      );
    }
  }

  return {
    size: "large",
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

async function compressMedium(
  uri: string,
  dimensions: ImageDimensions,
): Promise<CompressedVariant> {
  const config = IMAGE_CONFIG.medium;

  const newWidth = Math.round(dimensions.width * config.scale);
  const newHeight = Math.round(dimensions.height * config.scale);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    { compress: config.quality, format: ImageManipulator.SaveFormat.JPEG },
  );

  const fileSize = await getFileSize(result.uri);

  return {
    size: "medium",
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

async function compressSmall(
  uri: string,
  dimensions: ImageDimensions,
): Promise<CompressedVariant> {
  const config = IMAGE_CONFIG.small;

  const minDim = Math.min(dimensions.width, dimensions.height);
  const cropX = Math.round((dimensions.width - minDim) / 2);
  const cropY = Math.round((dimensions.height - minDim) / 2);

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: cropX,
          originY: cropY,
          width: minDim,
          height: minDim,
        },
      },
      { resize: { width: config.width, height: config.height } },
    ],
    { compress: config.quality, format: ImageManipulator.SaveFormat.JPEG },
  );

  const fileSize = await getFileSize(result.uri);

  return {
    size: "small",
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

export async function compressImage(
  uri: string,
  sizes: ImageSize[] = ["large", "medium", "small"],
): Promise<CompressedVariant[]> {
  const dimensions = await getImageDimensions(uri);

  const compressionFns: Record<ImageSize, () => Promise<CompressedVariant>> = {
    large: () => compressLarge(uri, dimensions),
    medium: () => compressMedium(uri, dimensions),
    small: () => compressSmall(uri, dimensions),
  };

  const variants = await Promise.all(
    sizes.map((size) => compressionFns[size]()),
  );

  return variants;
}

export async function compressProfilePicture(
  uri: string,
): Promise<CompressedVariant> {
  const dimensions = await getImageDimensions(uri);
  return compressSmall(uri, dimensions);
}

export async function compressGalleryImage(
  uri: string,
): Promise<CompressedVariant[]> {
  return compressImage(uri, ["large", "medium", "small"]);
}

// =============================================================================
// Upload API Functions
// =============================================================================

async function getUploadURLs(
  data: BulkUploadURLRequest,
  config: Partial<RequestConfig<BulkUploadURLRequest>> & {
    client?: typeof fetch;
  } = {},
) {
  const { client: request = fetch, ...requestConfig } = config;

  const res = await request<
    BulkUploadURLResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    BulkUploadURLRequest
  >({
    method: "POST",
    url: `/api/v1/images/upload-urls`,
    data,
    ...requestConfig,
  });
  return res.data;
}

async function confirmUpload(
  data: BulkConfirmUploadRequest,
  config: Partial<RequestConfig<BulkConfirmUploadRequest>> & {
    client?: typeof fetch;
  } = {},
) {
  const { client: request = fetch, ...requestConfig } = config;

  const res = await request<
    ConfirmUploadResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    BulkConfirmUploadRequest
  >({
    method: "POST",
    url: `/api/v1/images/confirm-upload`,
    data,
    ...requestConfig,
  });
  return res.data;
}

async function uploadToS3(url: string, blob: Blob): Promise<void> {
  const response = await globalThis.fetch(url, {
    method: "PUT",
    body: blob,
    headers: { "Content-Type": "image/jpeg" },
  });

  if (!response.ok) {
    throw new Error(`S3 upload failed: ${response.status}`);
  }
}

// =============================================================================
// Main Upload Functions
// =============================================================================

export interface UploadImageRequest {
  uri: string;
  sizes?: ImageSize[];
}

export interface UploadImageResponse {
  imageId: string;
  variants: ImageSize[];
}

export async function uploadImage(
  { uri, sizes = ["large", "medium", "small"] }: UploadImageRequest,
  config: Partial<RequestConfig> & { client?: typeof fetch } = {},
): Promise<UploadImageResponse> {
  const imageId = Crypto.randomUUID();

  // 1. Compress all variants client-side
  const variants = await compressImage(uri, sizes);

  // 2. Get presigned URLs from server
  const { images } = await getUploadURLs(
    {
      images: [
        {
          id: imageId,
          variants: sizes.map((size) => ({
            size,
            content_type: "image/jpeg",
          })),
        },
      ],
    },
    config as Partial<RequestConfig<BulkUploadURLRequest>> & {
      client?: typeof fetch;
    },
  );

  const urlData = images[0];
  if (!urlData) {
    throw new Error("No upload URLs received");
  }

  // 3. Upload all variants to S3 in parallel
  await Promise.all(
    variants.map(async (variant) => {
      const presigned = urlData.presigned_urls.find(
        (p) => p.size === variant.size,
      );
      if (!presigned) {
        throw new Error(`No presigned URL for ${variant.size}`);
      }

      const blob = await uriToBlob(variant.uri);
      await uploadToS3(presigned.upload_url, blob);
    }),
  );

  // 4. Confirm upload with server
  await confirmUpload(
    {
      images: [{ image_id: imageId, variants: sizes }],
    },
    config as Partial<RequestConfig<BulkConfirmUploadRequest>> & {
      client?: typeof fetch;
    },
  );

  return { imageId, variants: sizes };
}

export async function uploadProfilePicture(
  uri: string,
  config: Partial<RequestConfig> & { client?: typeof fetch } = {},
): Promise<string> {
  const { imageId } = await uploadImage({ uri, sizes: ["small"] }, config);
  return imageId;
}

export async function uploadGalleryImage(
  uri: string,
  config: Partial<RequestConfig> & { client?: typeof fetch } = {},
): Promise<string> {
  const { imageId } = await uploadImage(
    { uri, sizes: ["large", "medium", "small"] },
    config,
  );
  return imageId;
}