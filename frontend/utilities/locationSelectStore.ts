import type { ModelsPlacePrediction } from "@/types/types.gen";

type Callback = (prediction: ModelsPlacePrediction) => void;

let pendingCallback: Callback | null = null;

export const locationSelectStore = {
  set: (cb: Callback) => {
    pendingCallback = cb;
  },
  resolve: (prediction: ModelsPlacePrediction) => {
    pendingCallback?.(prediction);
    pendingCallback = null;
  },
  clear: () => {
    pendingCallback = null;
  },
};
