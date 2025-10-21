import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type BaseLayer = 'street' | 'topographic' | 'satellite';

interface MapPreferencesState {
  showStations: boolean;
  showLegend: boolean;
  baseLayer: BaseLayer;
  setShowStations: (value: boolean) => void;
  toggleStations: () => void;
  setShowLegend: (value: boolean) => void;
  toggleLegend: () => void;
  setBaseLayer: (layer: BaseLayer) => void;
}

const STORAGE_KEY = 'gip-map-preferences';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const fallbackStorage: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const resolveStorage = (): StorageLike => {
  if (typeof window === 'undefined') {
    return fallbackStorage;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[map-preferences-store] Local storage unavailable:', error);
    return fallbackStorage;
  }
};

export const useMapPreferencesStore = create<MapPreferencesState>()(
  persist<MapPreferencesState>(
    (set) => ({
      showStations: true,
      showLegend: true,
      baseLayer: 'street',
      setShowStations: (value: boolean) => set({ showStations: value }),
      toggleStations: () =>
        set((state: MapPreferencesState) => ({
          showStations: !state.showStations,
        })),
      setShowLegend: (value: boolean) => set({ showLegend: value }),
      toggleLegend: () =>
        set((state: MapPreferencesState) => ({
          showLegend: !state.showLegend,
        })),
      setBaseLayer: (layer: BaseLayer) => set({ baseLayer: layer }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage<MapPreferencesState>(resolveStorage),
      version: 1,
    },
  ),
);

export const resetMapPreferencesStore = () => {
  useMapPreferencesStore.setState({ showStations: true, showLegend: true, baseLayer: 'street' });
};
