import { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { useIncidentFiltersStore } from '../store/incident-filters-store';
import { useIncidentMetadataQuery } from '../hooks/useIncidentMetadataQuery';

interface DraftFilters {
  incidentNumber: string;
  startDate: string;
  endDate: string;
  typeCodes: string[];
  severityCodes: string[];
  statusCodes: string[];
  isActive: boolean;
}

type FilterSnapshot = {
  incidentNumber?: string;
  startDate?: string;
  endDate?: string;
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  isActive?: boolean;
};

const toDraft = (filters: FilterSnapshot): DraftFilters => ({
  incidentNumber: filters.incidentNumber ?? '',
  startDate: filters.startDate ?? '',
  endDate: filters.endDate ?? '',
  typeCodes: filters.typeCodes ?? [],
  severityCodes: filters.severityCodes ?? [],
  statusCodes: filters.statusCodes ?? [],
  isActive: filters.isActive ?? true,
});

export function FiltersPanel() {
  const {
    incidentNumber,
    startDate,
    endDate,
    typeCodes,
    severityCodes,
    statusCodes,
    isActive,
    setFilters,
    reset,
  } = useIncidentFiltersStore();

  const metadataQuery = useIncidentMetadataQuery();
  const [draft, setDraft] = useState<DraftFilters>(() =>
    toDraft({
      incidentNumber,
      startDate,
      endDate,
      typeCodes,
      severityCodes,
      statusCodes,
      isActive,
    }),
  );

  useEffect(() => {
    setDraft(
      toDraft({
        incidentNumber,
        startDate,
        endDate,
        typeCodes,
        severityCodes,
        statusCodes,
        isActive,
      }),
    );
  }, [incidentNumber, startDate, endDate, typeCodes, severityCodes, statusCodes, isActive]);

  const metadata = metadataQuery.data;

  const typeOptions = metadata?.types ?? [];
  const severityOptions = metadata?.severities ?? [];
  const statusOptions = metadata?.statuses ?? [];

  const toggleCode = (
    key: keyof Pick<DraftFilters, 'typeCodes' | 'severityCodes' | 'statusCodes'>,
    code: string,
  ) => {
    setDraft((current) => {
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
      incidentNumber: draft.incidentNumber || undefined,
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
  };

  const normalizeCodes = (values?: string[]) => (values ?? []).slice().sort().join('|');

  const isApplyDisabled = useMemo(() => {
    return (
      draft.incidentNumber === (incidentNumber ?? '') &&
      draft.startDate === (startDate ?? '') &&
      draft.endDate === (endDate ?? '') &&
      draft.isActive === (isActive ?? true) &&
      normalizeCodes(draft.typeCodes) === normalizeCodes(typeCodes) &&
      normalizeCodes(draft.severityCodes) === normalizeCodes(severityCodes) &&
      normalizeCodes(draft.statusCodes) === normalizeCodes(statusCodes)
    );
  }, [draft, incidentNumber, startDate, endDate, isActive, typeCodes, severityCodes, statusCodes]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Filters &amp; Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="incidentNumber">Incident number</Label>
          <Input
            id="incidentNumber"
            placeholder="e.g. INC-2025-001"
            value={draft.incidentNumber}
            onChange={(event) =>
              setDraft((current) => ({ ...current, incidentNumber: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Date range</Label>
          <div className="space-y-2">
            <Input
              type="date"
              value={draft.startDate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, startDate: event.target.value }))
              }
            />
            <Input
              type="date"
              value={draft.endDate}
              onChange={(event) =>
                setDraft((current) => ({ ...current, endDate: event.target.value }))
              }
            />
          </div>
        </div>

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
