import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../services/api-client';
import type { IncidentSearchResult } from '../types/api/incidents';
import { HttpError } from '../lib/http';
import {
  INCIDENT_SEARCH_DEBOUNCE_MS,
  INCIDENT_SEARCH_HISTORY_LIMIT,
  INCIDENT_SEARCH_HISTORY_STORAGE_KEY,
} from '../constants/incident-search';

export interface IncidentSearchHistoryEntry {
  incidentNumber: string;
  title: string;
  timestamp: number;
}

export interface UseIncidentSearchOptions {
  debounceMs?: number;
  historyLimit?: number;
  autoSearch?: boolean;
  initialTerm?: string;
}

export interface IncidentSearchControls {
  term: string;
  setTerm: (value: string) => void;
  debouncedTerm: string;
  isSearching: boolean;
  searchError?: string;
  lastResult: IncidentSearchResult | null;
  history: IncidentSearchHistoryEntry[];
  suggestions: IncidentSearchHistoryEntry[];
  search: (
    value?: string,
    options?: {
      force?: boolean;
    },
  ) => Promise<IncidentSearchResult | null>;
  selectHistoryEntry: (entry: IncidentSearchHistoryEntry) => void;
  removeHistoryEntry: (incidentNumber: string) => void;
  clearHistory: () => void;
  clearSearchError: () => void;
  reset: () => void;
}

const normalizeIncidentNumber = (value: string): string => value.trim().toUpperCase();

const isBrowserEnvironment = () => typeof window !== 'undefined' && 'localStorage' in window;

const parseHistory = (candidate: unknown): IncidentSearchHistoryEntry[] => {
  if (!Array.isArray(candidate)) {
    return [];
  }

  return candidate
    .filter((entry): entry is IncidentSearchHistoryEntry => {
      if (!entry || typeof entry !== 'object') {
        return false;
      }

      const record = entry as Record<string, unknown>;
      return (
        typeof record.incidentNumber === 'string' &&
        record.incidentNumber.trim().length > 0 &&
        typeof record.title === 'string' &&
        typeof record.timestamp === 'number'
      );
    })
    .map((entry) => ({
      incidentNumber: normalizeIncidentNumber(entry.incidentNumber),
      title: entry.title,
      timestamp: entry.timestamp,
    }));
};

const loadHistory = (limit: number): IncidentSearchHistoryEntry[] => {
  if (!isBrowserEnvironment()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(INCIDENT_SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    return parseHistory(parsed).slice(0, limit);
  } catch (error) {
    console.warn('[useIncidentSearch] Failed to load search history:', error);
    return [];
  }
};

const persistHistory = (history: IncidentSearchHistoryEntry[], limit: number) => {
  if (!isBrowserEnvironment()) {
    return;
  }

  try {
    const payload = JSON.stringify(history.slice(0, limit));
    window.localStorage.setItem(INCIDENT_SEARCH_HISTORY_STORAGE_KEY, payload);
  } catch (error) {
    console.warn('[useIncidentSearch] Failed to persist search history:', error);
  }
};

export const useIncidentSearch = (
  options: UseIncidentSearchOptions = {},
): IncidentSearchControls => {
  const {
    debounceMs = INCIDENT_SEARCH_DEBOUNCE_MS,
    historyLimit = INCIDENT_SEARCH_HISTORY_LIMIT,
    autoSearch = true,
    initialTerm = '',
  } = options;

  const [term, setTermState] = useState<string>(initialTerm);
  const [debouncedTerm, setDebouncedTerm] = useState<string>(initialTerm.trim());
  const [history, setHistory] = useState<IncidentSearchHistoryEntry[]>(() =>
    loadHistory(historyLimit),
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | undefined>(undefined);
  const [lastResult, setLastResult] = useState<IncidentSearchResult | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lastRequestedRef = useRef<string | null>(null);
  const lastCompletedRef = useRef<string | null>(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedTerm(term.trim());
    }, debounceMs);

    return () => {
      window.clearTimeout(handle);
    };
  }, [term, debounceMs]);

  const updateHistory = useCallback(
    (result: IncidentSearchResult) => {
      const normalized = normalizeIncidentNumber(result.incidentNumber);
      setHistory((current) => {
        const withoutDuplicate = current.filter(
          (entry) => normalizeIncidentNumber(entry.incidentNumber) !== normalized,
        );
        const next: IncidentSearchHistoryEntry[] = [
          {
            incidentNumber: normalized,
            title: result.title,
            timestamp: Date.now(),
          },
          ...withoutDuplicate,
        ].slice(0, historyLimit);
        persistHistory(next, historyLimit);
        return next;
      });
    },
    [historyLimit],
  );

  const removeHistoryEntry = useCallback(
    (incidentNumber: string) => {
      const normalized = normalizeIncidentNumber(incidentNumber);
      setHistory((current) => {
        const next = current.filter(
          (entry) => normalizeIncidentNumber(entry.incidentNumber) !== normalized,
        );
        persistHistory(next, historyLimit);
        return next;
      });
    },
    [historyLimit],
  );

  const clearHistory = useCallback(() => {
    setHistory(() => {
      if (isBrowserEnvironment()) {
        window.localStorage.removeItem(INCIDENT_SEARCH_HISTORY_STORAGE_KEY);
      }
      return [];
    });
  }, []);

  const clearSearchError = useCallback(() => {
    setSearchError(undefined);
  }, []);

  const setTerm = useCallback((value: string) => {
    setTermState(value);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    lastRequestedRef.current = null;
    lastCompletedRef.current = null;
    setTermState('');
    setDebouncedTerm('');
    setSearchError(undefined);
    setLastResult(null);
  }, []);

  const search = useCallback<IncidentSearchControls['search']>(
    async (value, { force = false } = {}) => {
      const normalized = normalizeIncidentNumber(value ?? term);

      if (!normalized) {
        setSearchError('Enter an incident number to search.');
        setLastResult(null);
        lastRequestedRef.current = null;
        lastCompletedRef.current = null;
        return null;
      }

      if (
        !force &&
        lastRequestedRef.current === normalized &&
        lastCompletedRef.current === normalized
      ) {
        return lastResult;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      setSearchError(undefined);
      lastRequestedRef.current = normalized;

      try {
        const result = await apiClient.incidents.search({
          incidentNumber: normalized,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return null;
        }

        setLastResult(result);
        lastCompletedRef.current = normalized;
        updateHistory(result);
        return result;
      } catch (error) {
        if (controller.signal.aborted) {
          return null;
        }

        lastCompletedRef.current = null;
        setLastResult(null);

        if (error instanceof HttpError) {
          setSearchError(error.message);
        } else if (error instanceof DOMException && error.name === 'AbortError') {
          return null;
        } else {
          const message = error instanceof Error ? error.message : 'Failed to search incidents.';
          setSearchError(message);
        }

        return null;
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }

        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [term, updateHistory, lastResult],
  );

  useEffect(() => {
    if (!autoSearch) {
      return;
    }

    const normalized = normalizeIncidentNumber(debouncedTerm);
    if (!normalized) {
      abortRef.current?.abort();
      lastRequestedRef.current = null;
      lastCompletedRef.current = null;
      setLastResult(null);
      setSearchError(undefined);
      return;
    }

    void search(normalized);
  }, [autoSearch, debouncedTerm, search]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const suggestions = useMemo(() => {
    const normalized = normalizeIncidentNumber(term);
    if (!normalized) {
      return history;
    }

    return history.filter((entry) =>
      normalizeIncidentNumber(entry.incidentNumber).startsWith(normalized),
    );
  }, [history, term]);

  const selectHistoryEntry = useCallback((entry: IncidentSearchHistoryEntry) => {
    setTermState(entry.incidentNumber);
    setDebouncedTerm(entry.incidentNumber);
  }, []);

  return {
    term,
    setTerm,
    debouncedTerm,
    isSearching,
    searchError,
    lastResult,
    history,
    suggestions,
    search,
    selectHistoryEntry,
    removeHistoryEntry,
    clearHistory,
    clearSearchError,
    reset,
  };
};
