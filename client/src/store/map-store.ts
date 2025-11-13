import { create } from 'zustand';

export type MapCenter = [number, number];

interface MapState {
  center: MapCenter;
  zoom: number;
  setView: (center: MapCenter, zoom?: number) => void;
  resetView: () => void;
}

const DEFAULT_CENTER: MapCenter = [-38.7357, -72.6193];
const DEFAULT_ZOOM = 12;

export const useMapStore = create<MapState>((set) => ({
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  setView: (center: MapCenter, zoom?: number) =>
    set((state: MapState) => ({
      center,
      zoom: typeof zoom === 'number' ? zoom : state.zoom,
    })),
  resetView: () => set({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM }),
}));
