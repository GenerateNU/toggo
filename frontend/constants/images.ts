// Image compression configuration
// Note: MaxLargeImageSize must match server-side validation in constants/files.go

export const IMAGE_CONFIG = {
  large: {
    quality: 0.9,
    maxBytes: 6 * 1024 * 1024, // 6MB - must match server
  },
  medium: { // medium keeps aspect ratio just scaled down
    quality: 0.6,
    scale: 0.6,
    maxBytes: 2 * 1024 * 1024, // 2MB - generous limit for scaled images
  },
  small: {
    quality: 0.75,
    width: 256,
    height: 256,
    maxBytes: 512 * 1024, // 512KB - plenty for small thumbnails
  },
} as const;

export type ImageSize = keyof typeof IMAGE_CONFIG;