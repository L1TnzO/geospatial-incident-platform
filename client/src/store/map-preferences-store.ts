import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type BaseLayer = 'street' | 'topographic' | 'satellite';

interface MapPreferencesState {
  showStations: boolean;
  showStationsStrategic: boolean;
  showLegend: boolean;
  showLegendStrategic: boolean;
  baseLayer: BaseLayer;
  showIncidents: boolean;
  showIncidentsStrategic: boolean;
  showHotspots: boolean;
  showHotspotsStrategic: boolean;
  showCoverage: boolean;
  showCoverageStrategic: boolean;
  showPriorityZones: boolean;
  showPriorityZonesStrategic: boolean;
  setShowStations: (value: boolean) => void;
  toggleStations: () => void;
  setShowStationsStrategic: (value: boolean) => void;
  toggleStationsStrategic: () => void;
  setShowLegend: (value: boolean) => void;
  toggleLegend: () => void;
  setShowLegendStrategic: (value: boolean) => void;
  toggleLegendStrategic: () => void;
  setBaseLayer: (layer: BaseLayer) => void;
  setShowIncidents: (value: boolean) => void;
  toggleIncidents: () => void;
  setShowIncidentsStrategic: (value: boolean) => void;
  toggleIncidentsStrategic: () => void;
  setShowHotspots: (value: boolean) => void;
  toggleHotspots: () => void;
  setShowHotspotsStrategic: (value: boolean) => void;
  toggleHotspotsStrategic: () => void;
  setShowCoverage: (value: boolean) => void;
  toggleCoverage: () => void;
  setShowCoverageStrategic: (value: boolean) => void;
  toggleCoverageStrategic: () => void;
  setShowPriorityZones: (value: boolean) => void;
  togglePriorityZones: () => void;
  setShowPriorityZonesStrategic: (value: boolean) => void;
  togglePriorityZonesStrategic: () => void;
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
      showStationsStrategic: true,
      showLegend: true,
      showLegendStrategic: true,
      baseLayer: 'street',
      showIncidents: true,
      showIncidentsStrategic: true,
      showHotspots: false,
      showHotspotsStrategic: false,
      showCoverage: false,
      showCoverageStrategic: false,
      showPriorityZones: false,
      showPriorityZonesStrategic: false,
      setShowStations: (value: boolean) => set({ showStations: value }),
      toggleStations: () =>
        set((state: MapPreferencesState) => ({
          showStations: !state.showStations,
        })),
      setShowStationsStrategic: (value: boolean) => set({ showStationsStrategic: value }),
      toggleStationsStrategic: () =>
        set((state: MapPreferencesState) => ({
          showStationsStrategic: !state.showStationsStrategic,
        })),
      setShowLegend: (value: boolean) => set({ showLegend: value }),
      toggleLegend: () =>
        set((state: MapPreferencesState) => ({
          showLegend: !state.showLegend,
        })),
      setShowLegendStrategic: (value: boolean) => set({ showLegendStrategic: value }),
      toggleLegendStrategic: () =>
        set((state: MapPreferencesState) => ({
          showLegendStrategic: !state.showLegendStrategic,
        })),
      setBaseLayer: (layer: BaseLayer) => set({ baseLayer: layer }),
      setShowIncidents: (value: boolean) => set({ showIncidents: value }),
      toggleIncidents: () =>
        set((state: MapPreferencesState) => ({
          showIncidents: !state.showIncidents,
        })),
      setShowIncidentsStrategic: (value: boolean) => set({ showIncidentsStrategic: value }),
      toggleIncidentsStrategic: () =>
        set((state: MapPreferencesState) => ({
          showIncidentsStrategic: !state.showIncidentsStrategic,
        })),
      setShowHotspots: (value: boolean) => set({ showHotspots: value }),
      toggleHotspots: () =>
        set((state: MapPreferencesState) => ({
          showHotspots: !state.showHotspots,
        })),
      setShowHotspotsStrategic: (value: boolean) => set({ showHotspotsStrategic: value }),
      toggleHotspotsStrategic: () =>
        set((state: MapPreferencesState) => ({
          showHotspotsStrategic: !state.showHotspotsStrategic,
        })),
      setShowCoverage: (value: boolean) => set({ showCoverage: value }),
      toggleCoverage: () =>
        set((state: MapPreferencesState) => ({
          showCoverage: !state.showCoverage,
        })),
      setShowCoverageStrategic: (value: boolean) => set({ showCoverageStrategic: value }),
      toggleCoverageStrategic: () =>
        set((state: MapPreferencesState) => ({
          showCoverageStrategic: !state.showCoverageStrategic,
        })),
      setShowPriorityZones: (value: boolean) => set({ showPriorityZones: value }),
      togglePriorityZones: () =>
        set((state: MapPreferencesState) => ({
          showPriorityZones: !state.showPriorityZones,
        })),
      setShowPriorityZonesStrategic: (value: boolean) => set({ showPriorityZonesStrategic: value }),
      togglePriorityZonesStrategic: () =>
        set((state: MapPreferencesState) => ({
          showPriorityZonesStrategic: !state.showPriorityZonesStrategic,
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage<MapPreferencesState>(resolveStorage),
      version: 2,
      migrate: (persistedState: unknown, version: number): MapPreferencesState => {
        // Migration from version 1 to 2: Add strategic-specific preferences
        if (version === 1) {
          const state = persistedState as Partial<MapPreferencesState>;
          return {
            showStations: state.showStations ?? true,
            showStationsStrategic: state.showStations ?? true,
            showLegend: state.showLegend ?? true,
            showLegendStrategic: state.showLegend ?? true,
            baseLayer: state.baseLayer ?? 'street',
            showIncidents: true,
            showIncidentsStrategic: state.showIncidents ?? true,
            showHotspots: state.showHotspots ?? false,
            showHotspotsStrategic: state.showHotspots ?? false,
            showCoverage: state.showCoverage ?? false,
            showCoverageStrategic: state.showCoverage ?? false,
            showPriorityZones: state.showPriorityZones ?? false,
            showPriorityZonesStrategic: state.showPriorityZones ?? false,
            setShowStations: state.setShowStations ?? (() => {}),
            toggleStations: state.toggleStations ?? (() => {}),
            setShowStationsStrategic: state.setShowStationsStrategic ?? (() => {}),
            toggleStationsStrategic: state.toggleStationsStrategic ?? (() => {}),
            setShowLegend: state.setShowLegend ?? (() => {}),
            toggleLegend: state.toggleLegend ?? (() => {}),
            setShowLegendStrategic: state.setShowLegendStrategic ?? (() => {}),
            toggleLegendStrategic: state.toggleLegendStrategic ?? (() => {}),
            setBaseLayer: state.setBaseLayer ?? (() => {}),
            setShowIncidents: state.setShowIncidents ?? (() => {}),
            toggleIncidents: state.toggleIncidents ?? (() => {}),
            setShowIncidentsStrategic: state.setShowIncidentsStrategic ?? (() => {}),
            toggleIncidentsStrategic: state.toggleIncidentsStrategic ?? (() => {}),
            setShowHotspots: state.setShowHotspots ?? (() => {}),
            toggleHotspots: state.toggleHotspots ?? (() => {}),
            setShowHotspotsStrategic: state.setShowHotspotsStrategic ?? (() => {}),
            toggleHotspotsStrategic: state.toggleHotspotsStrategic ?? (() => {}),
            setShowCoverage: state.setShowCoverage ?? (() => {}),
            toggleCoverage: state.toggleCoverage ?? (() => {}),
            setShowCoverageStrategic: state.setShowCoverageStrategic ?? (() => {}),
            toggleCoverageStrategic: state.toggleCoverageStrategic ?? (() => {}),
            setShowPriorityZones: state.setShowPriorityZones ?? (() => {}),
            togglePriorityZones: state.togglePriorityZones ?? (() => {}),
            setShowPriorityZonesStrategic: state.setShowPriorityZonesStrategic ?? (() => {}),
            togglePriorityZonesStrategic: state.togglePriorityZonesStrategic ?? (() => {}),
          };
        }
        return persistedState as MapPreferencesState;
      },
    },
  ),
);

export const resetMapPreferencesStore = () => {
  useMapPreferencesStore.setState({
    showStations: true,
    showStationsStrategic: true,
    showLegend: true,
    showLegendStrategic: true,
    baseLayer: 'street',
    showIncidents: true,
    showIncidentsStrategic: true,
    showHotspots: false,
    showHotspotsStrategic: false,
    showCoverage: false,
    showCoverageStrategic: false,
    showPriorityZones: false,
    showPriorityZonesStrategic: false,
  });
};
