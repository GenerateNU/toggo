import type { ImageSize } from "../constants/images";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface CompressedVariant {
  size: ImageSize;
  uri: string;
  width: number;
  height: number;
  fileSize: number;
}

export interface CompressionResult {
  id: string;
  variants: CompressedVariant[];
}

export class ImageCompressionError extends Error {
  constructor(
    message: string,
    public size?: ImageSize,
  ) {
    super(message);
    this.name = "ImageCompressionError";
  }
}

// API Error types
export interface UploadError400 {
  error: string;
}

export interface UploadError500 {
  error: string;
}

export interface UploadImageRequest {
  uri: string;
  sizes?: ImageSize[];
}

export interface UploadImageResponse {
  imageId: string;
  variants: ImageSize[];
}

export interface GetImageURLRequest {
  imageId: string;
  size: ImageSize;
}

export interface GetImageURLResponse {
  imageId: string;
  size: ImageSize;
  url: string;
  contentType?: string;
}

export interface GetImageAllSizesResponse {
  imageId: string;
  files: GetImageURLResponse[];
}
