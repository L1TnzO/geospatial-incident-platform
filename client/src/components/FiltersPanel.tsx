import { useEffect, useMemo, useState } from 'react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import {
  useIncidentFiltersStore,
  DEFAULT_ACTIVE_RENDER_LIMIT,
} from '../store/incident-filters-store';
import { useIncidentMetadataQuery } from '../hooks/useIncidentMetadataQuery';
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



const toDraft = (filters: FilterSnapshot, isMobileLayout: boolean): DraftFilters => ({
  startDate: toDateInputValue(filters.startDate),
  endDate: toDateInputValue(filters.endDate),
  typeCodes: filters.typeCodes ?? [],
  severityCodes: filters.severityCodes ?? [],
  statusCodes: filters.statusCodes ?? [],
  isActive: isMobileLayout ? true : (filters.isActive ?? true),
  renderLimit: filters.renderLimit ?? DEFAULT_ACTIVE_RENDER_LIMIT,
});

import { useAuth } from '../hooks/useAuth';

// ... existing imports ...

export function FiltersPanel() {
  const {
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

  const { user } = useAuth();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  // Restriction applies ONLY to guests, not just small screens
  const isGuestRestriction = !user;


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
    }, isGuestRestriction),
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
      }, isGuestRestriction),
    );
  }, [startDate, endDate, typeCodes, severityCodes, statusCodes, isActive, renderLimit, isGuestRestriction]);

  // Force isActive to true ONLY for guests
  useEffect(() => {
    if (isGuestRestriction && !isActive) {
      setFilters({ isActive: true });
    }
  }, [isGuestRestriction, isActive, setFilters]);

  const metadata = metadataQuery.data;
  const typeOptions = metadata?.types ?? [];
  const severityOptions = metadata?.severities ?? [];
  const statusOptions = metadata?.statuses ?? [];



  const reportedStart = metadata?.reportedRange?.start
    ? toDateInputValue(metadata.reportedRange.start)
    : undefined;
  const reportedEnd = metadata?.reportedRange?.end
    ? toDateInputValue(metadata.reportedRange.end)
    : undefined;

  const storeStartDateInput = toDateInputValue(startDate);
  const storeEndDateInput = toDateInputValue(endDate);



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
    setFilters({
      incidentNumber: undefined,
      searchTerm: undefined,
      startDate: draft.startDate || undefined,
      endDate: draft.endDate || undefined,
      typeCodes: draft.typeCodes.length > 0 ? draft.typeCodes : undefined,
      severityCodes: draft.severityCodes.length > 0 ? draft.severityCodes : undefined,
      statusCodes: draft.statusCodes.length > 0 ? draft.statusCodes : undefined,
      isActive: draft.isActive,
      page: 1,
    });
  };

  const handleReset = () => {
    reset();
    setDraft(
      toDraft({
        startDate: undefined,
        endDate: undefined,
        typeCodes: undefined,
        severityCodes: undefined,
        statusCodes: undefined,
        isActive: true,
        renderLimit: DEFAULT_ACTIVE_RENDER_LIMIT,
      }, isGuestRestriction),
    );
  };

  const normalizeCodes = (values?: string[]) => (values ?? []).slice().sort().join('|');

  const isApplyDisabled = useMemo(() => {
    return (
      draft.startDate === storeStartDateInput &&
      draft.endDate === storeEndDateInput &&
      draft.isActive === (isActive ?? true) &&
      normalizeCodes(draft.typeCodes) === normalizeCodes(typeCodes) &&
      normalizeCodes(draft.severityCodes) === normalizeCodes(severityCodes) &&
      normalizeCodes(draft.statusCodes) === normalizeCodes(statusCodes)
    );
  }, [
    draft.startDate,
    draft.endDate,
    draft.isActive,
    draft.typeCodes,
    draft.severityCodes,
    draft.statusCodes,
    storeStartDateInput,
    storeEndDateInput,
    isActive,
    typeCodes,
    severityCodes,
    statusCodes,
  ]);



  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Filters &amp; Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {!isGuestRestriction && (
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
