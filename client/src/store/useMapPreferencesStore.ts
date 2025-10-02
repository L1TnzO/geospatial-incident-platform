import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface MapPreferencesState {
  showStations: boolean;
  setShowStations: (value: boolean) => void;
  toggleStations: () => void;
}

const fallbackStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

export const useMapPreferencesStore = create<MapPreferencesState>()(
  persist(
    (set) => ({
      showStations: true,
      setShowStations: (value) => set({ showStations: value }),
      toggleStations: () => set((state) => ({ showStations: !state.showStations })),
    }),
    {
      name: 'gip-map-preferences',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? fallbackStorage : window.localStorage
      ),
    }
  )
);

export const resetMapPreferencesStore = () => {
  useMapPreferencesStore.setState({ showStations: true });
};
