import { useCallback, useEffect, useRef, useState } from 'react';
import { clearIncidentMetadataCache, fetchIncidentMetadata } from '@/services/incidentsMetaService';
import { searchIncidentByNumber } from '@/services/incidentSearchService';
import type { IncidentMetadata, IncidentSearchResult } from '@/types/incidents';

export interface UseIncidentSearchOptions {
  autoLoadMetadata?: boolean;
}

export interface UseIncidentSearchState {
  metadata: IncidentMetadata | null;
  isMetadataLoading: boolean;
  metadataError?: string;
  isSearching: boolean;
  searchError?: string;
  lastResult: IncidentSearchResult | null;
  search: (incidentNumber: string) => Promise<IncidentSearchResult | null>;
  clearSearchError: () => void;
  refreshMetadata: () => Promise<void>;
  reset: () => void;
}

export const useIncidentSearch = (
  options: UseIncidentSearchOptions = {}
): UseIncidentSearchState => {
  const { autoLoadMetadata = true } = options;

  const [metadata, setMetadata] = useState<IncidentMetadata | null>(null);
  const [isMetadataLoading, setIsMetadataLoading] = useState<boolean>(false);
  const [metadataError, setMetadataError] = useState<string | undefined>(undefined);

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | undefined>(undefined);
  const [lastResult, setLastResult] = useState<IncidentSearchResult | null>(null);

  const metadataAbort = useRef<AbortController | null>(null);
  const searchAbort = useRef<AbortController | null>(null);

  const loadMetadata = useCallback(async () => {
    metadataAbort.current?.abort();
    const controller = new AbortController();
    metadataAbort.current = controller;

    setIsMetadataLoading(true);
    setMetadataError(undefined);

    try {
      const value = await fetchIncidentMetadata({ signal: controller.signal });
      setMetadata(value);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setMetadataError(error instanceof Error ? error.message : 'Failed to load search metadata');
    } finally {
      if (!controller.signal.aborted) {
        setIsMetadataLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!autoLoadMetadata) {
      return;
    }

    if (!metadata && !isMetadataLoading && !metadataError) {
      void loadMetadata();
    }

    return () => {
      metadataAbort.current?.abort();
    };
  }, [autoLoadMetadata, isMetadataLoading, loadMetadata, metadata, metadataError]);

  const search = useCallback(
    async (incidentNumber: string): Promise<IncidentSearchResult | null> => {
      const normalized = incidentNumber.trim();
      if (!normalized) {
        setSearchError('Enter an incident number to search.');
        setLastResult(null);
        return null;
      }

      searchAbort.current?.abort();
      const controller = new AbortController();
      searchAbort.current = controller;

      setIsSearching(true);
      setSearchError(undefined);

      try {
        const summary = await searchIncidentByNumber(normalized, controller.signal);
        setLastResult(summary);
        return summary;
      } catch (error) {
        if (controller.signal.aborted) {
          return null;
        }

        const message = error instanceof Error ? error.message : 'Failed to search incidents.';
        setSearchError(message);
        setLastResult(null);
        return null;
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    },
    []
  );

  const clearSearchError = useCallback(() => {
    setSearchError(undefined);
  }, []);

  const reset = useCallback(() => {
    metadataAbort.current?.abort();
    searchAbort.current?.abort();
    setIsMetadataLoading(false);
    setMetadataError(undefined);
    setMetadata(null);
    setIsSearching(false);
    setSearchError(undefined);
    setLastResult(null);
    clearIncidentMetadataCache();
  }, []);

  useEffect(
    () => () => {
      metadataAbort.current?.abort();
      searchAbort.current?.abort();
    },
    []
  );

  return {
    metadata,
    isMetadataLoading,
    metadataError,
    isSearching,
    searchError,
    lastResult,
    search,
    clearSearchError,
    refreshMetadata: loadMetadata,
    reset,
  };
};
