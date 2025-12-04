import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { LiteIncident } from '../types';
import type { IncidentSortField, PaginationMeta } from '../types/api/incidents';
import { AlertTriangle, ChevronDown, ChevronUp, Download, Loader2, RefreshCw } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';
import { Card } from './ui/card';

interface TableViewProps {
  incidents: LiteIncident[];
  pagination?: PaginationMeta;
  totalCount: number;
  remainder: number;
  page: number;
  pageSize: number;
  sortBy: IncidentSortField;
  sortDirection: 'asc' | 'desc';
  hasNext: boolean;
  hasPrevious: boolean;
  onSortChange: (field: IncidentSortField, direction: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
  onIncidentClick: (incident: LiteIncident) => void;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error?: string;
  onRetry: () => void;
  activeIncidentId?: string | null;
}

const getSeverityColor = (incident: LiteIncident) =>
  incident.severityColor
    ? { backgroundColor: `${incident.severityColor}22`, borderColor: incident.severityColor }
    : undefined;

const formatDateTime = (value?: string) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const buildPageRange = (current: number, total: number, maxButtons = 5): number[] => {
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + maxButtons - 1);

  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

export function TableView({
  incidents,
  pagination,
  totalCount,
  remainder,
  page,
  pageSize,
  sortBy,
  sortDirection,
  hasNext,
  hasPrevious,
  onSortChange,
  onPageChange,
  onIncidentClick,
  isLoading,
  isFetching,
  isError,
  error,
  onRetry,
  activeIncidentId,
}: TableViewProps) {
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const pageNumbers = useMemo(() => buildPageRange(page, totalPages), [page, totalPages]);
  const showingStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = totalCount === 0 ? 0 : showingStart + incidents.length - 1;
  const showEmptyState = !isLoading && !isError && incidents.length === 0;
  const showLoadingOverlay = isLoading || (isFetching && incidents.length === 0);

  const handleExportCsv = () => {
    if (incidents.length === 0) {
      return;
    }

    const headers = [
      'Incident Number',
      'Status',
      'Severity',
      'Type',
      'Reported At',
      'Occurrence At',
      'Location',
      'Description',
    ];

    const rows = incidents.map((incident) => [
      incident.id,
      incident.status,
      incident.severity,
      incident.type,
      incident.reportedAt ?? incident.timestamp,
      incident.occurrenceAt ?? '—',
      incident.location.address,
      incident.description,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incidents_page_${page}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSortClick = (field: IncidentSortField) => {
    const nextDirection = sortBy === field ? (sortDirection === 'asc' ? 'desc' : 'asc') : 'desc';
    onSortChange(field, nextDirection);
  };

  const renderSortIcon = (field: IncidentSortField) => {
    if (sortBy !== field) {
      return null;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading incidents…
            </span>
          ) : (
            <span>
              Showing{' '}
              <span className="font-medium text-foreground">
                {totalCount === 0
                  ? 0
                  : `${showingStart.toLocaleString()} – ${showingEnd.toLocaleString()}`}
              </span>{' '}
              of <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span>{' '}
              incidents
              {pagination?.totalPages
                ? ` • Page ${page.toLocaleString()} of ${pagination.totalPages.toLocaleString()}`
                : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <span
              className="flex items-center gap-2 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Updating…
            </span>
          )}
          <Button onClick={handleExportCsv} className="gap-2" disabled={incidents.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Incident</TableHead>
              <TableHead>Status</TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSortClick('severityPriority')}
              >
                Severity {renderSortIcon('severityPriority')}
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSortClick('reportedAt')}
              >
                Reported {renderSortIcon('reportedAt')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50"
                onClick={() => handleSortClick('occurrenceAt')}
              >
                Occurrence {renderSortIcon('occurrenceAt')}
              </TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incidents.map((incident) => {
              const isActiveRow =
                activeIncidentId && incident.id.toUpperCase() === activeIncidentId.toUpperCase();

              return (
                <TableRow
                  key={incident.id}
                  data-selected={isActiveRow}
                  className={isActiveRow ? 'bg-muted/70' : undefined}
                >
                  <TableCell className="font-medium">{incident.id}</TableCell>
                  <TableCell>{incident.status}</TableCell>
                  <TableCell>
                    <Badge variant="outline" style={getSeverityColor(incident)}>
                      {incident.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>{incident.type}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(incident.reportedAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(incident.occurrenceAt)}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onIncidentClick(incident)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {(showLoadingOverlay || isError || showEmptyState) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
            <Card className="max-w-sm space-y-3 p-6 text-center shadow-md">
              {showLoadingOverlay && (
                <>
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                  <p className="font-medium">Loading incidents…</p>
                </>
              )}
              {isError && !showLoadingOverlay && (
                <>
                  <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
                  <p className="font-medium text-destructive">
                    {error ?? 'Unable to load incidents.'}
                  </p>
                  <Button variant="outline" className="gap-2" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                </>
              )}
              {showEmptyState && !showLoadingOverlay && !isError && (
                <>
                  <p className="font-medium">No incidents match the filters.</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting the filters or clearing the incident search.
                  </p>
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      {totalCount > 0 && (
        <div className="space-y-3">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  size="sm"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  className={hasPrevious ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
                />
              </PaginationItem>
              {pageNumbers.map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    size="sm"
                    isActive={pageNumber === page}
                    onClick={() => onPageChange(pageNumber)}
                    className="cursor-pointer"
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  size="sm"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  className={hasNext ? 'cursor-pointer' : 'pointer-events-none opacity-50'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="text-center text-sm text-muted-foreground">
            Showing {showingStart === 0 ? 0 : showingStart.toLocaleString()} –{' '}
            {showingEnd === 0 ? 0 : showingEnd.toLocaleString()} of {totalCount.toLocaleString()}{' '}
            incidents
          </div>
          {remainder > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {remainder.toLocaleString()} additional incidents available. Continue to the next
              pages to review the remaining records.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
