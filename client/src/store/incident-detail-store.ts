import { create } from 'zustand';
import type { Incident } from '../types';

type IncidentIdentifier = string;

type StoredDetail<T = unknown> = {
  incidentId: IncidentIdentifier;
  detail: T;
  cachedAt: string;
};

interface IncidentDetailStore<TDetail = unknown> {
  selectedIncident: Incident | null;
  isOpen: boolean;
  detailCache: Record<IncidentIdentifier, StoredDetail<TDetail>>;
  detailOrder: IncidentIdentifier[];
  pendingIncidentId: IncidentIdentifier | null;
  error?: string;
  openIncident: (incident: Incident) => void;
  closeIncident: () => void;
  cacheIncidentDetail: (incidentId: IncidentIdentifier, detail: TDetail) => void;
  removeIncidentDetail: (incidentId: IncidentIdentifier) => void;
  getIncidentDetail: (incidentId: IncidentIdentifier) => StoredDetail<TDetail> | undefined;
  setPendingIncident: (incidentId: IncidentIdentifier | null) => void;
  setError: (message: string) => void;
  clearError: () => void;
}

const STORAGE_KEY = 'gip::incidentDetailCache::v1';
const STORAGE_VERSION = 1;
const MAX_ENTRIES = 25;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type StoragePayload = {
  version: number;
  entries: Array<StoredDetail>;
};

const fallbackStorage: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const getStorage = (): StorageLike => {
  if (typeof window === 'undefined') {
    return fallbackStorage;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[incident-detail-store] localStorage unavailable:', error);
    return fallbackStorage;
  }
};

const normalizeIncidentId = (incident: Incident | IncidentIdentifier): IncidentIdentifier => {
  if (typeof incident === 'string') {
    return incident.trim();
  }
  const candidate =
    'incidentNumber' in incident
      ? (incident as unknown as { incidentNumber: string }).incidentNumber
      : incident.id;
  if (typeof candidate === 'string') {
    return candidate.trim();
  }
  return String(candidate ?? '').trim();
};

const trimCache = <T>(cache: Record<IncidentIdentifier, StoredDetail<T>>, order: string[]) => {
  if (order.length <= MAX_ENTRIES) {
    return { cache, order };
  }

  const nextCache = { ...cache } as Record<IncidentIdentifier, StoredDetail<T>>;
  const nextOrder = [...order];

  while (nextOrder.length > MAX_ENTRIES) {
    const removed = nextOrder.shift();
    if (removed) {
      delete nextCache[removed];
    }
  }

  return { cache: nextCache, order: nextOrder };
};

const loadCache = (): {
  cache: Record<IncidentIdentifier, StoredDetail>;
  order: IncidentIdentifier[];
} => {
  const storage = getStorage();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return { cache: {}, order: [] };
    }

    const parsed = JSON.parse(raw) as StoragePayload | null;
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.entries)) {
      return { cache: {}, order: [] };
    }

    const cache: Record<IncidentIdentifier, StoredDetail> = {};
    const order: IncidentIdentifier[] = [];

    for (const entry of parsed.entries) {
      if (entry && typeof entry.incidentId === 'string') {
        cache[entry.incidentId] = entry;
        order.push(entry.incidentId);
      }
    }

    return trimCache(cache, order);
  } catch (error) {
    console.warn('[incident-detail-store] Failed to load cache:', error);
    return { cache: {}, order: [] };
  }
};

const persistCache = (cache: Record<IncidentIdentifier, StoredDetail>, order: string[]) => {
  const storage = getStorage();
  try {
    const payload: StoragePayload = {
      version: STORAGE_VERSION,
      entries: order
        .map((incidentId) => cache[incidentId])
        .filter((entry): entry is StoredDetail => Boolean(entry)),
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[incident-detail-store] Failed to persist cache:', error);
  }
};

const loadedCache = loadCache();

type StoreShape = IncidentDetailStore;

export const useIncidentDetailStore = create<StoreShape>((set, get) => ({
  selectedIncident: null,
  isOpen: false,
  detailCache: loadedCache.cache,
  detailOrder: loadedCache.order,
  pendingIncidentId: null,
  error: undefined,
  openIncident: (incident: Incident) => {
    set({ selectedIncident: incident, isOpen: true, error: undefined });
  },
  closeIncident: () => {
    set({ selectedIncident: null, isOpen: false, pendingIncidentId: null, error: undefined });
  },
  cacheIncidentDetail: (incidentId, detail) => {
    const normalized = normalizeIncidentId(incidentId);
    if (!normalized) {
      return;
    }

    set((state: StoreShape) => {
      const nextCache = {
        ...state.detailCache,
        [normalized]: { incidentId: normalized, detail, cachedAt: new Date().toISOString() },
      };
      const nextOrder = [...state.detailOrder.filter((entry) => entry !== normalized), normalized];
      const trimmed = trimCache(nextCache, nextOrder);
      persistCache(trimmed.cache, trimmed.order);
      return {
        detailCache: trimmed.cache,
        detailOrder: trimmed.order,
        pendingIncidentId: state.pendingIncidentId === normalized ? null : state.pendingIncidentId,
        error: undefined,
      };
    });
  },
  removeIncidentDetail: (incidentId) => {
    const normalized = normalizeIncidentId(incidentId);
    if (!normalized) {
      return;
    }

    set((state: StoreShape) => {
      if (!state.detailCache[normalized]) {
        return state;
      }

      const nextCache = { ...state.detailCache };
      delete nextCache[normalized];
      const order = state.detailOrder.filter((entry) => entry !== normalized);
      persistCache(nextCache, order);
      return {
        detailCache: nextCache,
        detailOrder: order,
      };
    });
  },
  getIncidentDetail: (incidentId) => {
    const normalized = normalizeIncidentId(incidentId);
    if (!normalized) {
      return undefined;
    }
    return get().detailCache[normalized];
  },
  setPendingIncident: (incidentId) => set({ pendingIncidentId: incidentId }),
  setError: (message) => set({ error: message }),
  clearError: () => set({ error: undefined }),
}));

export const INCIDENT_DETAIL_CACHE_STORAGE_KEY = STORAGE_KEY;

export const resetIncidentDetailStore = () => {
  useIncidentDetailStore.setState({
    selectedIncident: null,
    isOpen: false,
    detailCache: {},
    detailOrder: [],
    pendingIncidentId: null,
    error: undefined,
  });

  const storage = getStorage();
  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[incident-detail-store] Failed to clear cache storage:', error);
  }
};
