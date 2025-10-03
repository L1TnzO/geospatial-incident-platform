import { create } from 'zustand';
import { fetchIncidentDetail } from '@/services/incidentDetailService';
import type { IncidentDetail, IncidentListItem } from '@/types/incidents';

export interface IncidentDetailState {
  selectedIncident: IncidentListItem | null;
  isOpen: boolean;
  detailCache: Record<string, IncidentDetail>;
  pendingIncidentNumber: string | null;
  error?: string;
  openIncident: (incident: IncidentListItem) => void;
  closeIncident: () => void;
  refreshIncidentDetail: (incidentNumber?: string) => void;
  getIncidentDetail: (incidentNumber: string) => IncidentDetail | undefined;
}

let inFlightController: AbortController | null = null;

const createFetchTask = (
  incidentNumber: string,
  set: (
    partial:
      | Partial<IncidentDetailState>
      | ((state: IncidentDetailState) => Partial<IncidentDetailState>)
  ) => void,
  get: () => IncidentDetailState,
  forceReload = false
) => {
  const normalizedNumber = incidentNumber.trim();
  if (!normalizedNumber) {
    return;
  }

  const cached = get().detailCache[normalizedNumber];
  if (cached && !forceReload) {
    set((state) =>
      state.pendingIncidentNumber === normalizedNumber
        ? { pendingIncidentNumber: null, error: undefined }
        : { error: undefined }
    );
    return;
  }

  if (inFlightController) {
    inFlightController.abort();
  }

  const controller = new AbortController();
  inFlightController = controller;

  set({ pendingIncidentNumber: normalizedNumber, error: undefined });

  void fetchIncidentDetail(normalizedNumber, controller.signal)
    .then((detail) => {
      set((state) => {
        const nextCache = { ...state.detailCache, [normalizedNumber]: detail };
        const isCurrent = state.pendingIncidentNumber === normalizedNumber;
        return {
          detailCache: nextCache,
          pendingIncidentNumber: isCurrent ? null : state.pendingIncidentNumber,
          error: undefined,
        };
      });
    })
    .catch((error) => {
      if (controller.signal.aborted) {
        return;
      }

      set((state) => {
        const message = error instanceof Error ? error.message : 'Failed to load incident detail';
        const isCurrent = state.pendingIncidentNumber === normalizedNumber;
        return {
          error: message,
          pendingIncidentNumber: isCurrent ? null : state.pendingIncidentNumber,
        };
      });
    })
    .finally(() => {
      if (inFlightController === controller) {
        inFlightController = null;
      }
    });
};

export const useIncidentDetailStore = create<IncidentDetailState>((set, get) => ({
  selectedIncident: null,
  isOpen: false,
  detailCache: {},
  pendingIncidentNumber: null,
  error: undefined,
  openIncident: (incident) => {
    set({ selectedIncident: incident, isOpen: true });
    createFetchTask(incident.incidentNumber, set, get);
  },
  closeIncident: () => {
    if (inFlightController) {
      inFlightController.abort();
      inFlightController = null;
    }
    set({ selectedIncident: null, isOpen: false, pendingIncidentNumber: null, error: undefined });
  },
  refreshIncidentDetail: (incidentNumber) => {
    const targetNumber = incidentNumber ?? get().selectedIncident?.incidentNumber;
    if (!targetNumber) {
      return;
    }
    createFetchTask(targetNumber, set, get, true);
  },
  getIncidentDetail: (incidentNumber) => get().detailCache[incidentNumber],
}));

export const resetIncidentDetailStore = () => {
  if (inFlightController) {
    inFlightController.abort();
    inFlightController = null;
  }
  useIncidentDetailStore.setState({
    selectedIncident: null,
    isOpen: false,
    detailCache: {},
    pendingIncidentNumber: null,
    error: undefined,
  });
};
