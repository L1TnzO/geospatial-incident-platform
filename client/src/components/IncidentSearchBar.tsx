import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useIncidentSearch } from '@/hooks/useIncidentSearch';
import { useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { useMapStore } from '@/store/useMapStore';
import type { IncidentSearchResult } from '@/types/incidents';
import {
  INCIDENT_SEARCH_DEBOUNCE_MS,
  INCIDENT_SEARCH_HISTORY_LIMIT,
  INCIDENT_SEARCH_HISTORY_STORAGE_KEY,
} from './incidentSearchBar.constants';

type HistoryEntry = {
  incidentNumber: string;
  title: string;
  timestamp: number;
};

const loadHistory = (): HistoryEntry[] => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(INCIDENT_SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as HistoryEntry[] | null;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry): entry is HistoryEntry =>
        Boolean(
          entry &&
            typeof entry.incidentNumber === 'string' &&
            entry.incidentNumber.trim() &&
            typeof entry.title === 'string' &&
            typeof entry.timestamp === 'number'
        )
      )
      .slice(0, INCIDENT_SEARCH_HISTORY_LIMIT);
  } catch (error) {
    console.warn('[IncidentSearchBar] Failed to load search history:', error);
    return [];
  }
};

const persistHistory = (history: HistoryEntry[]) => {
  if (typeof window === 'undefined' || !('localStorage' in window)) {
    return;
  }

  try {
    window.localStorage.setItem(
      INCIDENT_SEARCH_HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(0, INCIDENT_SEARCH_HISTORY_LIMIT))
    );
  } catch (error) {
    console.warn('[IncidentSearchBar] Failed to persist search history:', error);
  }
};

const normalizeIncidentNumber = (value: string): string => value.trim().toUpperCase();

const IncidentSearchBar = () => {
  const [inputValue, setInputValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  const {
    metadata,
    isMetadataLoading,
    metadataError,
    search,
    isSearching,
    searchError,
    lastResult,
  } = useIncidentSearch();
  const setView = useMapStore((state) => state.setView);
  const openIncident = useIncidentDetailStore((state) => state.openIncident);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedValue(inputValue.trim());
    }, INCIDENT_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handler);
  }, [inputValue]);

  const suggestions = useMemo(() => {
    if (!isFocused) {
      return [];
    }

    const normalized = normalizeIncidentNumber(inputValue);
    if (!normalized) {
      return history;
    }

    return history.filter((entry) => entry.incidentNumber.startsWith(normalized));
  }, [history, inputValue, isFocused]);

  const handleResultSelection = useCallback(
    (result: IncidentSearchResult) => {
      const normalized = normalizeIncidentNumber(result.incidentNumber);
      const [longitude, latitude] = result.location.geometry.coordinates;
      setView([latitude, longitude], 14);
      openIncident({
        incidentNumber: result.incidentNumber,
        title: result.title,
        occurrenceAt: result.occurrenceAt,
        reportedAt: result.reportedAt,
        dispatchAt: null,
        arrivalAt: null,
        resolvedAt: null,
        isActive: result.isActive,
        casualtyCount: 0,
        responderInjuries: 0,
        estimatedDamageAmount: null,
        location: result.location,
        locationGeohash: undefined,
        externalReference: null,
        type: result.type,
        severity: result.severity,
        status: result.status,
        source: null,
        weather: null,
        primaryStation: null,
      });

      setHistory((current) => {
        const withoutDuplicate = current.filter(
          (entry) => normalizeIncidentNumber(entry.incidentNumber) !== normalized
        );
        const next = [
          { incidentNumber: result.incidentNumber, title: result.title, timestamp: Date.now() },
          ...withoutDuplicate,
        ].slice(0, INCIDENT_SEARCH_HISTORY_LIMIT);
        persistHistory(next);
        return next;
      });

      setIsFocused(false);
    },
    [setView, openIncident]
  );

  useEffect(() => {
    if (!debouncedValue) {
      return;
    }

    void search(debouncedValue).then((result) => {
      if (!result) {
        return;
      }

      handleResultSelection(result);
    });
  }, [debouncedValue, handleResultSelection, search]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = inputValue.trim();
    if (!value) {
      return;
    }

    void search(value).then((result) => {
      if (result) {
        handleResultSelection(result);
      }
    });
  };

  const handleClear = () => {
    setInputValue('');
    setDebouncedValue('');
  };

  const handleSuggestionClick = (entry: HistoryEntry) => {
    setInputValue(entry.incidentNumber);
    setDebouncedValue(entry.incidentNumber);
  };

  const placeholder = metadata?.activeCount
    ? `Search ${metadata.activeCount.toLocaleString()} active incidents…`
    : 'Search by incident number…';

  return (
    <div className="incident-search" role="search">
      <form className="incident-search__form" onSubmit={handleSubmit}>
        <label htmlFor="incident-search-input" className="incident-search__label">
          Incident search
        </label>
        <div className="incident-search__input-wrapper">
          <input
            id="incident-search-input"
            type="search"
            value={inputValue}
            placeholder={placeholder}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(event) => setInputValue(event.target.value)}
            aria-describedby="incident-search-status"
            aria-autocomplete="list"
            aria-haspopup="listbox"
          />
          {inputValue && (
            <button
              type="button"
              className="incident-search__clear"
              onClick={handleClear}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
          <button
            type="submit"
            className="incident-search__submit"
            disabled={isSearching}
            aria-label="Search incidents"
          >
            Search
          </button>
        </div>
        <div id="incident-search-status" className="incident-search__status" aria-live="polite">
          {isSearching && <span>Searching…</span>}
          {!isSearching && searchError && (
            <span className="incident-search__error">{searchError}</span>
          )}
          {!isSearching && !searchError && metadataError && (
            <span className="incident-search__error">{metadataError}</span>
          )}
          {!isSearching && !searchError && !metadataError && lastResult && (
            <span className="incident-search__success">
              Found {lastResult.incidentNumber} ({lastResult.type.name})
            </span>
          )}
        </div>
      </form>
      {isFocused && suggestions.length > 0 && (
        <ul className="incident-search__suggestions" role="listbox">
          {suggestions.map((entry) => (
            <li key={`${entry.incidentNumber}-${entry.timestamp}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionClick(entry)}
                className="incident-search__suggestion"
                role="option"
                aria-selected="false"
              >
                <span className="incident-search__suggestion-number">{entry.incidentNumber}</span>
                <span className="incident-search__suggestion-title">{entry.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {isMetadataLoading && !metadata && (
        <p className="incident-search__helper" role="status" aria-live="polite">
          Loading search metadata…
        </p>
      )}
    </div>
  );
};

export default IncidentSearchBar;
