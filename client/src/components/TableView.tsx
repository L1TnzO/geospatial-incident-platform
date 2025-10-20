import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Incident } from '../types';
import { ChevronUp, ChevronDown, Download } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';

interface TableViewProps {
  incidents: Incident[];
  onIncidentClick: (incident: Incident) => void;
}

type SortField = 'id' | 'date' | 'type' | 'severity' | 'responseTime';
type SortDirection = 'asc' | 'desc';

export function TableView({ incidents, onIncidentClick }: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortValue = (incident: Incident, field: SortField): string | number | undefined => {
    switch (field) {
      case 'id':
        return incident.id;
      case 'date':
        return new Date(incident.timestamp).getTime();
      case 'type':
        return incident.type;
      case 'severity':
        return incident.severity;
      case 'responseTime':
        return incident.responseTime;
      default:
        return undefined;
    }
  };

  const sortedIncidents = [...incidents].sort((a, b) => {
    const aValue = getSortValue(a, sortField);
    const bValue = getSortValue(b, sortField);

    if (aValue === undefined && bValue === undefined) {
      return 0;
    }

    if (aValue === undefined) {
      return sortDirection === 'asc' ? 1 : -1;
    }

    if (bValue === undefined) {
      return sortDirection === 'asc' ? -1 : 1;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const comparison = String(aValue).localeCompare(String(bValue));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedIncidents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedIncidents = sortedIncidents.slice(startIndex, startIndex + itemsPerPage);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'default';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'outline';
      default:
        return 'default';
    }
  };

  const exportToCSV = () => {
    const headers = [
      'ID',
      'Type',
      'Severity',
      'Date',
      'Location',
      'Description',
      'Response Time',
      'Status',
    ];
    const rows = sortedIncidents.map((inc) => [
      inc.id,
      inc.type,
      inc.severity,
      inc.date,
      inc.location.address,
      inc.description,
      inc.responseTime || 'N/A',
      inc.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 ml-1 inline" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1 inline" />
    );
  };

  // Count incidents per location
  const locationCounts = incidents.reduce(
    (acc, inc) => {
      const key = `${inc.location.lat},${inc.location.lng}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const getRecurrenceCount = (incident: Incident) => {
    const key = `${incident.location.lat},${incident.location.lng}`;
    return locationCounts[key] || 1;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={exportToCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('id')}
              >
                ID <SortIcon field="id" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('type')}
              >
                Type <SortIcon field="type" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('severity')}
              >
                Severity <SortIcon field="severity" />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('date')}
              >
                Date <SortIcon field="date" />
              </TableHead>
              <TableHead>Location</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('responseTime')}
              >
                Response Time <SortIcon field="responseTime" />
              </TableHead>
              <TableHead>Recurrence</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIncidents.map((incident) => (
              <TableRow key={incident.id}>
                <TableCell>{incident.id}</TableCell>
                <TableCell>{incident.type}</TableCell>
                <TableCell>
                  <Badge variant={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                </TableCell>
                <TableCell>{incident.date}</TableCell>
                <TableCell className="max-w-xs truncate">{incident.location.address}</TableCell>
                <TableCell>
                  {incident.responseTime ? `${incident.responseTime} min` : 'N/A'}
                </TableCell>
                <TableCell>
                  {getRecurrenceCount(incident) > 1 && (
                    <Badge variant="outline">{getRecurrenceCount(incident)}x</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onIncidentClick(incident)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={
                  currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <div className="text-sm text-muted-foreground text-center">
        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedIncidents.length)} of{' '}
        {sortedIncidents.length} incidents
      </div>
    </div>
  );
}
