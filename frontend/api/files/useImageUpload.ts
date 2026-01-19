import type {
    QueryClient,
    UseMutationOptions,
    UseMutationResult,
} from "@tanstack/react-query";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import type { RequestConfig, ResponseErrorConfig } from "../client";

import type { UploadError400, UploadError500 } from "../../types/images";
import {
    uploadImage,
    type UploadImageRequest,
    type UploadImageResponse,
} from "../../utilities/images";

// === Mutation Key ===

export const uploadImageMutationKey = () =>
  [{ url: "/api/v1/images/upload" }] as const;

export type UploadImageMutationKey = ReturnType<typeof uploadImageMutationKey>;

// === Mutation Options ===

export function uploadImageMutationOptions(
  config: Partial<RequestConfig> = {},
) {
  const mutationKey = uploadImageMutationKey();
  return mutationOptions<
    UploadImageResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    { data: UploadImageRequest },
    typeof mutationKey
  >({
    mutationKey,
    mutationFn: async ({ data }) => {
      return uploadImage(data, config);
    },
  });
}

// === Hook ===

/**
 * @description Compresses and uploads an image with specified size variants
 * @summary Upload an image
 */
export function useUploadImage<TContext>(
  options: {
    mutation?: UseMutationOptions<
      UploadImageResponse,
      ResponseErrorConfig<UploadError400 | UploadError500>,
      { data: UploadImageRequest },
      TContext
    > & { client?: QueryClient };
    client?: Partial<RequestConfig>;
  } = {},
) {
  const { mutation = {}, client: config = {} } = options ?? {};
  const { client: queryClient, ...mutationOpts } = mutation;
  const mutationKey = mutationOpts.mutationKey ?? uploadImageMutationKey();

  const baseOptions = uploadImageMutationOptions(config) as UseMutationOptions<
    UploadImageResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    { data: UploadImageRequest },
    TContext
  >;

  return useMutation<
    UploadImageResponse,
    ResponseErrorConfig<UploadError400 | UploadError500>,
    { data: UploadImageRequest },
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
    { data: UploadImageRequest },
    TContext
  >;
}
