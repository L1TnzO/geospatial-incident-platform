import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StationListResponse } from '@/types/stations';
import { useStations } from './useStations';

const buildStation = (overrides: Partial<StationListResponse['data'][number]> = {}) => ({
  stationCode: 'ST-001',
  name: 'Central Station',
  battalion: 'B1',
  phone: '555-0100',
  address: {
    line1: '123 Main St',
    city: 'Metropolis',
    region: 'NY',
    postalCode: '10001',
  },
  isActive: true,
  commissionedOn: '1990-01-01T00:00:00Z',
  decommissionedOn: null,
  coverageRadiusMeters: 5000,
  location: {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [-73.99, 40.75] as [number, number],
    },
    properties: {},
  },
  responseZone: null,
  ...overrides,
});

describe('useStations', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('fetches stations successfully with active filter by default', async () => {
    const response: StationListResponse = {
      data: [buildStation()],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(response),
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useStations());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(false);
    expect(result.current.stations).toHaveLength(1);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const callArgs = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock
      .calls[0];
    expect(String(callArgs?.[0])).toContain('isActive=true');
  });

  it('handles fetch errors and exposes refresh handler', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [buildStation({ stationCode: 'ST-002' })] }),
      }) as unknown as typeof fetch;

    const { result } = renderHook(() => useStations({ isActive: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.stations).toHaveLength(0);

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.stations).toHaveLength(1);
    const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(String(calls[0]?.[0])).toContain('isActive=false');
    expect(String(calls[1]?.[0])).toContain('isActive=false');
  });
});
