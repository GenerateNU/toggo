import type { UseMutationOptions } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import fetch from "../../client";
import type { ResponseErrorConfig } from "../../client";

async function deleteImage(imageId: string): Promise<void> {
  await fetch<void, ResponseErrorConfig<unknown>, unknown>({
    method: "DELETE",
    url: `/api/v1/files/${imageId}`,
  });
}

export function useDeleteImage(
  options?: UseMutationOptions<void, ResponseErrorConfig<unknown>, string>,
) {
  return useMutation<void, ResponseErrorConfig<unknown>, string>({
    mutationKey: ["delete-image"],
    mutationFn: deleteImage,
    ...options,
  });
}
