import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetIncidentDetailStore, useIncidentDetailStore } from './useIncidentDetailStore';
import type { IncidentDetail, IncidentListItem } from '@/types/incidents';

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-200',
  title: 'Cache Test',
  occurrenceAt: new Date().toISOString(),
  reportedAt: new Date().toISOString(),
  dispatchAt: null,
  arrivalAt: null,
  resolvedAt: null,
  isActive: true,
  casualtyCount: 0,
  responderInjuries: 0,
  estimatedDamageAmount: null,
  location: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-74, 40.7] },
    properties: {},
  },
  locationGeohash: null,
  externalReference: null,
  type: { code: 'FIRE', name: 'Fire', description: null },
  severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
  status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
  source: null,
  weather: null,
  primaryStation: null,
  ...overrides,
});

const buildDetail = (
  incident: IncidentListItem,
  overrides: Partial<IncidentDetail> = {}
): IncidentDetail => ({
  ...incident,
  narrative: 'Initial narrative',
  metadata: {},
  units: [],
  assets: [],
  notes: [],
  ...overrides,
});

const jsonResponse = (data: unknown, init: ResponseInit = {}): Response => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return new Response(JSON.stringify(data), {
    ...init,
    status: init.status ?? 200,
    headers,
  });
};

const mockFetch = (
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) => {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('useIncidentDetailStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    act(() => {
      resetIncidentDetailStore();
    });
  });

  it('caches incident detail after first fetch', async () => {
    const incident = buildIncident();
    const detail = buildDetail(incident);
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(detail)));

    await act(async () => {
      useIncidentDetailStore.getState().openIncident(incident);
      await waitFor(() =>
        expect(useIncidentDetailStore.getState().detailCache[incident.incidentNumber]).toEqual(
          detail
        )
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      useIncidentDetailStore.getState().openIncident(incident);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshIncidentDetail forces a refetch', async () => {
    const incident = buildIncident();
    const initialDetail = buildDetail(incident, { narrative: 'Initial narrative' });
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse(initialDetail)));

    await act(async () => {
      useIncidentDetailStore.getState().openIncident(incident);
      await waitFor(() =>
        expect(useIncidentDetailStore.getState().detailCache[incident.incidentNumber]).toEqual(
          initialDetail
        )
      );
    });

    const updatedDetail = buildDetail(incident, { narrative: 'Updated narrative' });
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(updatedDetail)));

    await act(async () => {
      useIncidentDetailStore.getState().refreshIncidentDetail(incident.incidentNumber);
      await waitFor(() =>
        expect(useIncidentDetailStore.getState().detailCache[incident.incidentNumber]).toEqual(
          updatedDetail
        )
      );
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
