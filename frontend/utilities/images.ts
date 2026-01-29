import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

import { IMAGE_CONFIG, ImageSize } from "../constants/images";
import type { CompressedVariant, ImageDimensions } from "../types/images";
import { ImageCompressionError } from "../types/images";

// =============================================================================
// Image Dimension & File Utilities
// =============================================================================

/**
 * Gets the dimensions (width and height) of an image from its URI.
 *
 * @param uri - The local or remote URI of the image
 * @returns Promise resolving to image dimensions
 * @throws Error if image dimensions cannot be determined
 *
 * @internal
 */
async function getImageDimensions(uri: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(new Error(`Failed to get image dimensions: ${error}`)),
    );
  });
}

/**
 * Calculates the file size in bytes of an image at the given URI.
 *
 * @param uri - The local or remote URI of the image
 * @returns Promise resolving to file size in bytes
 *
 * @internal
 */
async function getFileSize(uri: string): Promise<number> {
  const response = await globalThis.fetch(uri);
  const blob = await response.blob();
  return blob.size;
}

/**
 * Converts an image URI to a Blob object.
 * @param uri - The local or remote URI of the image
 * @returns Promise resolving to a Blob of the image
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  const response = await globalThis.fetch(uri);
  return response.blob();
}

// =============================================================================
// Compression Functions
// =============================================================================

/**
 * Iteratively compresses an image to meet file size requirements.
 *
 * This helper function applies a multi-stage compression strategy:
 * 1. Initial compression at configured quality
 * 2. If too large: Try progressively lower quality levels (0.85 -> 0.6)
 * 3. If still too large: Scale down dimensions (0.9x -> 0.5x)
 *
 * @param uri - The URI of the image to compress
 * @param manipulations - Initial manipulations to apply (resize, crop, etc.)
 * @param initialQuality - Starting quality level (0-1)
 * @param maxBytes - Maximum allowed file size in bytes
 * @param sizeName - Name of the size variant for error messages
 * @returns Promise resolving to compressed image result and file size
 * @throws {ImageCompressionError} If image cannot be compressed below size limit
 *
 * @internal
 */
async function compressWithIterativeQuality(
  uri: string,
  manipulations: ImageManipulator.Action[],
  initialQuality: number,
  maxBytes: number,
  sizeName: ImageSize,
): Promise<{ result: ImageManipulator.ImageResult; fileSize: number }> {
  // Initial compression attempt
  let result = await ImageManipulator.manipulateAsync(uri, manipulations, {
    compress: initialQuality,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  let fileSize = await getFileSize(result.uri);

  // If too large, try progressively lower quality levels
  if (fileSize > maxBytes) {
    const qualitySteps = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6];

    for (const quality of qualitySteps) {
      result = await ImageManipulator.manipulateAsync(uri, manipulations, {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      fileSize = await getFileSize(result.uri);

      if (fileSize <= maxBytes) break;
    }

    // If still too large, reduce dimensions
    if (fileSize > maxBytes) {
      const scaleSteps = [0.9, 0.8, 0.7, 0.6, 0.5];

      for (const scale of scaleSteps) {
        // Calculate scaled dimensions based on the result dimensions
        const scaledWidth = Math.round(result.width * scale);
        const scaledHeight = Math.round(result.height * scale);

        result = await ImageManipulator.manipulateAsync(
          uri,
          [
            ...manipulations,
            { resize: { width: scaledWidth, height: scaledHeight } },
          ],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
        );
        fileSize = await getFileSize(result.uri);

        if (fileSize <= maxBytes) break;
      }
    }

    // If still too large after all attempts, throw error
    if (fileSize > maxBytes) {
      throw new ImageCompressionError(
        `Image cannot be compressed below ${maxBytes / 1024 / 1024}MB limit for ${sizeName} variant`,
        sizeName,
      );
    }
  }

  return { result, fileSize };
}

/**
 * Compresses an image to the "large" variant size with adaptive quality adjustment.
 *
 * @param uri - The local URI of the source image
 * @returns Promise resolving to compressed image variant
 * @throws {ImageCompressionError} If image cannot be compressed below size limit
 *
 * @internal
 */
async function compressLarge(uri: string): Promise<CompressedVariant> {
  const config = IMAGE_CONFIG.large;

  const { result, fileSize } = await compressWithIterativeQuality(
    uri,
    [], // No initial manipulations for large variant
    config.quality,
    config.maxBytes,
    "large",
  );

  return {
    size: "large",
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

/**
 * Compresses an image to the "medium" variant size.
 *
 * @param uri - The local URI of the source image
 * @param dimensions - Original image dimensions
 * @returns Promise resolving to compressed image variant
 * @throws {ImageCompressionError} If image cannot be compressed below size limit
 *
 * @internal
 */
async function compressMedium(
  uri: string,
  dimensions: ImageDimensions,
): Promise<CompressedVariant> {
  const config = IMAGE_CONFIG.medium;

  const newWidth = Math.round(dimensions.width * config.scale);
  const newHeight = Math.round(dimensions.height * config.scale);

  const { result, fileSize } = await compressWithIterativeQuality(
    uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    config.quality,
    config.maxBytes,
    "medium",
  );

  return {
    size: "medium",
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

/**
 * Compresses an image to the "small" variant size as a square thumbnail.
 *
 * @param uri - The local URI of the source image
 * @param dimensions - Original image dimensions
 * @returns Promise resolving to compressed square thumbnail variant
 * @throws {ImageCompressionError} If image cannot be compressed below size limit
 *
 * @internal
 */
async function compressSmall(
  uri: string,
  dimensions: ImageDimensions,
): Promise<CompressedVariant> {
  const config = IMAGE_CONFIG.small;

  // Calculate center crop coordinates for square aspect ratio
  const minDim = Math.min(dimensions.width, dimensions.height);
  const cropX = Math.round((dimensions.width - minDim) / 2);
  const cropY = Math.round((dimensions.height - minDim) / 2);

  const { result, fileSize } = await compressWithIterativeQuality(
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
    config.quality,
    config.maxBytes,
    "small",
  );

  return {
    size: "small",
    uri: result.uri,
    width: result.width,
    height: result.height,
    fileSize,
  };
}

/**
 * Compresses an image to multiple size variants.
 *
 * @param uri - The local URI of the source image
 * @param sizes - Array of size variants to generate
 * @returns Promise resolving to array of compressed image variants
 */
export async function compressImage(
  uri: string,
  sizes: ImageSize[] = ["large", "medium", "small"],
): Promise<CompressedVariant[]> {
  const dimensions = await getImageDimensions(uri);

  // Map size names to corresponding compression functions
  const compressionFns: Record<ImageSize, () => Promise<CompressedVariant>> = {
    large: () => compressLarge(uri),
    medium: () => compressMedium(uri, dimensions),
    small: () => compressSmall(uri, dimensions),
  };

  // Run compression for all requested sizes in parallel
  const variants = await Promise.all(
    sizes.map((size) => compressionFns[size]()),
  );

  return variants;
}

/**
 * Compresses an image to the "small" variant for profile pictures.
 *
 * @param uri - The local URI of the source image
 * @returns Promise resolving to compressed small image variant
 */
export async function compressProfilePicture(
  uri: string,
): Promise<CompressedVariant> {
  const dimensions = await getImageDimensions(uri);
  return compressSmall(uri, dimensions);
}

/**
 * Compresses an image to all gallery size variants: large, medium, and small.
 *
 * @param uri - The local URI of the source image
 * @returns Promise resolving to array of compressed image variants
 */
export async function compressGalleryImage(
  uri: string,
): Promise<CompressedVariant[]> {
  return compressImage(uri, ["large", "medium", "small"]);
}
