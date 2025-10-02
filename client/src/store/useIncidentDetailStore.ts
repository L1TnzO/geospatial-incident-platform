import { create } from 'zustand';
import type { IncidentListItem } from '@/types/incidents';

export interface IncidentDetailState {
  selectedIncident: IncidentListItem | null;
  isOpen: boolean;
  openIncident: (incident: IncidentListItem) => void;
  closeIncident: () => void;
}

export const useIncidentDetailStore = create<IncidentDetailState>((set) => ({
  selectedIncident: null,
  isOpen: false,
  openIncident: (incident) =>
    set({
      selectedIncident: incident,
      isOpen: true,
    }),
  closeIncident: () => set({ selectedIncident: null, isOpen: false }),
}));

export const resetIncidentDetailStore = () => {
  useIncidentDetailStore.setState({ selectedIncident: null, isOpen: false });
};
