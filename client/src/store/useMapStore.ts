import { create } from 'zustand';

export type MapState = {
  center: [number, number];
  zoom: number;
};

export type MapActions = {
  setView: (center: [number, number], zoom?: number) => void;
};

export type MapStore = MapState & MapActions;

export const useMapStore = create<MapStore>((set) => ({
  center: [40.7128, -74.006],
  zoom: 11,
  setView: (center, zoom) =>
    set((state) => ({
      center,
      zoom: zoom ?? state.zoom,
    })),
}));
