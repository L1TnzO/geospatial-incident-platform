import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentListResponse } from '@/types/incidents';
import { useIncidents } from './useIncidents';

const buildIncident = (overrides: Partial<IncidentListResponse['data'][number]> = {}) => ({
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
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [-73.9857, 40.7484] as [number, number],
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

describe('useIncidents', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('fetches incidents successfully and exposes data', async () => {
    const mockResponse: IncidentListResponse = {
      data: [buildIncident()],
      pagination: {
        page: 1,
        pageSize: 25,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useIncidents());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.incidents).toHaveLength(1);
    expect(result.current.renderedCount).toBe(1);
    expect(result.current.totalCount).toBe(1);
    expect(result.current.remainder).toBe(0);
    expect(result.current.pagination).toEqual(mockResponse.pagination);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const fetchCalls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(String(fetchCalls[0]?.[0])).toContain('pageSize=100');
    expect(String(fetchCalls[0]?.[0])).toContain('page=1');
  });

  it('handles fetch errors and exposes retry handler', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [buildIncident({ incidentNumber: 'INC-002' })],
            pagination: {
              page: 1,
              pageSize: 25,
              total: 1,
              totalPages: 1,
              hasNext: false,
              hasPrevious: false,
              sortBy: 'reportedAt',
              sortDirection: 'desc',
            },
          }),
      });

    const { result } = renderHook(() => useIncidents());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.incidents).toHaveLength(0);
    expect(result.current.renderedCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.remainder).toBe(0);
    expect(result.current.error).toBeDefined();

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.incidents).toHaveLength(1);
    expect(result.current.remainder).toBe(0);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const retryCalls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(String(retryCalls[0]?.[0])).toContain('pageSize=100');
    expect(String(retryCalls[1]?.[0])).toContain('pageSize=100');
  });

  it('caps incidents at 5,000 and reports remainder', async () => {
    const firstPage: IncidentListResponse = {
      data: Array.from({ length: 100 }, (_, index) =>
        buildIncident({ incidentNumber: `INC-${index.toString().padStart(4, '0')}` })
      ),
      pagination: {
        page: 1,
        pageSize: 100,
        total: 5200,
        totalPages: 52,
        hasNext: true,
        hasPrevious: false,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      },
    };

    const remainingIncidents = Array.from({ length: 4900 }, (_, index) =>
      buildIncident({ incidentNumber: `INC-${(index + 100).toString().padStart(4, '0')}` })
    );

    const secondPage: IncidentListResponse = {
      data: remainingIncidents,
      pagination: {
        page: 2,
        pageSize: 100,
        total: 5200,
        totalPages: 52,
        hasNext: false,
        hasPrevious: true,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      },
    };

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(firstPage),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(secondPage),
      }) as unknown as typeof fetch;

    const { result } = renderHook(() => useIncidents());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.incidents).toHaveLength(5000);
    expect(result.current.renderedCount).toBe(5000);
    expect(result.current.totalCount).toBe(5200);
    expect(result.current.remainder).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(String(calls[0]?.[0])).toContain('page=1');
    expect(String(calls[1]?.[0])).toContain('page=2');
  });
});
