import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";

import { IMAGE_CONFIG } from "../../constants/images";
import { ImageCompressionError } from "../../types/images";
import {
  compressGalleryImage,
  compressImage,
  compressProfilePicture,
  uriToBlob,
} from "../../utilities/images";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("react-native", () => ({
  Image: {
    getSize: jest.fn(),
  },
}));

// Mock global fetch for getFileSize and uriToBlob
const originalFetch = globalThis.fetch;
const mockFetch = jest.fn();

// =============================================================================
// Test Utilities
// =============================================================================

const createMockImageResult = (
  uri: string,
  width: number,
  height: number,
): ImageManipulator.ImageResult => ({
  uri,
  width,
  height,
  base64: undefined,
});

const createMockBlob = (size: number): Blob => ({
  size,
  type: "image/jpeg",
  slice: jest.fn(),
  arrayBuffer: jest.fn(),
  text: jest.fn(),
  stream: jest.fn(),
  bytes: jest.fn(),
});

const setupImageGetSize = (width: number, height: number) => {
  (Image.getSize as jest.Mock).mockImplementation((uri, onSuccess) => {
    onSuccess(width, height);
  });
};

const setupImageGetSizeError = (errorMessage: string) => {
  (Image.getSize as jest.Mock).mockImplementation((uri, onSuccess, onError) => {
    onError(errorMessage);
  });
};

const setupFetchWithSize = (size: number) => {
  mockFetch.mockResolvedValue({
    ok: true,
    blob: jest.fn().mockResolvedValue(createMockBlob(size)),
  });
};

// =============================================================================
// Tests
// =============================================================================

describe("image-compression", () => {
  beforeAll(() => {
    globalThis.fetch = mockFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // uriToBlob
  // ---------------------------------------------------------------------------

  describe("uriToBlob", () => {
    it("converts a URI to a Blob", async () => {
      const mockBlob = createMockBlob(1000);
      mockFetch.mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      const result = await uriToBlob("file:///test/image.jpg");

      expect(mockFetch).toHaveBeenCalledWith("file:///test/image.jpg");
      expect(result).toBe(mockBlob);
    });

    it("handles remote URIs", async () => {
      const mockBlob = createMockBlob(2000);
      mockFetch.mockResolvedValue({
        ok: true,
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      const result = await uriToBlob("https://example.com/image.jpg");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/image.jpg");
      expect(result).toBe(mockBlob);
    });

    it("propagates fetch errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(uriToBlob("file:///test/image.jpg")).rejects.toThrow(
        "Network error",
      );
    });

    it("throws error when fetch response is not ok", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(uriToBlob("file:///test/image.jpg")).rejects.toThrow(
        "Failed to fetch image: 404",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // compressImage
  // ---------------------------------------------------------------------------

  describe("compressImage", () => {
    const testUri = "file:///test/source.jpg";

    describe("successful compression", () => {
      beforeEach(() => {
        setupImageGetSize(1920, 1080);
        setupFetchWithSize(500_000); // 500KB - under all limits
      });

      it("compresses to all three sizes by default", async () => {
        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///compressed.jpg", 1920, 1080),
        );

        const results = await compressImage(testUri);

        expect(results).toHaveLength(3);
        expect(results.map((r: { size: any }) => r.size)).toEqual([
          "large",
          "medium",
          "small",
        ]);
      });

      it("compresses to specified sizes only", async () => {
        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///compressed.jpg", 1920, 1080),
        );

        const results = await compressImage(testUri, ["large", "small"]);

        expect(results).toHaveLength(2);
        expect(results.map((r: { size: any }) => r.size)).toEqual([
          "large",
          "small",
        ]);
      });

      it("returns correct variant structure for large", async () => {
        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///large.jpg", 1920, 1080),
        );

        const [largeResult] = await compressImage(testUri, ["large"]);

        expect(largeResult).toEqual({
          size: "large",
          uri: "file:///large.jpg",
          width: 1920,
          height: 1080,
          fileSize: 500_000,
        });
      });

      it("applies resize for medium variant", async () => {
        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///medium.jpg", 960, 540),
        );

        await compressImage(testUri, ["medium"]);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          testUri,
          [
            {
              resize: { width: expect.any(Number), height: expect.any(Number) },
            },
          ],
          expect.objectContaining({
            compress: IMAGE_CONFIG.medium.quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }),
        );
      });

      it("applies crop and resize for small variant", async () => {
        setupImageGetSize(1920, 1080);
        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///small.jpg", 150, 150),
        );

        await compressImage(testUri, ["small"]);

        // Should crop to center square (1080x1080) then resize
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          testUri,
          [
            {
              crop: {
                originX: 420, // (1920 - 1080) / 2
                originY: 0,
                width: 1080,
                height: 1080,
              },
            },
            {
              resize: {
                width: IMAGE_CONFIG.small.width,
                height: IMAGE_CONFIG.small.height,
              },
            },
          ],
          expect.objectContaining({
            compress: IMAGE_CONFIG.small.quality,
            format: ImageManipulator.SaveFormat.JPEG,
          }),
        );
      });

      it("handles portrait orientation for small variant crop", async () => {
        setupImageGetSize(1080, 1920); // Portrait
        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///small.jpg", 150, 150),
        );

        await compressImage(testUri, ["small"]);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          testUri,
          [
            {
              crop: {
                originX: 0,
                originY: 420, // (1920 - 1080) / 2
                width: 1080,
                height: 1080,
              },
            },
            {
              resize: {
                width: IMAGE_CONFIG.small.width,
                height: IMAGE_CONFIG.small.height,
              },
            },
          ],
          expect.any(Object),
        );
      });

      it("handles square images for small variant", async () => {
        setupImageGetSize(1000, 1000);
        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///small.jpg", 150, 150),
        );

        await compressImage(testUri, ["small"]);

        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
          testUri,
          [
            {
              crop: {
                originX: 0,
                originY: 0,
                width: 1000,
                height: 1000,
              },
            },
            {
              resize: {
                width: IMAGE_CONFIG.small.width,
                height: IMAGE_CONFIG.small.height,
              },
            },
          ],
          expect.any(Object),
        );
      });
    });

    describe("iterative quality reduction", () => {
      beforeEach(() => {
        setupImageGetSize(1920, 1080);
      });

      it("reduces quality when initial compression exceeds limit", async () => {
        // First attempt too large, second attempt within limit
        let callCount = 0;
        mockFetch.mockImplementation(() => {
          callCount++;
          const size = callCount === 1 ? 15_000_000 : 500_000;
          return Promise.resolve({
            ok: true,
            blob: jest.fn().mockResolvedValue(createMockBlob(size)),
          });
        });

        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///compressed.jpg", 1920, 1080),
        );

        await compressImage(testUri, ["large"]);

        // Should have been called twice (initial + one quality step)
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(2);
      });

      it("tries all quality steps before scaling", async () => {
        // Always return too large until we've tried all quality steps
        let callCount = 0;
        const qualitySteps = 6; // 0.85, 0.8, 0.75, 0.7, 0.65, 0.6
        mockFetch.mockImplementation(() => {
          callCount++;
          // Still too large after all quality steps, then under limit after scale
          const size = callCount <= qualitySteps + 1 ? 15_000_000 : 500_000;
          return Promise.resolve({
            ok: true,
            blob: jest.fn().mockResolvedValue(createMockBlob(size)),
          });
        });

        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///compressed.jpg", 1920, 1080),
        );

        await compressImage(testUri, ["large"]);

        // 1 initial + 6 quality steps + 1 scale step = 8
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(8);
      });

      it("applies dimension scaling after quality reduction fails", async () => {
        let callCount = 0;
        mockFetch.mockImplementation(() => {
          callCount++;
          // Under limit only after scaling
          const size = callCount <= 7 ? 15_000_000 : 500_000;
          return Promise.resolve({
            ok: true,
            blob: jest.fn().mockResolvedValue(createMockBlob(size)),
          });
        });

        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///compressed.jpg", 1728, 972), // 0.9 scale
        );

        await compressImage(testUri, ["large"]);

        // Last call should include resize action
        const lastCall = (
          ImageManipulator.manipulateAsync as jest.Mock
        ).mock.calls.slice(-1)[0];
        expect(lastCall[1]).toContainEqual(
          expect.objectContaining({
            resize: expect.objectContaining({
              width: expect.any(Number),
              height: expect.any(Number),
            }),
          }),
        );
      });
    });

    describe("error handling", () => {
      it("throws ImageCompressionError when compression fails completely", async () => {
        setupImageGetSize(1920, 1080);
        // Always return too large
        setupFetchWithSize(100_000_000);

        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///compressed.jpg", 1920, 1080),
        );

        await expect(compressImage(testUri, ["large"])).rejects.toThrow(
          ImageCompressionError,
        );
      });

      it("throws error with correct size name in message", async () => {
        setupImageGetSize(1920, 1080);
        setupFetchWithSize(100_000_000);

        (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
          createMockImageResult("file:///compressed.jpg", 1920, 1080),
        );

        await expect(compressImage(testUri, ["medium"])).rejects.toThrow(
          /medium variant/,
        );
      });

      it("throws error when image dimensions cannot be determined", async () => {
        setupImageGetSizeError("Invalid image");

        await expect(compressImage(testUri)).rejects.toThrow(
          "Failed to get image dimensions",
        );
      });

      it("propagates ImageManipulator errors", async () => {
        setupImageGetSize(1920, 1080);
        (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
          new Error("Manipulation failed"),
        );

        await expect(compressImage(testUri, ["large"])).rejects.toThrow(
          "Manipulation failed",
        );
      });
    });

    describe("parallel processing", () => {
      it("compresses all variants in parallel", async () => {
        setupImageGetSize(1920, 1080);
        setupFetchWithSize(500_000);

        const resolvers: Array<() => void> = [];
        (ImageManipulator.manipulateAsync as jest.Mock).mockImplementation(
          () =>
            new Promise((resolve) => {
              resolvers.push(() =>
                resolve(
                  createMockImageResult("file:///compressed.jpg", 500, 500),
                ),
              );
            }),
        );

        const pending = compressImage(testUri, ["large", "medium", "small"]);
        // Allow scheduled tasks to start before asserting they were called
        await new Promise<void>((r) => setImmediate(() => r()));
        expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(3);
        resolvers.forEach((r) => r());
        await pending;
      });
    });
  });

  // ---------------------------------------------------------------------------
  // compressProfilePicture
  // ---------------------------------------------------------------------------

  describe("compressProfilePicture", () => {
    it("returns a small variant", async () => {
      setupImageGetSize(800, 600);
      setupFetchWithSize(50_000);

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///profile.jpg", 150, 150),
      );

      const result = await compressProfilePicture("file:///source.jpg");

      expect(result.size).toBe("small");
    });

    it("applies center crop for non-square images", async () => {
      setupImageGetSize(1000, 500);
      setupFetchWithSize(50_000);

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///profile.jpg", 150, 150),
      );

      await compressProfilePicture("file:///source.jpg");

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        "file:///source.jpg",
        [
          {
            crop: {
              originX: 250, // (1000 - 500) / 2
              originY: 0,
              width: 500,
              height: 500,
            },
          },
          {
            resize: {
              width: IMAGE_CONFIG.small.width,
              height: IMAGE_CONFIG.small.height,
            },
          },
        ],
        expect.any(Object),
      );
    });

    it("returns correct structure", async () => {
      setupImageGetSize(500, 500);
      setupFetchWithSize(30_000);

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///profile.jpg", 150, 150),
      );

      const result = await compressProfilePicture("file:///source.jpg");

      expect(result).toEqual({
        size: "small",
        uri: "file:///profile.jpg",
        width: 150,
        height: 150,
        fileSize: 30_000,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // compressGalleryImage
  // ---------------------------------------------------------------------------

  describe("compressGalleryImage", () => {
    it("returns all three size variants", async () => {
      setupImageGetSize(2000, 1500);
      setupFetchWithSize(500_000);

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///gallery.jpg", 1000, 750),
      );

      const results = await compressGalleryImage("file:///source.jpg");

      expect(results).toHaveLength(3);
      expect(results.map((r: { size: any }) => r.size)).toEqual([
        "large",
        "medium",
        "small",
      ]);
    });

    it("processes large images correctly", async () => {
      setupImageGetSize(4000, 3000);
      setupFetchWithSize(400_000); // 400KB - under the small variant limit (0.5MB)

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///gallery.jpg", 2000, 1500),
      );

      const results = await compressGalleryImage("file:///4k-image.jpg");

      expect(results).toHaveLength(3);
      results.forEach((variant) => {
        expect(variant.uri).toBeDefined();
        expect(variant.width).toBeGreaterThan(0);
        expect(variant.height).toBeGreaterThan(0);
        expect(variant.fileSize).toBeGreaterThan(0);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe("edge cases", () => {
    it("handles very small source images", async () => {
      setupImageGetSize(100, 100);
      setupFetchWithSize(5_000);

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///tiny.jpg", 100, 100),
      );

      const results = await compressImage("file:///tiny.jpg");

      expect(results).toHaveLength(3);
    });

    it("handles images with odd dimensions", async () => {
      setupImageGetSize(1921, 1081); // Odd dimensions
      setupFetchWithSize(500_000);

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///odd.jpg", 1921, 1081),
      );

      const results = await compressImage("file:///odd.jpg", ["small"]);

      // Should round crop coordinates correctly
      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        "file:///odd.jpg",
        [
          {
            crop: {
              originX: 420, // Math.round((1921 - 1081) / 2)
              originY: 0,
              width: 1081,
              height: 1081,
            },
          },
          expect.any(Object),
        ],
        expect.any(Object),
      );

      expect(results).toHaveLength(1);
    });

    it("handles single size request", async () => {
      setupImageGetSize(1920, 1080);
      setupFetchWithSize(500_000);

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(
        createMockImageResult("file:///single.jpg", 1920, 1080),
      );

      const results = await compressImage("file:///source.jpg", ["large"]);

      expect(results).toHaveLength(1);
      expect(results[0]?.size).toBe("large");
    });

    it("handles empty sizes array", async () => {
      setupImageGetSize(1920, 1080);

      const results = await compressImage("file:///source.jpg", []);

      expect(results).toHaveLength(0);
    });
  });
});
