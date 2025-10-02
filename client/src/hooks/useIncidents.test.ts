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
      pagination: { page: 1, pageSize: 25, total: 1 },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useIncidents());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.incidents).toHaveLength(1);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
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
            pagination: { page: 1, pageSize: 25, total: 1 },
          }),
      });

    const { result } = renderHook(() => useIncidents());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
    expect(result.current.incidents).toHaveLength(0);
    expect(result.current.error).toBeDefined();

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(result.current.incidents).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
