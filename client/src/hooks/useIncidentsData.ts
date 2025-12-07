import { useEffect, useState, useMemo } from 'react';
import type { FetchIncidentsParams } from '../services/api-client';
import type { LiteIncident } from '../types';
import { incidentRepository } from '../services/IncidentRepository';

export interface IncidentsDataResult {
  incidents: LiteIncident[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  targetLimit: number; // Kept for interface compatibility, mostly relevant for rendering
  totalCount: number;
  renderedCount: number;
  remainder: number;
}

import type { PaginationMeta } from '../types/api/incidents';

export interface IncidentsTableDataResult {
  incidents: LiteIncident[];
  pagination?: PaginationMeta;
  totalCount: number;
  remainder: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isFetching: boolean;
  isRefetching: boolean;
  isError: boolean;
  error?: string;
  refresh: () => void;
  lastUpdated?: Date;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const useIncidentsTableData = (params: FetchIncidentsParams): IncidentsTableDataResult => {
  const { page = 1, pageSize = 20, isActive } = params;

  // Reuse the base data hook logic (or direct repo access)
  // We'll reuse the same pattern as useIncidentsData but add pagination
  const [data, setData] = useState<LiteIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Derived filtered data
  const filteredAll = useMemo(() => {
    return incidentRepository.getQuery({
      startDate: params.startDate,
      endDate: params.endDate,
      isActive: isActive
    });
  }, [data, params.startDate, params.endDate, isActive]);

  // Client-side Sort
  const sortedData = useMemo(() => {
    if (!params.sortBy) return filteredAll;

    const sorted = [...filteredAll].sort((a, b) => {
      let valA = a[params.sortBy as keyof LiteIncident];
      let valB = b[params.sortBy as keyof LiteIncident];

      // Handle parsing if needed (e.g. dates)
      if (params.sortBy === 'date' || params.sortBy === 'reportedAt') {
        return new Date(valA as string).getTime() - new Date(valB as string).getTime();
      }

      if (valA === valB) return 0;
      return (valA ?? '') > (valB ?? '') ? 1 : -1;
    });

    return params.sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [filteredAll, params.sortBy, params.sortDirection]);

  // Client-side Pagination
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, page, pageSize]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await incidentRepository.initialize();
      setData(incidentRepository.getIncidents());

      void incidentRepository.sync().catch(console.error);
      setIsLoading(false);
    };
    void load();
    const unsubscribe = incidentRepository.subscribe(() => {
      setData(incidentRepository.getIncidents());
    });
    return () => unsubscribe();
  }, []);

  const totalCount = sortedData.length;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    incidents: paginatedData,
    pagination: {
      page,
      pageSize,
      total: totalCount,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
      sortBy: params.sortBy || undefined,
      sortDirection: params.sortDirection || undefined
    },
    totalCount,
    remainder: 0,
    page,
    pageSize,
    isLoading,
    isFetching: false,
    isRefetching: false,
    isError: false,
    refresh: () => void incidentRepository.sync(),
    hasNext: page < totalPages,
    hasPrevious: page > 1
  };
};

export const useIncidentsData = (params: FetchIncidentsParams): IncidentsDataResult => {
  const [data, setData] = useState<LiteIncident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtering Logic
  // We use useMemo to filter the data derived from the repository
  const filteredData = useMemo(() => {
    return incidentRepository.getQuery({
      startDate: params.startDate,
      endDate: params.endDate,
      isActive: params.isActive
    });
  }, [data, params.startDate, params.endDate, params.isActive]);

  // Subscribe to Repository
  useEffect(() => {
    // Initial Load & Subscribe
    const load = async () => {
      setIsLoading(true);
      await incidentRepository.initialize(); // Ensure cached data is loaded
      setData(incidentRepository.getIncidents()); // Set initial data

      // Trigger background sync
      void incidentRepository.sync().catch(err => console.error('Background sync failed', err));

      setIsLoading(false);
    };

    void load();

    const unsubscribe = incidentRepository.subscribe(() => {
      // When repo updates, update our local state
      setData(incidentRepository.getIncidents());
    });

    return () => unsubscribe();
  }, []);

  const refresh = () => {
    void incidentRepository.sync();
  };

  // Compatibility Calculations
  const targetLimit = params.renderLimit ?? filteredData.length;
  const slicedData = filteredData.slice(0, targetLimit);

  return {
    incidents: slicedData,
    isLoading, // Only true during initial IDB load
    isFetching: false, // We don't really expose the sync state here yet, could add it
    isError: false,
    refresh,
    targetLimit,
    totalCount: filteredData.length,
    renderedCount: slicedData.length,
    remainder: Math.max(0, filteredData.length - slicedData.length)
  };
};
