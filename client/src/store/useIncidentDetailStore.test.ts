import { act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

let useIncidentDetailStore: typeof import('./useIncidentDetailStore').useIncidentDetailStore;
let resetIncidentDetailStore: typeof import('./useIncidentDetailStore').resetIncidentDetailStore;
let INCIDENT_DETAIL_CACHE_STORAGE_KEY: typeof import('./useIncidentDetailStore').INCIDENT_DETAIL_CACHE_STORAGE_KEY;

const importStore = async () => {
  const module = await import('./useIncidentDetailStore');
  useIncidentDetailStore = module.useIncidentDetailStore;
  resetIncidentDetailStore = module.resetIncidentDetailStore;
  INCIDENT_DETAIL_CACHE_STORAGE_KEY = module.INCIDENT_DETAIL_CACHE_STORAGE_KEY;
};

describe('useIncidentDetailStore', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      window.localStorage.clear();
    }
    await importStore();
  });

  afterEach(() => {
    act(() => {
      resetIncidentDetailStore({ clearStorage: true });
    });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('caches incident detail after first fetch and persists to storage', async () => {
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

    const persisted = window.localStorage.getItem(INCIDENT_DETAIL_CACHE_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    if (persisted) {
      const payload = JSON.parse(persisted) as {
        entries?: Array<{ incidentNumber: string }>;
      };
      expect(payload.entries).toEqual([
        expect.objectContaining({ incidentNumber: incident.incidentNumber }),
      ]);
    }
  });

  it('refreshIncidentDetail forces a refetch and updates persisted cache', async () => {
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

    const persisted = window.localStorage.getItem(INCIDENT_DETAIL_CACHE_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    if (persisted) {
      const payload = JSON.parse(persisted) as {
        entries?: Array<{ incidentNumber: string; detail?: { narrative?: string } }>;
      };
      expect(payload.entries?.[0]?.detail?.narrative).toBe('Updated narrative');
    }
  });

  it('rehydrates detail cache from localStorage on initialization', async () => {
    const incident = buildIncident({ incidentNumber: 'INC-999', title: 'Persisted Incident' });
    const detail = buildDetail(incident, { narrative: 'Persisted narrative' });

    window.localStorage.setItem(
      INCIDENT_DETAIL_CACHE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        entries: [{ incidentNumber: incident.incidentNumber, detail }],
      })
    );

    vi.resetModules();
    await importStore();

    const state = useIncidentDetailStore.getState();
    expect(state.detailCache[incident.incidentNumber]).toEqual(detail);
    expect(state.detailCacheOrder).toEqual([incident.incidentNumber]);
  });

  it('evicts the oldest cache entries when the limit is exceeded', async () => {
    const incidents = Array.from({ length: 26 }, (_, index) =>
      buildIncident({ incidentNumber: `INC-${index + 1}`, title: `Incident ${index + 1}` })
    );

    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse({}))); // will be overridden

    incidents.forEach((incident, index) => {
      const detail = buildDetail(incident, { narrative: `Detail ${index + 1}` });
      fetchMock.mockImplementationOnce(() => Promise.resolve(jsonResponse(detail)));
    });

    for (const incident of incidents) {
      await act(async () => {
        useIncidentDetailStore.getState().openIncident(incident);
        await waitFor(() =>
          expect(
            useIncidentDetailStore.getState().detailCache[incident.incidentNumber]
          ).toBeDefined()
        );
      });
    }

    const state = useIncidentDetailStore.getState();
    expect(Object.keys(state.detailCache)).toHaveLength(25);
    expect(state.detailCache['INC-1']).toBeUndefined();
    expect(state.detailCacheOrder[0]).toBe('INC-2');

    const persisted = window.localStorage.getItem(INCIDENT_DETAIL_CACHE_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    if (persisted) {
      const payload = JSON.parse(persisted) as {
        entries?: Array<{ incidentNumber: string }>;
      };
      expect(payload.entries).toHaveLength(25);
      expect(payload.entries?.some((entry) => entry.incidentNumber === 'INC-1')).toBe(false);
    }

    expect(fetchMock).toHaveBeenCalledTimes(26);
  });
});
