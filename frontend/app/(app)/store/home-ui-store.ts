import { create } from "zustand";

interface HomeUIState {
  createTripSheetRequested: boolean;
  requestCreateTripSheet: () => void;
  clearCreateTripSheetRequest: () => void;
}

export const useHomeUIStore = create<HomeUIState>((set) => ({
  createTripSheetRequested: false,
  requestCreateTripSheet: () => set({ createTripSheetRequested: true }),
  clearCreateTripSheetRequest: () => set({ createTripSheetRequested: false }),
}));
