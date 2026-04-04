import type { ModelsPlacePrediction } from "@/types/types.gen";

type SelectCallback = (prediction: ModelsPlacePrediction) => void;
type CancelCallback = () => void;

let pendingCallback: SelectCallback | null = null;
let cancelCallback: CancelCallback | null = null;

export const locationSelectStore = {
  set: (onSelect: SelectCallback, onCancel?: CancelCallback) => {
    pendingCallback = onSelect;
    cancelCallback = onCancel ?? null;
  },
  resolve: (prediction: ModelsPlacePrediction) => {
    pendingCallback?.(prediction);
    pendingCallback = null;
    cancelCallback = null;
  },
  cancel: () => {
    cancelCallback?.();
    pendingCallback = null;
    cancelCallback = null;
  },
  clear: () => {
    pendingCallback = null;
    cancelCallback = null;
  },
};
