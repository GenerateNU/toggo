import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

import {
  getImageAllSizes,
  getImageURL,
  uploadGalleryImage,
  uploadImage,
  uploadProfilePicture,
} from "@/services/imageService";
import { IMAGE_CONFIG } from "../../constants/images";
import {
  compressGalleryImage,
  compressImage,
  compressProfilePicture,
  uriToBlob,
} from "../../utilities/images";

// =============================================================================
// Test Helpers
// =============================================================================

const mockManipulateAsync = ImageManipulator.manipulateAsync as jest.Mock;
const mockGetSize = Image.getSize as jest.Mock;
const mockFetch = globalThis.fetch as jest.Mock;

/**
 * Creates a mock manipulated image result
 */
function createMockImageResult(
  width = 1000,
  height = 800,
  uri = "file://compressed.jpg",
): ImageManipulator.ImageResult {
  return { uri, width, height, base64: undefined };
}

/**
 * Creates a mock blob with specified size
 */
function createMockBlob(size: number): Blob {
  return { size } as Blob;
}

/**
 * Sets up fetch to return a blob of specified size
 */
function mockFetchForFileSize(size: number) {
  mockFetch.mockResolvedValue({
    blob: () => Promise.resolve(createMockBlob(size)),
    ok: true,
  });
}

/**
 * Sets up Image.getSize to return specified dimensions
 */
function mockImageDimensions(width: number, height: number) {
  mockGetSize.mockImplementation((uri, success) => success(width, height));
}

// =============================================================================
// uriToBlob Tests
// =============================================================================

describe("uriToBlob", () => {
  it("converts URI to blob", async () => {
    const mockBlob = createMockBlob(1000);
    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    });

    const result = await uriToBlob("file://test.jpg");

    expect(mockFetch).toHaveBeenCalledWith("file://test.jpg");
    expect(result).toBe(mockBlob);
  });
});

// =============================================================================
// Compression Tests
// =============================================================================

describe("compressImage", () => {
  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(createMockImageResult());
    mockFetchForFileSize(500000); // 500KB - under all limits
  });

  it("compresses to all sizes by default", async () => {
    const result = await compressImage("file://test.jpg");

    expect(result).toHaveLength(3);
    expect(result.map((v) => v.size)).toEqual(["large", "medium", "small"]);
  });

  it("compresses to specific sizes when requested", async () => {
    const result = await compressImage("file://test.jpg", ["small"]);

    expect(result).toHaveLength(1);
    expect(result[0]?.size).toBe("small");
  });

  it("returns correct variant structure", async () => {
    const result = await compressImage("file://test.jpg", ["large"]);

    expect(result[0]).toMatchObject({
      size: "large",
      uri: expect.any(String),
      width: expect.any(Number),
      height: expect.any(Number),
      fileSize: expect.any(Number),
    });
  });
});

describe("compressImage - large variant", () => {
  beforeEach(() => {
    mockImageDimensions(2000, 1500);
  });

  it("compresses with configured quality", async () => {
    mockManipulateAsync.mockResolvedValue(createMockImageResult(2000, 1500));
    mockFetchForFileSize(4000000); // 4MB - under 6MB limit

    await compressImage("file://test.jpg", ["large"]);

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file://test.jpg",
      [], // No manipulations for large
      { compress: IMAGE_CONFIG.large.quality, format: "jpeg" },
    );
  });

  it("iteratively reduces quality if too large", async () => {
    // First call returns too large, subsequent calls return acceptable size
    mockManipulateAsync.mockResolvedValue(createMockImageResult(2000, 1500));
    mockFetch
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(7000000)), // 7MB - too large
        ok: true,
      })
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(5000000)), // 5MB - acceptable
        ok: true,
      });

    const result = await compressImage("file://test.jpg", ["large"]);

    // Should have been called twice (initial + one quality reduction)
    expect(mockManipulateAsync).toHaveBeenCalledTimes(2);
    expect(result[0]?.fileSize).toBe(5000000);
  });
});

describe("compressImage - medium variant", () => {
  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(createMockImageResult(600, 480));
    mockFetchForFileSize(1000000); // 1MB - under 2MB limit
  });

  it("scales down to configured scale factor", async () => {
    await compressImage("file://test.jpg", ["medium"]);

    const expectedWidth = Math.round(1000 * IMAGE_CONFIG.medium.scale);
    const expectedHeight = Math.round(800 * IMAGE_CONFIG.medium.scale);

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file://test.jpg",
      [{ resize: { width: expectedWidth, height: expectedHeight } }],
      { compress: IMAGE_CONFIG.medium.quality, format: "jpeg" },
    );
  });
});

describe("compressImage - small variant", () => {
  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(
      createMockImageResult(
        IMAGE_CONFIG.small.width,
        IMAGE_CONFIG.small.height,
      ),
    );
    mockFetchForFileSize(100000); // 100KB - under 512KB limit
  });

  it("crops to square and resizes to thumbnail size", async () => {
    await compressImage("file://test.jpg", ["small"]);

    // With 1000x800 image, should crop to center 800x800 square
    const minDim = 800;
    const cropX = Math.round((1000 - minDim) / 2); // 100
    const cropY = 0;

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file://test.jpg",
      [
        {
          crop: {
            originX: cropX,
            originY: cropY,
            width: minDim,
            height: minDim,
          },
        },
        {
          resize: {
            width: IMAGE_CONFIG.small.width,
            height: IMAGE_CONFIG.small.height,
          },
        },
      ],
      { compress: IMAGE_CONFIG.small.quality, format: "jpeg" },
    );
  });

  it("handles portrait orientation", async () => {
    mockImageDimensions(600, 1000); // Portrait

    await compressImage("file://test.jpg", ["small"]);

    // With 600x1000 image, should crop to center 600x600 square
    const minDim = 600;
    const cropX = 0;
    const cropY = Math.round((1000 - minDim) / 2); // 200

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file://test.jpg",
      [
        {
          crop: {
            originX: cropX,
            originY: cropY,
            width: minDim,
            height: minDim,
          },
        },
        {
          resize: {
            width: IMAGE_CONFIG.small.width,
            height: IMAGE_CONFIG.small.height,
          },
        },
      ],
      { compress: IMAGE_CONFIG.small.quality, format: "jpeg" },
    );
  });
});

describe("compressProfilePicture", () => {
  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(
      createMockImageResult(
        IMAGE_CONFIG.small.width,
        IMAGE_CONFIG.small.height,
      ),
    );
    mockFetchForFileSize(100000);
  });

  it("returns only small variant", async () => {
    const result = await compressProfilePicture("file://test.jpg");

    expect(result.size).toBe("small");
    expect(result.width).toBe(IMAGE_CONFIG.small.width);
    expect(result.height).toBe(IMAGE_CONFIG.small.height);
  });
});

describe("compressGalleryImage", () => {
  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(createMockImageResult());
    mockFetchForFileSize(500000);
  });

  it("returns all three size variants", async () => {
    const result = await compressGalleryImage("file://test.jpg");

    expect(result).toHaveLength(3);
    expect(result.map((v) => v.size)).toEqual(["large", "medium", "small"]);
  });
});

// =============================================================================
// Upload Tests
// =============================================================================

describe("uploadImage", () => {
  const mockUploadUrls = {
    imageId: "img-123",
    fileKey: "uploads/123-test-uuid",
    uploadUrls: [
      { size: "large", url: "https://s3.example.com/large" },
      { size: "medium", url: "https://s3.example.com/medium" },
      { size: "small", url: "https://s3.example.com/small" },
    ],
    expiresAt: "2026-01-27T00:00:00Z",
  };

  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(createMockImageResult());
  });

  it("compresses, uploads to S3, and confirms", async () => {
    const mockClient = jest
      .fn()
      // First call: getUploadURLs
      .mockResolvedValueOnce({ data: mockUploadUrls })
      // Second call: confirmUpload
      .mockResolvedValueOnce({
        data: { imageId: "img-123", status: "confirmed", confirmed: 3 },
      });

    // Mock fetch for file size checks and S3 uploads
    mockFetch
      // File size checks (3 variants)
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(500000)),
        ok: true,
      })
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(500000)),
        ok: true,
      })
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(500000)),
        ok: true,
      })
      // URI to blob conversions (3 variants)
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(500000)),
      })
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(500000)),
      })
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(createMockBlob(500000)),
      })
      // S3 uploads (3 variants)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });

    const result = await uploadImage({
      uri: "file://test.jpg",
      sizes: ["large", "medium", "small"],
    });

    expect(result).toEqual({
      imageId: "img-123",
      variants: ["large", "medium", "small"],
    });

    // Verify getUploadURLs was called
    expect(mockClient).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "/api/v1/files/upload",
      }),
    );

    // Verify confirmUpload was called
    expect(mockClient).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "/api/v1/files/confirm",
      }),
    );
  });

  it("defaults to all sizes when not specified", async () => {
    const mockClient = jest
      .fn()
      .mockResolvedValueOnce({ data: mockUploadUrls })
      .mockResolvedValueOnce({
        data: { imageId: "img-123", status: "confirmed", confirmed: 3 },
      });

    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(createMockBlob(500000)),
      ok: true,
    });

    const result = await uploadImage({ uri: "file://test.jpg" });

    expect(result.variants).toEqual(["large", "medium", "small"]);
  });
});

describe("uploadProfilePicture", () => {
  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(
      createMockImageResult(
        IMAGE_CONFIG.small.width,
        IMAGE_CONFIG.small.height,
      ),
    );
  });

  it("uploads only small variant", async () => {
    const mockClient = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          imageId: "img-123",
          fileKey: "uploads/123-test-uuid",
          uploadUrls: [{ size: "small", url: "https://s3.example.com/small" }],
          expiresAt: "2026-01-27T00:00:00Z",
        },
      })
      .mockResolvedValueOnce({
        data: { imageId: "img-123", status: "confirmed", confirmed: 1 },
      });

    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(createMockBlob(100000)),
      ok: true,
    });

    const result = await uploadProfilePicture("file://test.jpg");

    expect(result).toBe("img-123");

    // Verify only small size was requested
    expect(mockClient).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sizes: ["small"] }),
      }),
    );
  });
});

describe("uploadGalleryImage", () => {
  beforeEach(() => {
    mockImageDimensions(1000, 800);
    mockManipulateAsync.mockResolvedValue(createMockImageResult());
  });

  it("uploads all three size variants", async () => {
    const mockClient = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          imageId: "img-123",
          fileKey: "uploads/123-test-uuid",
          uploadUrls: [
            { size: "large", url: "https://s3.example.com/large" },
            { size: "medium", url: "https://s3.example.com/medium" },
            { size: "small", url: "https://s3.example.com/small" },
          ],
          expiresAt: "2026-01-27T00:00:00Z",
        },
      })
      .mockResolvedValueOnce({
        data: { imageId: "img-123", status: "confirmed", confirmed: 3 },
      });

    mockFetch.mockResolvedValue({
      blob: () => Promise.resolve(createMockBlob(500000)),
      ok: true,
    });

    const result = await uploadGalleryImage("file://test.jpg");

    expect(result).toBe("img-123");

    // Verify all sizes were requested
    expect(mockClient).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sizes: ["large", "medium", "small"] }),
      }),
    );
  });
});

// =============================================================================
// Retrieval Tests
// =============================================================================

describe("getImageURL", () => {
  it("fetches presigned URL for specific size", async () => {
    const mockResponse = {
      imageId: "img-123",
      size: "small",
      url: "https://s3.example.com/img-123/small",
      contentType: "image/jpeg",
    };

    const mockClient = jest.fn().mockResolvedValue({ data: mockResponse });

    const result = await getImageURL("img-123", "small");

    expect(result).toEqual(mockResponse);
    expect(mockClient).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "/api/v1/files/img-123/small",
      }),
    );
  });
});

describe("getImageAllSizes", () => {
  it("fetches presigned URLs for all sizes", async () => {
    const mockResponse = {
      imageId: "img-123",
      files: [
        {
          imageId: "img-123",
          size: "large",
          url: "https://s3.example.com/large",
        },
        {
          imageId: "img-123",
          size: "medium",
          url: "https://s3.example.com/medium",
        },
        {
          imageId: "img-123",
          size: "small",
          url: "https://s3.example.com/small",
        },
      ],
    };

    const mockClient = jest.fn().mockResolvedValue({ data: mockResponse });

    const result = await getImageAllSizes("img-123");

    expect(result).toEqual(mockResponse);
    expect(mockClient).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "/api/v1/files/img-123",
      }),
    );
  });
});
