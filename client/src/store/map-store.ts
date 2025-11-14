import { create, type GetState, type SetState, type StateCreator } from 'zustand';

export type MapCenter = [number, number];

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapState {
  center: MapCenter;
  zoom: number;
  bounds: MapBounds | null;
  hasUserAdjusted: boolean;
  setView: (center: MapCenter, zoom?: number) => void;
  setBounds: (bounds: MapBounds | null) => void;
  markUserAdjusted: () => void;
  clearUserAdjusted: () => void;
  resetView: () => void;
}

const DEFAULT_CENTER: MapCenter = [-38.7357, -72.6193];
const DEFAULT_ZOOM = 12;

const createMapState: StateCreator<MapState> = (
  set: SetState<MapState>,
  _get: GetState<MapState>,
) => ({
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  bounds: null,
  hasUserAdjusted: false,
  setView: (center: MapCenter, zoom?: number) =>
    set((state: MapState) => ({
      center,
      zoom: typeof zoom === 'number' ? zoom : state.zoom,
    })),
  setBounds: (bounds: MapBounds | null) => set({ bounds }),
  markUserAdjusted: () => set({ hasUserAdjusted: true }),
  clearUserAdjusted: () => set({ hasUserAdjusted: false }),
  resetView: () =>
    set({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      bounds: null,
      hasUserAdjusted: false,
    }),
});

export const useMapStore = create<MapState>(createMapState);

export const serializeBounds = (bounds: MapBounds | null, precision = 6): string | undefined => {
  if (!bounds) {
    return undefined;
  }

  const factor = 10 ** precision;
  const round = (value: number) => Math.round(value * factor) / factor;

  const { west, south, east, north } = bounds;
  return [round(west), round(south), round(east), round(north)].join(',');
};
