import * as Crypto from "expo-crypto";

import fetch from "../../api/client";
import { compressImage, uriToBlob } from "../../utilities/images";
import {
  uploadImage,
  uploadProfilePicture,
  uploadGalleryImage,
  getImageURL,
  getImageAllSizes,
} from "@/services/imageService";

// =============================================================================
// Mocks
// =============================================================================

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(),
}));

jest.mock("../../api/client", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../utilities/images", () => ({
  compressImage: jest.fn(),
  uriToBlob: jest.fn(),
}));

const mockGlobalFetch = jest.fn();
globalThis.fetch = mockGlobalFetch;

// =============================================================================
// Test Utilities
// =============================================================================

const createMockVariant = (size: "large" | "medium" | "small") => ({
  size,
  uri: `file:///compressed-${size}.jpg`,
  width: size === "large" ? 1920 : size === "medium" ? 960 : 150,
  height: size === "large" ? 1080 : size === "medium" ? 540 : 150,
  fileSize: size === "large" ? 500000 : size === "medium" ? 200000 : 50000,
});

const createMockUploadURLsResponse = (sizes: string[]) => ({
  imageId: "img-123",
  fileKey: "uploads/123-uuid",
  uploadUrls: sizes.map((size) => ({
    size,
    url: `https://s3.amazonaws.com/bucket/${size}?presigned=true`,
  })),
  expiresAt: "2024-01-01T00:00:00Z",
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

// =============================================================================
// Tests
// =============================================================================

describe("image-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(1704067200000);
    (Crypto.randomUUID as jest.Mock).mockReturnValue("test-uuid-1234");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // uploadImage
  // ---------------------------------------------------------------------------

  describe("uploadImage", () => {
    const testUri = "file:///source.jpg";

    describe("successful upload flow", () => {
      beforeEach(() => {
        (compressImage as jest.Mock).mockResolvedValue([
          createMockVariant("large"),
          createMockVariant("medium"),
          createMockVariant("small"),
        ]);

        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            data: createMockUploadURLsResponse(["large", "medium", "small"]),
          })
          .mockResolvedValueOnce({
            data: { imageId: "img-123", status: "confirmed", confirmed: 3 },
          });

        (uriToBlob as jest.Mock).mockResolvedValue(createMockBlob(100000));
        mockGlobalFetch.mockResolvedValue({ ok: true });
      });

      it("completes full upload flow successfully", async () => {
        const result = await uploadImage({ uri: testUri });

        expect(result).toEqual({
          imageId: "img-123",
          variants: ["large", "medium", "small"],
        });
      });

      it("compresses image with requested sizes", async () => {
        await uploadImage({ uri: testUri, sizes: ["large", "small"] });

        expect(compressImage).toHaveBeenCalledWith(testUri, ["large", "small"]);
      });

      it("requests presigned URLs with correct parameters", async () => {
        await uploadImage({ uri: testUri });

        expect(fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            method: "POST",
            url: "/api/v0/files/upload",
            data: {
              fileKey: "uploads/1704067200000-test-uuid-1234",
              sizes: ["large", "medium", "small"],
              contentType: "image/jpeg",
            },
          })
        );
      });

      it("uploads all variants to S3 in parallel", async () => {
        await uploadImage({ uri: testUri });

        expect(mockGlobalFetch).toHaveBeenCalledTimes(3);
        expect(mockGlobalFetch).toHaveBeenCalledWith(
          "https://s3.amazonaws.com/bucket/large?presigned=true",
          expect.objectContaining({
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
          })
        );
      });

      it("confirms upload after S3 uploads complete", async () => {
        await uploadImage({ uri: testUri });

        expect(fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            method: "POST",
            url: "/api/v0/files/confirm",
            data: { imageId: "img-123" },
          })
        );
      });

      it("uses default sizes when not specified", async () => {
        await uploadImage({ uri: testUri });

        expect(compressImage).toHaveBeenCalledWith(testUri, [
          "large",
          "medium",
          "small",
        ]);
      });

      it("passes config to API calls", async () => {
        const config = { headers: { Authorization: "Bearer token" } };

        await uploadImage({ uri: testUri }, config);

        expect(fetch).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: { Authorization: "Bearer token" },
          })
        );
      });
    });

    describe("error handling", () => {
      it("throws when compression fails", async () => {
        (compressImage as jest.Mock).mockRejectedValue(
          new Error("Compression failed")
        );

        await expect(uploadImage({ uri: testUri })).rejects.toThrow(
          "Compression failed"
        );
      });

      it("throws when getUploadURLs fails", async () => {
        (compressImage as jest.Mock).mockResolvedValue([
          createMockVariant("large"),
        ]);
        (fetch as jest.Mock).mockRejectedValue(new Error("API error"));

        await expect(uploadImage({ uri: testUri })).rejects.toThrow("API error");
      });

      it("throws when presigned URL is missing for a variant", async () => {
        (compressImage as jest.Mock).mockResolvedValue([
          createMockVariant("large"),
          createMockVariant("medium"),
        ]);
        (fetch as jest.Mock).mockResolvedValueOnce({
          data: createMockUploadURLsResponse(["large"]), // Missing medium
        });

        await expect(uploadImage({ uri: testUri })).rejects.toThrow(
          "No presigned URL for medium"
        );
      });

      it("throws when S3 upload fails", async () => {
        (compressImage as jest.Mock).mockResolvedValue([
          createMockVariant("large"),
        ]);
        (fetch as jest.Mock).mockResolvedValueOnce({
          data: createMockUploadURLsResponse(["large"]),
        });
        (uriToBlob as jest.Mock).mockResolvedValue(createMockBlob(100000));
        mockGlobalFetch.mockResolvedValue({ ok: false, status: 403 });

        await expect(uploadImage({ uri: testUri })).rejects.toThrow(
          "S3 upload failed: 403"
        );
      });

      it("throws when confirm upload fails", async () => {
        (compressImage as jest.Mock).mockResolvedValue([
          createMockVariant("small"),
        ]);
        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            data: createMockUploadURLsResponse(["small"]),
          })
          .mockRejectedValueOnce(new Error("Confirm failed"));
        (uriToBlob as jest.Mock).mockResolvedValue(createMockBlob(50000));
        mockGlobalFetch.mockResolvedValue({ ok: true });

        await expect(uploadImage({ uri: testUri })).rejects.toThrow(
          "Confirm failed"
        );
      });

      it("throws when uriToBlob fails", async () => {
        (compressImage as jest.Mock).mockResolvedValue([
          createMockVariant("large"),
        ]);
        (fetch as jest.Mock).mockResolvedValueOnce({
          data: createMockUploadURLsResponse(["large"]),
        });
        (uriToBlob as jest.Mock).mockRejectedValue(
          new Error("Failed to read file")
        );

        await expect(uploadImage({ uri: testUri })).rejects.toThrow(
          "Failed to read file"
        );
      });
    });

    describe("single size upload", () => {
      it("uploads single variant correctly", async () => {
        (compressImage as jest.Mock).mockResolvedValue([
          createMockVariant("small"),
        ]);
        (fetch as jest.Mock)
          .mockResolvedValueOnce({
            data: createMockUploadURLsResponse(["small"]),
          })
          .mockResolvedValueOnce({
            data: { imageId: "img-123", status: "confirmed", confirmed: 1 },
          });
        (uriToBlob as jest.Mock).mockResolvedValue(createMockBlob(50000));
        mockGlobalFetch.mockResolvedValue({ ok: true });

        const result = await uploadImage({ uri: testUri, sizes: ["small"] });

        expect(result.variants).toEqual(["small"]);
        expect(mockGlobalFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // uploadProfilePicture
  // ---------------------------------------------------------------------------

  describe("uploadProfilePicture", () => {
    beforeEach(() => {
      (compressImage as jest.Mock).mockResolvedValue([
        createMockVariant("small"),
      ]);
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          data: createMockUploadURLsResponse(["small"]),
        })
        .mockResolvedValueOnce({
          data: { imageId: "profile-123", status: "confirmed", confirmed: 1 },
        });
      (uriToBlob as jest.Mock).mockResolvedValue(createMockBlob(50000));
      mockGlobalFetch.mockResolvedValue({ ok: true });
    });

    it("uploads only small variant", async () => {
      await uploadProfilePicture("file:///profile.jpg");

      expect(compressImage).toHaveBeenCalledWith("file:///profile.jpg", [
        "small",
      ]);
    });

    it("returns image ID string", async () => {
      const result = await uploadProfilePicture("file:///profile.jpg");

      expect(result).toBe("img-123");
    });

    it("passes config to uploadImage", async () => {
      const config = { headers: { Authorization: "Bearer token" } };

      await uploadProfilePicture("file:///profile.jpg", config);

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ headers: { Authorization: "Bearer token" } })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // uploadGalleryImage
  // ---------------------------------------------------------------------------

  describe("uploadGalleryImage", () => {
    beforeEach(() => {
      (compressImage as jest.Mock).mockResolvedValue([
        createMockVariant("large"),
        createMockVariant("medium"),
        createMockVariant("small"),
      ]);
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          data: createMockUploadURLsResponse(["large", "medium", "small"]),
        })
        .mockResolvedValueOnce({
          data: { imageId: "gallery-123", status: "confirmed", confirmed: 3 },
        });
      (uriToBlob as jest.Mock).mockResolvedValue(createMockBlob(100000));
      mockGlobalFetch.mockResolvedValue({ ok: true });
    });

    it("uploads all three variants", async () => {
      await uploadGalleryImage("file:///gallery.jpg");

      expect(compressImage).toHaveBeenCalledWith("file:///gallery.jpg", [
        "large",
        "medium",
        "small",
      ]);
    });

    it("returns image ID string", async () => {
      const result = await uploadGalleryImage("file:///gallery.jpg");

      expect(result).toBe("img-123");
    });
  });

  // ---------------------------------------------------------------------------
  // getImageURL
  // ---------------------------------------------------------------------------

  describe("getImageURL", () => {
    it("fetches URL for specified size", async () => {
      const mockResponse = {
        url: "https://s3.amazonaws.com/bucket/img-123/large",
        expiresAt: "2024-01-01T01:00:00Z",
      };
      (fetch as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await getImageURL("img-123", "large");

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/api/v0/files/img-123/large",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("handles different size variants", async () => {
      (fetch as jest.Mock).mockResolvedValue({ data: { url: "test" } });

      await getImageURL("img-123", "small");

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/api/v0/files/img-123/small",
        })
      );
    });

    it("passes config to fetch", async () => {
      (fetch as jest.Mock).mockResolvedValue({ data: {} });
      const config = { headers: { "X-Custom": "header" } };

      await getImageURL("img-123", "medium", config);

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { "X-Custom": "header" },
        })
      );
    });

    it("propagates API errors", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Not found"));

      await expect(getImageURL("invalid-id", "large")).rejects.toThrow(
        "Not found"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getImageAllSizes
  // ---------------------------------------------------------------------------

  describe("getImageAllSizes", () => {
    it("fetches URLs for all sizes", async () => {
      const mockResponse = {
        imageId: "img-123",
        urls: {
          large: "https://s3.amazonaws.com/bucket/img-123/large",
          medium: "https://s3.amazonaws.com/bucket/img-123/medium",
          small: "https://s3.amazonaws.com/bucket/img-123/small",
        },
      };
      (fetch as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await getImageAllSizes("img-123");

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "GET",
          url: "/api/v0/files/img-123",
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("passes config to fetch", async () => {
      (fetch as jest.Mock).mockResolvedValue({ data: {} });
      const config = { headers: { "X-Custom": "header" } };

      await getImageAllSizes("img-123", config);

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({ headers: { "X-Custom": "header" } })
      );
    });

    it("propagates API errors", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Server error"));

      await expect(getImageAllSizes("img-123")).rejects.toThrow("Server error");
    });
  });

  // ---------------------------------------------------------------------------
  // File key generation
  // ---------------------------------------------------------------------------

  describe("file key generation", () => {
    beforeEach(() => {
      (compressImage as jest.Mock).mockResolvedValue([
        createMockVariant("small"),
      ]);
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          data: createMockUploadURLsResponse(["small"]),
        })
        .mockResolvedValueOnce({ data: { imageId: "img-123" } });
      (uriToBlob as jest.Mock).mockResolvedValue(createMockBlob(50000));
      mockGlobalFetch.mockResolvedValue({ ok: true });
    });

    it("generates unique file key with timestamp and UUID", async () => {
      await uploadImage({ uri: "file:///test.jpg", sizes: ["small"] });

      expect(fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fileKey: "uploads/1704067200000-test-uuid-1234",
          }),
        })
      );
    });

    it("uses different UUIDs for different uploads", async () => {
      (Crypto.randomUUID as jest.Mock)
        .mockReturnValueOnce("uuid-first")
        .mockReturnValueOnce("uuid-second");

      await uploadImage({ uri: "file:///first.jpg", sizes: ["small"] });

      // Reset mocks for second upload
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          data: createMockUploadURLsResponse(["small"]),
        })
        .mockResolvedValueOnce({ data: { imageId: "img-456" } });

      await uploadImage({ uri: "file:///second.jpg", sizes: ["small"] });

      const calls = (fetch as jest.Mock).mock.calls;
      expect(calls[0][0].data.fileKey).toContain("uuid-first");
      expect(calls[2][0].data.fileKey).toContain("uuid-second");
    });
  });
});