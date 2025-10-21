import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { Incident } from '../types';
import { AlertTriangle, ChevronDown, ChevronUp, Download, RefreshCw } from 'lucide-react';
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
  incidents: Incident[];
  totalCount: number;
  onIncidentClick: (incident: Incident) => void;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  onRetry: () => void;
}

type SortField = 'id' | 'reportedAt' | 'occurrenceAt' | 'type' | 'severity' | 'status';
type SortDirection = 'asc' | 'desc';

const getSeverityColor = (incident: Incident) =>
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

export function TableView({
  incidents,
  totalCount,
  onIncidentClick,
  isLoading,
  isError,
  error,
  onRetry,
}: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('reportedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const handleSort = (field: SortField) => {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedIncidents = useMemo(() => {
    const getSortValue = (incident: Incident) => {
      switch (sortField) {
        case 'id':
          return incident.id;
        case 'reportedAt':
          return incident.reportedAt ?? incident.timestamp;
        case 'occurrenceAt':
          return incident.occurrenceAt ?? incident.timestamp;
        case 'type':
          return incident.type;
        case 'severity':
          return incident.severity;
        case 'status':
          return incident.status;
        default:
          return undefined;
      }
    };

    return [...incidents].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);

      if (!aValue && !bValue) {
        return 0;
      }

      if (!aValue) {
        return sortDirection === 'asc' ? 1 : -1;
      }

      if (!bValue) {
        return sortDirection === 'asc' ? -1 : 1;
      }

      const aDate = Date.parse(String(aValue));
      const bDate = Date.parse(String(bValue));
      if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
        return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [incidents, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedIncidents.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidents = sortedIncidents.slice(startIndex, startIndex + itemsPerPage);

  const locationCounts = useMemo(() => {
    return incidents.reduce<Record<string, number>>((acc, incident) => {
      const key = `${incident.location.lat},${incident.location.lng}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [incidents]);

  const getRecurrenceCount = (incident: Incident) => {
    const key = `${incident.location.lat},${incident.location.lng}`;
    return locationCounts[key] ?? 1;
  };

  const exportToCSV = () => {
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

    const rows = sortedIncidents.map((incident) => [
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
    link.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return null;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1 inline" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 inline" />
    );
  };

  const showEmptyState = !isLoading && !isError && incidents.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{incidents.length.toLocaleString()}</span>{' '}
          incidents loaded
          {totalCount > incidents.length && <span> (of {totalCount.toLocaleString()} total)</span>}
        </div>
        <Button onClick={exportToCSV} className="gap-2" disabled={incidents.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="relative border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('id')}
              >
                Incident <SortIcon field="id" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('status')}
              >
                Status <SortIcon field="status" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('severity')}
              >
                Severity <SortIcon field="severity" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('type')}
              >
                Type <SortIcon field="type" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('reportedAt')}
              >
                Reported <SortIcon field="reportedAt" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('occurrenceAt')}
              >
                Occurrence <SortIcon field="occurrenceAt" />
              </TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Recurrence</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIncidents.map((incident) => {
              const recurrence = getRecurrenceCount(incident);
              return (
                <TableRow key={incident.id}>
                  <TableCell>{incident.id}</TableCell>
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
                  <TableCell className="max-w-sm truncate" title={incident.location.address}>
                    {incident.location.address}
                  </TableCell>
                  <TableCell>
                    {recurrence > 1 && <Badge variant="outline">{recurrence}×</Badge>}
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

        {(isLoading || isError || showEmptyState) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/85 backdrop-blur-sm">
            <Card className="p-6 text-center space-y-3 shadow-md max-w-sm">
              {isLoading && (
                <>
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
                  <p className="font-medium">Loading incidents…</p>
                </>
              )}
              {isError && !isLoading && (
                <>
                  <AlertTriangle className="h-6 w-6 text-destructive mx-auto" />
                  <p className="font-medium text-destructive">
                    {error ?? 'Unable to load incidents.'}
                  </p>
                  <Button variant="outline" className="gap-2" onClick={onRetry}>
                    <RefreshCw className="h-4 w-4" /> Retry
                  </Button>
                </>
              )}
              {showEmptyState && !isLoading && !isError && (
                <>
                  <p className="font-medium">No incidents match the filters.</p>
                  <p className="text-sm text-muted-foreground">
                    Try widening the date range or clearing the filters.
                  </p>
                </>
              )}
            </Card>
          </div>
        )}
      </div>

      {sortedIncidents.length > 0 && (
        <>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  className={
                    currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                const page = index + 1;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  size="sm"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  className={
                    currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="text-sm text-muted-foreground text-center">
            Showing {startIndex + 1} – {Math.min(startIndex + itemsPerPage, sortedIncidents.length)}{' '}
            of {sortedIncidents.length} incidents
          </div>
        </>
      )}
    </div>
  );
}
