import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentListItem } from '@/types/incidents';
import type { IncidentTableResult } from '@/services/incidentsTableService';
import { INCIDENT_TABLE_FILTERS_STORAGE_KEY, useIncidentTableData } from './useIncidentTableData';

const fetchIncidentTableDataMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/incidentsTableService', async () => {
  const actual = await vi.importActual<typeof import('@/services/incidentsTableService')>(
    '@/services/incidentsTableService'
  );
  return {
    ...actual,
    fetchIncidentTableData: fetchIncidentTableDataMock,
  };
});

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-001',
  title: 'Test Incident',
  externalReference: null,
  occurrenceAt: new Date().toISOString(),
  reportedAt: new Date().toISOString(),
  dispatchAt: null,
  arrivalAt: null,
  resolvedAt: null,
  isActive: true,
  casualtyCount: 0,
  responderInjuries: 0,
  estimatedDamageAmount: null,
  locationGeohash: null,
  location: {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-73.9857, 40.7484],
    },
    properties: {},
  },
  type: { code: 'FIRE', name: 'Fire', description: null },
  severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
  status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
  source: null,
  weather: null,
  primaryStation: null,
  ...overrides,
});

const buildResult = (overrides: Partial<IncidentTableResult> = {}): IncidentTableResult => ({
  rows: [buildIncident()],
  pagination: {
    page: 1,
    pageSize: 25,
    total: 50,
    totalPages: 2,
    hasNext: true,
    hasPrevious: false,
    sortBy: 'reportedAt',
    sortDirection: 'desc',
    remainder: 25,
    nextPage: 2,
    previousPage: null,
  },
  ...overrides,
});

describe('useIncidentTableData', () => {
  beforeEach(() => {
    fetchIncidentTableDataMock.mockReset();
    fetchIncidentTableDataMock.mockResolvedValue(buildResult());
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.clear();
    }
  });

  it('fetches data on mount and exposes pagination helpers', async () => {
    const { result } = renderHook(() => useIncidentTableData());

    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.remainder).toBe(25);
    expect(result.current.nextPage).toBe(2);
    expect(result.current.previousPage).toBeNull();
    expect(result.current.totalPages).toBe(2);
    expect(result.current.total).toBe(50);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(fetchIncidentTableDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 25,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
        isActive: true,
      })
    );
  });

  it('handles errors and recovers on refresh', async () => {
    const failure = new Error('network');
    const success = buildResult({
      rows: [buildIncident({ incidentNumber: 'INC-002' })],
      pagination: {
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
        remainder: 0,
        nextPage: null,
        previousPage: null,
      },
    });

    fetchIncidentTableDataMock.mockRejectedValueOnce(failure);
    fetchIncidentTableDataMock.mockResolvedValueOnce(success);

    const { result } = renderHook(() => useIncidentTableData());

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.rows).toHaveLength(0);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.remainder).toBe(0);
  });

  it('updates filters through setters and triggers refetches', async () => {
    const { result } = renderHook(() => useIncidentTableData());

    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setPage(3);
    });

    await waitFor(() => expect(result.current.filters.page).toBe(3));
    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(2));
    expect(fetchIncidentTableDataMock.mock.calls[1]?.[0]).toMatchObject({ page: 3 });

    await act(async () => {
      result.current.setPage(-4);
    });

    await waitFor(() => expect(result.current.filters.page).toBe(1));
    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(3));

    await act(async () => {
      result.current.setPageSize(200);
    });

    await waitFor(() => expect(result.current.filters.pageSize).toBe(100));
    await waitFor(() => expect(result.current.filters.page).toBe(1));
    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(4));
    expect(fetchIncidentTableDataMock.mock.calls[3]?.[0]).toMatchObject({ pageSize: 100, page: 1 });

    await act(async () => {
      result.current.setFilters({ severityCodes: ['HIGH'], sortDirection: 'asc' });
    });

    await waitFor(() => expect(result.current.filters.severityCodes).toEqual(['HIGH']));
    await waitFor(() => expect(result.current.filters.sortDirection).toBe('asc'));
    await waitFor(() => expect(result.current.filters.page).toBe(1));
    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(5));
    expect(fetchIncidentTableDataMock.mock.calls[4]?.[0]).toMatchObject({
      severityCodes: ['HIGH'],
      sortDirection: 'asc',
      page: 1,
    });
  });

  it('rehydrates filters from localStorage when available', async () => {
    const storedPayload = {
      version: 1,
      filters: {
        page: 3,
        pageSize: 50,
        sortBy: 'occurrenceAt',
        sortDirection: 'asc',
        severityCodes: ['HIGH', 'LOW'],
        statusCodes: ['OPEN'],
        startDate: '2025-01-01T00:00:00.000Z',
        endDate: '2025-01-15T23:59:59.999Z',
        isActive: false,
      },
    };

    window.localStorage.setItem(INCIDENT_TABLE_FILTERS_STORAGE_KEY, JSON.stringify(storedPayload));

    const { result } = renderHook(() => useIncidentTableData());

    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(1));
    expect(result.current.filters.page).toBe(3);
    expect(result.current.filters.pageSize).toBe(50);
    expect(result.current.filters.sortBy).toBe('occurrenceAt');
    expect(result.current.filters.sortDirection).toBe('asc');
    expect(result.current.filters.severityCodes).toEqual(['HIGH', 'LOW']);
    expect(result.current.filters.statusCodes).toEqual(['OPEN']);
    expect(result.current.filters.startDate).toBe('2025-01-01T00:00:00.000Z');
    expect(result.current.filters.endDate).toBe('2025-01-15T23:59:59.999Z');
    expect(result.current.filters.isActive).toBe(false);
  });

  it('persists filters to localStorage when they change', async () => {
    const { result } = renderHook(() => useIncidentTableData());

    await waitFor(() => expect(fetchIncidentTableDataMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setFilters({ severityCodes: ['CRITICAL'], pageSize: 40 });
    });

    await waitFor(() => {
      const raw = window.localStorage.getItem(INCIDENT_TABLE_FILTERS_STORAGE_KEY);
      expect(raw).not.toBeNull();
      if (!raw) {
        throw new Error('missing storage payload');
      }

      const payload = JSON.parse(raw) as { filters?: Record<string, unknown> };
      expect(payload.filters?.severityCodes).toEqual(['CRITICAL']);
      expect(payload.filters?.pageSize).toBe(40);
      expect(payload.filters?.page).toBe(1);
    });
  });
});
