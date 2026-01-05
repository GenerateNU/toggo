import * as Linking from "expo-linking";

/**
 * Generates a deep link URL with a token or any additional parameters.
 *
 * @param {string} token The token to be passed in the deep link.
 * @param {string} screen The screen you want to navigate to (optional).
 * @returns {string} The full deep link URL.
 */
export const createDeepLink = (token: string, path: string) => {
  const url = Linking.createURL(path, {
    queryParams: { token },
  });

  return url;
};

/**
 * Parses a URL to extract query parameters (e.g., token).
 *
 * @param {string} url The deep link URL to parse.
 * @returns {object} An object containing query parameters (like token).
 */
export const parseDeepLink = (url: string) => {
  const { queryParams } = Linking.parse(url);
  return queryParams;
};
