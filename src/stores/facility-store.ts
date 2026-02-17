import { create } from "zustand";

interface FacilityState {
  selectedFacilityId: string | null;
  setSelectedFacilityId: (id: string) => void;
}

export const useFacilityStore = create<FacilityState>((set) => ({
  selectedFacilityId: null,
  setSelectedFacilityId: (id) => set({ selectedFacilityId: id }),
}));
