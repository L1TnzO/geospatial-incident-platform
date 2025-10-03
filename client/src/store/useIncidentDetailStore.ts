import { create } from 'zustand';
import { fetchIncidentDetail } from '@/services/incidentDetailService';
import type { IncidentDetail, IncidentListItem } from '@/types/incidents';

export interface IncidentDetailState {
  selectedIncident: IncidentListItem | null;
  isOpen: boolean;
  detailCache: Record<string, IncidentDetail>;
  detailCacheOrder: string[];
  pendingIncidentNumber: string | null;
  error?: string;
  openIncident: (incident: IncidentListItem) => void;
  closeIncident: () => void;
  refreshIncidentDetail: (incidentNumber?: string) => void;
  getIncidentDetail: (incidentNumber: string) => IncidentDetail | undefined;
}

let inFlightController: AbortController | null = null;

const DETAIL_CACHE_STORAGE_KEY = 'gip::incidentDetailCache::v1';
const DETAIL_CACHE_STORAGE_VERSION = 1;
const DETAIL_CACHE_MAX_ENTRIES = 25;

export const INCIDENT_DETAIL_CACHE_STORAGE_KEY = DETAIL_CACHE_STORAGE_KEY;

interface DetailCacheLoadResult {
  cache: Record<string, IncidentDetail>;
  order: string[];
}

interface DetailCacheStoragePayload {
  version: number;
  entries: Array<{ incidentNumber: string; detail: IncidentDetail }>;
}

const safeGetStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[useIncidentDetailStore] localStorage unavailable:', error);
    return null;
  }
};

const trimDetailCache = (
  cache: Record<string, IncidentDetail>,
  order: string[]
): DetailCacheLoadResult => {
  if (order.length <= DETAIL_CACHE_MAX_ENTRIES) {
    return { cache, order };
  }

  const nextCache: Record<string, IncidentDetail> = { ...cache };
  const nextOrder = [...order];

  while (nextOrder.length > DETAIL_CACHE_MAX_ENTRIES) {
    const removed = nextOrder.shift();
    if (removed) {
      delete nextCache[removed];
    }
  }

  return { cache: nextCache, order: nextOrder };
};

const persistDetailCache = (cache: Record<string, IncidentDetail>, order: string[]): void => {
  const storage = safeGetStorage();
  if (!storage) {
    return;
  }

  try {
    const entries = order
      .map((incidentNumber) => ({
        incidentNumber,
        detail: cache[incidentNumber],
      }))
      .filter((entry) => entry.detail !== undefined);

    const payload: DetailCacheStoragePayload = {
      version: DETAIL_CACHE_STORAGE_VERSION,
      entries,
    };

    storage.setItem(DETAIL_CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[useIncidentDetailStore] Failed to persist detail cache:', error);
  }
};

const loadDetailCacheFromStorage = (): DetailCacheLoadResult => {
  const storage = safeGetStorage();
  if (!storage) {
    return { cache: {}, order: [] };
  }

  try {
    const raw = storage.getItem(DETAIL_CACHE_STORAGE_KEY);
    if (!raw) {
      return { cache: {}, order: [] };
    }

    const parsed = JSON.parse(raw) as DetailCacheStoragePayload | null;
    if (
      !parsed ||
      parsed.version !== DETAIL_CACHE_STORAGE_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return { cache: {}, order: [] };
    }

    const cache: Record<string, IncidentDetail> = {};
    const order: string[] = [];

    for (const entry of parsed.entries) {
      if (
        entry &&
        typeof entry.incidentNumber === 'string' &&
        entry.incidentNumber.trim().length > 0 &&
        entry.detail &&
        typeof entry.detail === 'object'
      ) {
        cache[entry.incidentNumber] = entry.detail as IncidentDetail;
        order.push(entry.incidentNumber);
      }
    }

    return trimDetailCache(cache, order);
  } catch (error) {
    console.warn('[useIncidentDetailStore] Failed to load detail cache from storage:', error);
    return { cache: {}, order: [] };
  }
};

const clearDetailCacheStorage = (): void => {
  const storage = safeGetStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(DETAIL_CACHE_STORAGE_KEY);
  } catch (error) {
    console.warn('[useIncidentDetailStore] Failed to clear detail cache storage:', error);
  }
};

const touchCacheOrder = (order: string[], incidentNumber: string): string[] => {
  const nextOrder = order.filter((entry) => entry !== incidentNumber);
  nextOrder.push(incidentNumber);
  return nextOrder;
};

const initialDetailCache = loadDetailCacheFromStorage();

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
    set((state) => {
      const detailCacheOrder = touchCacheOrder(state.detailCacheOrder, normalizedNumber);
      persistDetailCache(state.detailCache, detailCacheOrder);
      if (state.pendingIncidentNumber === normalizedNumber) {
        return { pendingIncidentNumber: null, error: undefined, detailCacheOrder };
      }
      return { error: undefined, detailCacheOrder };
    });
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
        const updatedOrder = touchCacheOrder(state.detailCacheOrder, normalizedNumber);
        const trimmed = trimDetailCache(nextCache, updatedOrder);
        persistDetailCache(trimmed.cache, trimmed.order);
        const isCurrent = state.pendingIncidentNumber === normalizedNumber;
        return {
          detailCache: trimmed.cache,
          detailCacheOrder: trimmed.order,
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
  detailCache: initialDetailCache.cache,
  detailCacheOrder: initialDetailCache.order,
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

export const resetIncidentDetailStore = (options?: { clearStorage?: boolean }) => {
  if (inFlightController) {
    inFlightController.abort();
    inFlightController = null;
  }
  useIncidentDetailStore.setState({
    selectedIncident: null,
    isOpen: false,
    detailCache: {},
    detailCacheOrder: [],
    pendingIncidentNumber: null,
    error: undefined,
  });
  if (options?.clearStorage) {
    clearDetailCacheStorage();
  }
};
