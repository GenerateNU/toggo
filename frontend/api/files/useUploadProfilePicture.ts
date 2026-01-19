import type { RequestConfig, ResponseErrorConfig } from "../client";
import type {
  UseMutationOptions,
  UseMutationResult,
  QueryClient,
} from "@tanstack/react-query";
import { mutationOptions, useMutation } from "@tanstack/react-query";

import type { UploadError400, UploadError500 } from "../../types/images";
import {
  uploadImage,
  type UploadImageResponse,
} from "../../utilities/images";

// === Mutation Key ===

export const uploadProfilePictureMutationKey = () =>
  [{ url: "/api/v1/images/upload", type: "profile" }] as const;

export type UploadProfilePictureMutationKey = ReturnType<
  typeof uploadProfilePictureMutationKey
>;

// === Mutation Options ===

export function uploadProfilePictureMutationOptions(
  config: Partial<RequestConfig> = {},
) {
  const mutationKey = uploadProfilePictureMutationKey();
  return mutationOptions<
    UploadImageResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    { uri: string },
    typeof mutationKey
  >({
    mutationKey,
    mutationFn: async ({ uri }) => {
      return uploadImage({ uri, sizes: ["small"] }, config);
    },
  });
}

// === Hook ===

/**
 * @description Compresses and uploads a profile picture (small variant only)
 * @summary Upload profile picture
 */
export function useUploadProfilePicture<TContext>(
  options: {
    mutation?: UseMutationOptions<
      UploadImageResponse,
      ResponseErrorConfig<UploadError400 | UploadError500>,
      { uri: string },
      TContext
    > & { client?: QueryClient };
    client?: Partial<RequestConfig>;
  } = {},
) {
  const { mutation = {}, client: config = {} } = options ?? {};
  const { client: queryClient, ...mutationOpts } = mutation;
  const mutationKey =
    mutationOpts.mutationKey ?? uploadProfilePictureMutationKey();

  const baseOptions = uploadProfilePictureMutationOptions(
    config,
  ) as UseMutationOptions<
    UploadImageResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    { uri: string },
    TContext
  >;

  return useMutation<
    UploadImageResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    { uri: string },
    TContext
  >(
    {
      ...baseOptions,
      mutationKey,
      ...mutationOpts,
    },
    queryClient,
  ) as UseMutationResult<
    UploadImageResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    { uri: string },
    TContext
  >;
}