import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IncidentListResponse } from '@/types/incidents';
import type { StationListResponse } from '@/types/stations';
import { resetIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { resetMapPreferencesStore } from '@/store/useMapPreferencesStore';

vi.mock('@/lib/leaflet', () => ({ leaflet: {} }));

vi.mock('react-leaflet', async () => {
  const React = await import('react');
  return {
    __esModule: true,
    MapContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'map' }, children),
    TileLayer: () => React.createElement('div', { 'data-testid': 'tile-layer' }),
  };
});

vi.mock('./StationLayer', async () => {
  const React = await import('react');
  return {
    __esModule: true,
    default: ({
      stations,
      isVisible,
    }: {
      stations: StationListResponse['data'];
      isVisible: boolean;
    }) =>
      React.createElement('div', {
        'data-testid': 'station-layer',
        'data-visible': String(isVisible),
        'data-count': stations.length,
      }),
  };
});

vi.mock('./IncidentClusterLayer', async () => {
  const React = await import('react');
  const { useIncidentDetailStore } = await import('@/store/useIncidentDetailStore');
  const module = await import('./IncidentPopup');
  const IncidentPopup = module.default;

  const IncidentClusterLayerMock = ({ incidents }: { incidents: IncidentListResponse['data'] }) => {
    const openIncident = useIncidentDetailStore((state) => state.openIncident);
    return React.createElement(
      'div',
      { 'data-testid': 'incident-layer' },
      incidents.map((incident) =>
        React.createElement(IncidentPopup, {
          key: incident.incidentNumber,
          incident,
          onViewDetails: openIncident,
        })
      )
    );
  };

  IncidentClusterLayerMock.displayName = 'IncidentClusterLayerMock';

  return {
    __esModule: true,
    default: IncidentClusterLayerMock,
  };
});

import MapView from './MapView';

const buildIncidentResponse = (): IncidentListResponse => ({
  data: [
    {
      incidentNumber: 'INC-TEST-42',
      title: 'Downtown Structure Fire',
      externalReference: null,
      occurrenceAt: '2025-09-20T10:00:00Z',
      reportedAt: '2025-09-20T10:03:00Z',
      dispatchAt: '2025-09-20T10:05:00Z',
      arrivalAt: '2025-09-20T10:12:00Z',
      resolvedAt: null,
      isActive: true,
      casualtyCount: 0,
      responderInjuries: 0,
      estimatedDamageAmount: null,
      locationGeohash: '9q8yy',
      location: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.409, 37.771],
        },
        properties: {},
      },
      type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
      severity: {
        code: 'CRITICAL',
        name: 'Critical',
        description: null,
        priority: 4,
        colorHex: '#F57C00',
      },
      status: { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
      source: { code: '911', name: 'Emergency Call', description: null },
      weather: { code: 'CLEAR', name: 'Clear', description: null },
      primaryStation: { stationCode: 'ST-901', name: 'Station 901' },
    },
  ],
  pagination: { page: 1, pageSize: 25, total: 1 },
});

const buildStationResponse = (): StationListResponse => ({
  data: [
    {
      stationCode: 'ST-901',
      name: 'Station 901',
      battalion: 'B1',
      phone: '555-0100',
      address: {
        line1: '1 Firehouse Plaza',
        city: 'Metropolis',
        region: 'CA',
        postalCode: '94101',
      },
      isActive: true,
      commissionedOn: '1995-06-01T00:00:00Z',
      decommissionedOn: null,
      coverageRadiusMeters: 4800,
      location: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.41, 37.77],
        },
        properties: {},
      },
      responseZone: {
        zoneCode: 'ZONE-1',
        name: 'Central Response Zone',
        boundary: {
          type: 'Feature',
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [-122.52, 37.7],
                  [-122.35, 37.7],
                  [-122.35, 37.83],
                  [-122.52, 37.83],
                  [-122.52, 37.7],
                ],
              ],
            ],
          },
          properties: {},
        },
      },
    },
  ],
});

describe('MapView integration', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    const incidents = buildIncidentResponse();
    const stations = buildStationResponse();

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (!url) {
        throw new Error('Request URL missing');
      }

      if (url.includes('/api/incidents')) {
        return {
          ok: true,
          json: async () => incidents,
        } as Response;
      }

      if (url.includes('/api/stations')) {
        return {
          ok: true,
          json: async () => stations,
        } as Response;
      }

      throw new Error(`Unhandled fetch call: ${url}`);
    }) as unknown as typeof fetch;

    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      resetIncidentDetailStore();
      resetMapPreferencesStore();
    });
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders incidents and stations from API responses and opens detail modal', async () => {
    render(<MapView />);

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(2));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/incidents'),
      expect.objectContaining({ method: 'GET' })
    );
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/stations'),
      expect.objectContaining({ method: 'GET' })
    );

    expect(await screen.findByTestId('map')).toBeInTheDocument();
    expect(screen.getByTestId('incident-layer')).toBeInTheDocument();
    const stationLayer = screen.getByTestId('station-layer');
    expect(stationLayer).toHaveAttribute('data-count', '1');
    expect(stationLayer).toHaveAttribute('data-visible', 'true');

    await waitFor(() => expect(screen.queryByText(/Loading incidents/i)).not.toBeInTheDocument());
    expect(screen.getByText('Downtown Structure Fire')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    });

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Incident details');
    expect(dialog).toHaveTextContent('INC-TEST-42');
  });
});
