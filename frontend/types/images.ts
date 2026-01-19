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

// API Request/Response types
export interface ImageVariantRequest {
  size: ImageSize;
  content_type: string;
}

export interface ImageUploadRequest {
  id: string;
  variants: ImageVariantRequest[];
}

export interface BulkUploadURLRequest {
  images: ImageUploadRequest[];
}

export interface PresignedURLResponse {
  size: string;
  upload_url: string;
  file_key: string;
  content_type: string;
}

export interface ImageUploadURLResponse {
  id: string;
  presigned_urls: PresignedURLResponse[];
}

export interface BulkUploadURLResponse {
  images: ImageUploadURLResponse[];
}

export interface ConfirmUploadRequest {
  image_id: string;
  variants: ImageSize[];
}

export interface BulkConfirmUploadRequest {
  images: ConfirmUploadRequest[];
}

export interface ConfirmUploadResponse {
  message: string;
}

export interface UploadError400 {
  error: string;
}

export interface UploadError500 {
  error: string;
}