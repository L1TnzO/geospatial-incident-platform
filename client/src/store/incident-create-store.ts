import { create } from 'zustand';

export interface IncidentDraftCoordinates {
  lat: number;
  lng: number;
}

interface IncidentCreateState {
  isOpen: boolean;
  isSelectingLocation: boolean;
  coordinates: IncidentDraftCoordinates | null;
  open: () => void;
  close: () => void;
  beginLocationSelection: () => void;
  completeLocationSelection: (coordinates: IncidentDraftCoordinates) => void;
  cancelLocationSelection: () => void;
  setCoordinates: (coordinates: IncidentDraftCoordinates | null) => void;
}

export const useIncidentCreateStore = create<IncidentCreateState>((set) => ({
  isOpen: false,
  isSelectingLocation: false,
  coordinates: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false, isSelectingLocation: false, coordinates: null }),
  beginLocationSelection: () => set({ isSelectingLocation: true }),
  completeLocationSelection: (coordinates) => set({ isSelectingLocation: false, coordinates }),
  cancelLocationSelection: () => set({ isSelectingLocation: false }),
  setCoordinates: (coordinates) => set({ coordinates }),
}));
