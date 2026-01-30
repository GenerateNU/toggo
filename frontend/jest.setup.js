// Jest setup file for React Native testing
/* eslint-env jest */

// Mock expo-crypto
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

// Mock expo-image-manipulator
jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: "jpeg",
    PNG: "png",
  },
}));

// Mock react-native Image
jest.mock("react-native", () => ({
  Image: {
    getSize: jest.fn((uri, success) => {
      // Default mock: 1000x800 image
      success(1000, 800);
    }),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
