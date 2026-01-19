// Image compression configuration
// Note: MaxLargeImageSize must match server-side validation in constants/files.go

export const IMAGE_CONFIG = {
  large: {
    quality: 0.9,
    maxBytes: 6 * 1024 * 1024, // 6MB - must match server
  },
  medium: {
    quality: 0.6,
    scale: 0.6,
  },
  small: {
    quality: 0.75,
    width: 256,
    height: 256,
  },
} as const;

export type ImageSize = keyof typeof IMAGE_CONFIG;