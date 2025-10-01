import { create } from 'zustand'

export type MapState = {
  center: [number, number]
  zoom: number
}

export const useMapStore = create<MapState>(() => ({
  center: [40.7128, -74.006],
  zoom: 11,
}))
