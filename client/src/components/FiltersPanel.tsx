import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import {
  useIncidentFiltersStore,
  ACTIVE_RENDER_LIMIT_MAX,
  DEFAULT_ACTIVE_RENDER_LIMIT,
  DEFAULT_HISTORICAL_RENDER_LIMIT,
  GLOBAL_RENDER_LIMIT_MAX,
  HISTORICAL_RENDER_LIMIT_MAX,
  MIN_RENDER_LIMIT,
} from '../store/incident-filters-store';
import { useMapStore } from '../store/map-store';
import { useIncidentMetadataQuery } from '../hooks/useIncidentMetadataQuery';
import { useIncidentSearch } from '../hooks/useIncidentSearch';
import { useIncidentsData } from '../hooks/useIncidentsData';
import { isMobile } from '../utils/platform';
import { useMediaQuery } from '../hooks/use-media-query';

interface DraftFilters {
  startDate: string;
  endDate: string;
  typeCodes: string[];
  severityCodes: string[];
  statusCodes: string[];
  isActive: boolean;
  renderLimit: number;
}

type FilterSnapshot = {
  startDate?: string;
  endDate?: string;
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  isActive?: boolean;
  renderLimit?: number;
};

const toDateInputValue = (value?: string): string => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const normalizeIncidentNumberValue = (value: string): string => value.trim().toUpperCase();

const resolveDraftRenderLimit = (filters: FilterSnapshot): number => {
  const isActive = filters.isActive !== false;
  const fallback = isActive ? DEFAULT_ACTIVE_RENDER_LIMIT : DEFAULT_HISTORICAL_RENDER_LIMIT;
  const candidate = typeof filters.renderLimit === 'number' ? filters.renderLimit : fallback;
  const upper = isActive ? ACTIVE_RENDER_LIMIT_MAX : HISTORICAL_RENDER_LIMIT_MAX;
  return Math.min(Math.max(Math.floor(candidate), MIN_RENDER_LIMIT), upper);
};

const toDraft = (filters: FilterSnapshot, isMobileLayout: boolean): DraftFilters => ({
  startDate: toDateInputValue(filters.startDate),
  endDate: toDateInputValue(filters.endDate),
  typeCodes: filters.typeCodes ?? [],
  severityCodes: filters.severityCodes ?? [],
  statusCodes: filters.statusCodes ?? [],
  isActive: isMobileLayout ? true : (filters.isActive ?? true),
  renderLimit: resolveDraftRenderLimit(filters),
});

export function FiltersPanel() {
  const {
    incidentNumber,
    searchTerm,
    startDate,
    endDate,
    typeCodes,
    severityCodes,
    statusCodes,
    isActive,
    renderLimit,
    setFilters,
    reset,
  } = useIncidentFiltersStore();

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isMobileLayout = !isDesktop || isMobile();

  const fetchParams = useIncidentFiltersStore(
    useShallow((state) => ({
      page: state.page,
      pageSize: state.pageSize,
      sortBy: state.sortBy,
      sortDirection: state.sortDirection,
      typeCodes: state.typeCodes,
      severityCodes: state.severityCodes,
      statusCodes: state.statusCodes,
      startDate: state.startDate,
      endDate: state.endDate,
      incidentNumber: state.incidentNumber,
      isActive: state.isActive,
      renderLimit: state.renderLimit,
    })),
  );

  const metadataQuery = useIncidentMetadataQuery();
  const [draft, setDraft] = useState<DraftFilters>(() =>
    toDraft({
      startDate,
      endDate,
      typeCodes,
      severityCodes,
      statusCodes,
      isActive,
      renderLimit,
    }, isMobileLayout),
  );

  useEffect(() => {
    setDraft(
      toDraft({
        startDate,
        endDate,
        typeCodes,
        severityCodes,
        statusCodes,
        isActive,
        renderLimit,
      }, isMobileLayout),
    );
  }, [startDate, endDate, typeCodes, severityCodes, statusCodes, isActive, renderLimit, isMobileLayout]);

  // Force isActive to true on mobile layout
  useEffect(() => {
    if (isMobileLayout && !isActive) {
      setFilters({ isActive: true });
    }
  }, [isMobileLayout, isActive, setFilters]);

  const {
    term: searchValue,
    setTerm: setSearchValue,
    isSearching,
    searchError,
    lastResult,
    suggestions,
    history,
    search: executeSearch,
    selectHistoryEntry,
    clearHistory,
    clearSearchError,
    reset: resetSearchControls,
  } = useIncidentSearch({
    initialTerm: searchTerm ?? incidentNumber ?? '',
  });

  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const metadata = metadataQuery.data;
  const typeOptions = metadata?.types ?? [];
  const severityOptions = metadata?.severities ?? [];
  const statusOptions = metadata?.statuses ?? [];

  const viewportCenter = useMapStore((state) => state.center);

  const incidentsData = useIncidentsData({
    ...fetchParams,
    priorityCenter: viewportCenter,
  });

  const reportedStart = metadata?.reportedRange?.start
    ? toDateInputValue(metadata.reportedRange.start)
    : undefined;
  const reportedEnd = metadata?.reportedRange?.end
    ? toDateInputValue(metadata.reportedRange.end)
    : undefined;

  const storeStartDateInput = toDateInputValue(startDate);
  const storeEndDateInput = toDateInputValue(endDate);

  const renderLimitBounds = useMemo(() => {
    const baseMax = draft.isActive ? ACTIVE_RENDER_LIMIT_MAX : HISTORICAL_RENDER_LIMIT_MAX;
    const dynamicMax = incidentsData.totalCount > 0 ? incidentsData.totalCount : baseMax;
    const cap = Math.min(Math.max(baseMax, dynamicMax), GLOBAL_RENDER_LIMIT_MAX);
    return {
      min: MIN_RENDER_LIMIT,
      max: Math.max(MIN_RENDER_LIMIT, cap),
    };
  }, [draft.isActive, incidentsData.totalCount]);

  const renderLimitStep = useMemo(() => {
    const dynamicStep = Math.round(renderLimitBounds.max / 200);
    return Math.max(10, dynamicStep || 10);
  }, [renderLimitBounds.max]);

  const clampRenderLimitDraft = useCallback(
    (value: number): number =>
      Math.min(
        Math.max(
          Math.floor(Number.isFinite(value) ? value : renderLimitBounds.min),
          renderLimitBounds.min,
        ),
        renderLimitBounds.max,
      ),
    [renderLimitBounds.max, renderLimitBounds.min],
  );

  useEffect(() => {
    setDraft((current: DraftFilters) => {
      const clamped = clampRenderLimitDraft(current.renderLimit);
      if (clamped === current.renderLimit) {
        return current;
      }
      setFilters({ renderLimit: clamped });
      return {
        ...current,
        renderLimit: clamped,
      };
    });
  }, [clampRenderLimitDraft, setFilters]);

  const handleSearchChange = (value: string) => {
    setSearchValue(normalizeIncidentNumberValue(value));
    if (searchError) {
      clearSearchError();
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSearchFocused(false);
    void executeSearch(searchValue, { force: true });
  };

  useEffect(() => {
    if (!lastResult) {
      return;
    }

    const normalized = normalizeIncidentNumberValue(lastResult.incidentNumber);
    const current = incidentNumber ? normalizeIncidentNumberValue(incidentNumber) : undefined;

    if (current === normalized) {
      return;
    }

    setFilters({
      incidentNumber: normalized,
      searchTerm: normalized,
      page: 1,
    });
  }, [incidentNumber, lastResult, setFilters]);

  useEffect(() => {
    if (searchValue.trim().length > 0) {
      return;
    }

    if (!incidentNumber && !searchTerm) {
      return;
    }

    setFilters({
      incidentNumber: undefined,
      searchTerm: undefined,
      page: 1,
    });
  }, [incidentNumber, searchTerm, searchValue, setFilters]);

  const handleClearSearch = () => {
    resetSearchControls();
    clearSearchError();
    setIsSearchFocused(false);
    setFilters({
      incidentNumber: undefined,
      searchTerm: undefined,
      page: 1,
    });
  };

  const toggleCode = (
    key: keyof Pick<DraftFilters, 'typeCodes' | 'severityCodes' | 'statusCodes'>,
    code: string,
  ) => {
  setDraft((current: DraftFilters) => {
      const next = new Set(current[key]);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return {
        ...current,
        [key]: Array.from(next),
      };
    });
  };

  const handleApply = () => {
    const normalizedSearch = searchValue ? normalizeIncidentNumberValue(searchValue) : undefined;

    setFilters({
      incidentNumber: normalizedSearch,
      searchTerm: normalizedSearch,
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || undefined,
      typeCodes: draft.typeCodes.length > 0 ? draft.typeCodes : undefined,
      severityCodes: draft.severityCodes.length > 0 ? draft.severityCodes : undefined,
      statusCodes: draft.statusCodes.length > 0 ? draft.statusCodes : undefined,
      isActive: draft.isActive,
      renderLimit: clampRenderLimitDraft(draft.renderLimit),
      page: 1,
    });
  };

  const handleReset = () => {
    reset();
    resetSearchControls();
    clearSearchError();
    setDraft(
      toDraft({
        startDate: undefined,
        endDate: undefined,
        typeCodes: undefined,
        severityCodes: undefined,
        statusCodes: undefined,
        isActive: true,
        renderLimit: DEFAULT_ACTIVE_RENDER_LIMIT,
      }),
    );
  };

  const normalizeCodes = (values?: string[]) => (values ?? []).slice().sort().join('|');

  const normalizedDraftIncident = searchValue ? normalizeIncidentNumberValue(searchValue) : '';
  const normalizedStoreIncident = incidentNumber
    ? normalizeIncidentNumberValue(incidentNumber)
    : '';

  const isApplyDisabled = useMemo(() => {
    return (
      normalizedDraftIncident === normalizedStoreIncident &&
      draft.startDate === storeStartDateInput &&
      draft.endDate === storeEndDateInput &&
      draft.isActive === (isActive ?? true) &&
      clampRenderLimitDraft(draft.renderLimit) === clampRenderLimitDraft(renderLimit) &&
      normalizeCodes(draft.typeCodes) === normalizeCodes(typeCodes) &&
      normalizeCodes(draft.severityCodes) === normalizeCodes(severityCodes) &&
      normalizeCodes(draft.statusCodes) === normalizeCodes(statusCodes)
    );
  }, [
    normalizedDraftIncident,
    normalizedStoreIncident,
    draft.startDate,
    draft.endDate,
    draft.isActive,
    draft.renderLimit,
    isActive,
    renderLimit,
    draft.typeCodes,
    draft.severityCodes,
    draft.statusCodes,
    typeCodes,
    severityCodes,
    statusCodes,
    storeStartDateInput,
    storeEndDateInput,
    clampRenderLimitDraft,
  ]);

  const searchPlaceholder = metadata?.activeCount
    ? `Search ${metadata.activeCount.toLocaleString()} incidents…`
    : 'Search by incident number…';

  const totalCountLabel =
    incidentsData.totalCount === 0 && incidentsData.isLoading
      ? '…'
      : incidentsData.totalCount.toLocaleString();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Filters &amp; Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="incident-search">Incident search</Label>
            {history.length > 0 && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="px-0 text-xs"
                onClick={clearHistory}
              >
                Clear history
              </Button>
            )}
          </div>
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                id="incident-search"
                type="search"
                autoComplete="off"
                value={searchValue}
                placeholder={searchPlaceholder}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(event) => handleSearchChange(event.target.value)}
              />
              <Button type="submit" disabled={isSearching || searchValue.trim().length === 0}>
                {isSearching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                Search
              </Button>
            </div>
          </form>
          <div className="min-h-[1.5rem] text-sm" aria-live="polite">
            {isSearching && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </span>
            )}
            {!isSearching && searchError && (
              <span className="text-destructive" role="alert">
                {searchError}
              </span>
            )}
            {!isSearching && !searchError && lastResult && (
              <span className="text-muted-foreground" role="status">
                Found{' '}
                <span className="font-medium text-foreground">{lastResult.incidentNumber}</span> (
                {lastResult.type.name})
              </span>
            )}
            {!isSearching && !searchError && !lastResult && metadataQuery.isLoading && (
              <span className="text-muted-foreground">Loading search metadata…</span>
            )}
          </div>
          {isSearchFocused && suggestions.length > 0 && (
            <div className="rounded-md border bg-card shadow-sm">
              <ScrollArea className="max-h-40">
                <ul className="divide-y">
                  {suggestions.map((entry) => (
                    <li key={`${entry.incidentNumber}-${entry.timestamp}`}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          selectHistoryEntry(entry);
                          setIsSearchFocused(false);
                        }}
                      >
                        <span className="font-mono text-xs text-foreground">
                          {entry.incidentNumber}
                        </span>
                        <span className="flex-1 truncate text-xs text-muted-foreground">
                          {entry.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
          {searchValue && (
            <div>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearSearch}>
                Clear search
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Date range</Label>
          <div className="space-y-2">
            <Input
              type="date"
              value={draft.startDate}
              min={reportedStart}
              max={reportedEnd}
              onChange={(event) =>
                setDraft((current) => ({ ...current, startDate: event.target.value }))
              }
            />
            <Input
              type="date"
              value={draft.endDate}
              min={reportedStart}
              max={reportedEnd}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endDate: event.target.value }))
              }
            />
          </div>
          {metadata?.reportedRange?.start && metadata?.reportedRange?.end && (
            <p className="text-xs text-muted-foreground">
              Records available from {toDateInputValue(metadata.reportedRange.start)} to{' '}
              {toDateInputValue(metadata.reportedRange.end)}.
            </p>
          )}
        </div>

        {!isMobileLayout && (
          <div className="space-y-2">
            <Label className="flex items-center justify-between">
              Active incidents
              <Switch
                checked={draft.isActive}
                onCheckedChange={(checked: boolean) =>
                  setDraft((current) => ({ ...current, isActive: checked }))
                }
              />
            </Label>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="render-limit-slider" className="flex items-center justify-between">
            Records to display
            <span className="text-xs text-muted-foreground">
              {draft.renderLimit.toLocaleString()} /{' '}
              {totalCountLabel}
            </span>
          </Label>
          <div className="flex items-center gap-3">
            <Slider
              id="render-limit-slider"
              min={renderLimitBounds.min}
              max={renderLimitBounds.max}
              step={renderLimitStep}
              value={[draft.renderLimit]}
              onValueChange={(values: number[]) => {
                const [value] = values;
                setDraft((current) => ({
                  ...current,
                  renderLimit: clampRenderLimitDraft(value ?? current.renderLimit),
                }));
              }}
              onValueCommit={(values: number[]) => {
                const [value] = values;
                const nextValue = clampRenderLimitDraft(value ?? draft.renderLimit);
                setDraft((current) => ({ ...current, renderLimit: nextValue }));
                setFilters({ renderLimit: nextValue });
              }}
              className="flex-1"
            />
            <Input
              type="number"
              inputMode="numeric"
              min={renderLimitBounds.min}
              max={renderLimitBounds.max}
              step={renderLimitStep}
              value={draft.renderLimit}
              onChange={(event) => {
                const nextValue = clampRenderLimitDraft(Number(event.target.value));
                setDraft((current) => ({ ...current, renderLimit: nextValue }));
              }}
              onBlur={() => {
                const nextValue = clampRenderLimitDraft(draft.renderLimit);
                setFilters({ renderLimit: nextValue });
              }}
              className="w-28"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Adjust how many incidents load at once. Higher values may increase load time, especially when showing hundreds of thousands of records.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Incident types</Label>
          {metadataQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading types…</p>
          )}
          {metadataQuery.isError && (
            <p className="text-sm text-destructive" role="alert">
              {metadataQuery.error?.message ?? 'Unable to load incident types.'}
            </p>
          )}
          {!metadataQuery.isLoading && !metadataQuery.isError && (
            <ScrollArea className="h-40 rounded-md border p-2">
              <div className="space-y-2">
                {typeOptions.map((type) => (
                  <label key={type.code} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.typeCodes.includes(type.code)}
                      onCheckedChange={() => toggleCode('typeCodes', type.code)}
                    />
                    <span>{type.name}</span>
                  </label>
                ))}
                {typeOptions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No types available.</p>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="space-y-2">
          <Label>Severity</Label>
          <div className="space-y-2">
            {severityOptions.map((severity) => (
              <label key={severity.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.severityCodes.includes(severity.code)}
                  onCheckedChange={() => toggleCode('severityCodes', severity.code)}
                />
                <span>{severity.name}</span>
              </label>
            ))}
            {severityOptions.length === 0 && !metadataQuery.isLoading && (
              <p className="text-sm text-muted-foreground">No severity codes available.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <div className="space-y-2">
            {statusOptions.map((status) => (
              <label key={status.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.statusCodes.includes(status.code)}
                  onCheckedChange={() => toggleCode('statusCodes', status.code)}
                />
                <span>{status.name}</span>
              </label>
            ))}
            {statusOptions.length === 0 && !metadataQuery.isLoading && (
              <p className="text-sm text-muted-foreground">No status codes available.</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleApply} className="flex-1" disabled={isApplyDisabled}>
            Apply filters
          </Button>
          <Button onClick={handleReset} variant="outline">
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
