import { create } from 'zustand';
import type { IncidentSortField } from '../types/api/incidents';

const STORAGE_KEY = 'gip::incidentTableFilters::v2'; // Incremented to v2 for fire-focused data
const STORAGE_VERSION = 2; // Incremented to invalidate old filters with RESCUE/MEDICAL types
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORT_BY: IncidentSortField = 'reportedAt';
const DEFAULT_SORT_DIRECTION: 'asc' | 'desc' = 'desc';

export interface IncidentFiltersState {
  page: number;
  pageSize: number;
  sortBy: IncidentSortField;
  sortDirection: 'asc' | 'desc';
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  incidentNumber?: string;
  isActive?: boolean;
  searchTerm?: string;
  setFilters: (filters: Partial<Omit<IncidentFiltersState, 'setFilters' | 'reset'>>) => void;
  reset: () => void;
}

type StoredFilters = Omit<IncidentFiltersState, 'setFilters' | 'reset'>;

type StoragePayload = {
  version: number;
  filters: StoredFilters;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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
    console.warn('[incident-filters-store] localStorage unavailable:', error);
    return fallbackStorage;
  }
};

const sanitizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const next = value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());

  return next.length > 0 ? Array.from(new Set(next)) : undefined;
};

const sanitizeDate = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value) {
    return undefined;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
};

const sanitizeIncidentNumber = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
};

const sanitizePage = (value: unknown): number => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return DEFAULT_PAGE;
  }
  return Math.max(Math.floor(numeric), 1);
};

const clampPageSize = (value: unknown): number => {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.min(Math.max(Math.floor(numeric), 1), MAX_PAGE_SIZE);
};

const sanitizeSortBy = (value: unknown): IncidentSortField => {
  const allowed: IncidentSortField[] = ['reportedAt', 'occurrenceAt', 'severityPriority'];
  if (typeof value === 'string' && (allowed as string[]).includes(value)) {
    return value as IncidentSortField;
  }
  return DEFAULT_SORT_BY;
};

const sanitizeSortDirection = (value: unknown): 'asc' | 'desc' =>
  value === 'asc' || value === 'desc' ? value : DEFAULT_SORT_DIRECTION;

const sanitizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const loadFiltersFromStorage = (): StoredFilters | null => {
  const storage = getStorage();

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoragePayload | null;
    if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.filters) {
      return null;
    }

    const base: StoredFilters = {
      page: sanitizePage(parsed.filters.page),
      pageSize: clampPageSize(parsed.filters.pageSize),
      sortBy: sanitizeSortBy(parsed.filters.sortBy),
      sortDirection: sanitizeSortDirection(parsed.filters.sortDirection),
      isActive: sanitizeBoolean(parsed.filters.isActive, true),
    };

    const typeCodes = sanitizeStringArray(parsed.filters.typeCodes);
    const severityCodes = sanitizeStringArray(parsed.filters.severityCodes);
    const statusCodes = sanitizeStringArray(parsed.filters.statusCodes);
    const startDate = sanitizeDate(parsed.filters.startDate);
    const endDate = sanitizeDate(parsed.filters.endDate);
    const incidentNumber = sanitizeIncidentNumber(parsed.filters.incidentNumber);
    const searchTerm = sanitizeIncidentNumber(parsed.filters.searchTerm);

    if (typeCodes) base.typeCodes = typeCodes;
    if (severityCodes) base.severityCodes = severityCodes;
    if (statusCodes) base.statusCodes = statusCodes;
    if (startDate) base.startDate = startDate;
    if (endDate) base.endDate = endDate;
    if (incidentNumber) base.incidentNumber = incidentNumber;
    if (searchTerm) base.searchTerm = searchTerm;

    return base;
  } catch (error) {
    console.warn('[incident-filters-store] Failed to read filters from storage:', error);
    return null;
  }
};

const persistFilters = (filters: StoredFilters) => {
  const storage = getStorage();
  try {
    const payload: StoragePayload = {
      version: STORAGE_VERSION,
      filters,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('[incident-filters-store] Failed to persist filters:', error);
  }
};

const buildInitialFilters = (): StoredFilters => ({
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  sortBy: DEFAULT_SORT_BY,
  sortDirection: DEFAULT_SORT_DIRECTION,
  isActive: true,
});

const initialFilters: StoredFilters = {
  ...buildInitialFilters(),
  ...(loadFiltersFromStorage() ?? {}),
};

export const useIncidentFiltersStore = create<IncidentFiltersState>((set, get) => ({
  ...initialFilters,
  setFilters: (partial) => {
    set((current: IncidentFiltersState) => {
      const next: IncidentFiltersState = {
        ...current,
        ...partial,
      };

      if (partial.pageSize !== undefined) {
        next.pageSize = clampPageSize(partial.pageSize);
      }

      if (partial.page !== undefined) {
        next.page = sanitizePage(partial.page);
      }

      if (Object.prototype.hasOwnProperty.call(partial, 'incidentNumber')) {
        const incidentNumber = sanitizeIncidentNumber(partial.incidentNumber);
        if (incidentNumber) {
          next.incidentNumber = incidentNumber;
        } else {
          delete next.incidentNumber;
        }
      }

      if (partial.searchTerm !== undefined) {
        const searchTerm = sanitizeIncidentNumber(partial.searchTerm);
        if (searchTerm) {
          next.searchTerm = searchTerm;
        } else {
          delete next.searchTerm;
        }
      }

      if (
        partial.page === undefined &&
        (partial.typeCodes !== undefined ||
          partial.severityCodes !== undefined ||
          partial.statusCodes !== undefined ||
          partial.startDate !== undefined ||
          partial.endDate !== undefined ||
          Object.prototype.hasOwnProperty.call(partial, 'incidentNumber') ||
          Object.prototype.hasOwnProperty.call(partial, 'searchTerm'))
      ) {
        next.page = DEFAULT_PAGE;
      }

      return next;
    });

    const currentState = get();
    const toPersist: StoredFilters = {
      page: currentState.page,
      pageSize: currentState.pageSize,
      sortBy: currentState.sortBy,
      sortDirection: currentState.sortDirection,
      isActive: currentState.isActive,
    };

    if (currentState.typeCodes) toPersist.typeCodes = currentState.typeCodes;
    if (currentState.severityCodes) toPersist.severityCodes = currentState.severityCodes;
    if (currentState.statusCodes) toPersist.statusCodes = currentState.statusCodes;
    if (currentState.startDate) toPersist.startDate = currentState.startDate;
    if (currentState.endDate) toPersist.endDate = currentState.endDate;
    if (currentState.incidentNumber) toPersist.incidentNumber = currentState.incidentNumber;
    if (currentState.searchTerm) toPersist.searchTerm = currentState.searchTerm;

    persistFilters(toPersist);
  },
  reset: () => {
    const defaults = buildInitialFilters();
    set((current: IncidentFiltersState) => ({
      ...current,
      ...defaults,
      typeCodes: undefined,
      severityCodes: undefined,
      statusCodes: undefined,
      startDate: undefined,
      endDate: undefined,
      incidentNumber: undefined,
      searchTerm: undefined,
    }));
    persistFilters(defaults);
  },
}));

export const INCIDENT_FILTERS_STORAGE_KEY = STORAGE_KEY;
