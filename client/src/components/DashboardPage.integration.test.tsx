import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import DashboardPage from '@/pages/DashboardPage';
import type {
  IncidentDetail,
  IncidentListItem,
  IncidentListResponse,
  IncidentMetadata,
} from '@/types/incidents';
import type { StationListResponse } from '@/types/stations';
import { resetIncidentDetailStore, useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { useMapStore } from '@/store/useMapStore';
import { resetMapPreferencesStore } from '@/store/useMapPreferencesStore';
import { clearIncidentMetadataCache } from '@/services/incidentsMetaService';

vi.mock('@/lib/leaflet', () => ({ leaflet: {} }));

const setViewMock = vi.fn();

vi.mock('react-leaflet', async () => {
  const React = await import('react');
  return {
    __esModule: true,
    MapContainer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'map' }, children),
    TileLayer: () => React.createElement('div', { 'data-testid': 'tile-layer' }),
    useMap: () => ({ setView: setViewMock }),
  };
});

vi.mock('@/components/IncidentClusterLayer', async () => {
  const React = await import('react');
  const module = await import('@/components/IncidentPopup');
  const IncidentPopup = module.default;
  const { useIncidentDetailStore: detailStore } = await import('@/store/useIncidentDetailStore');

  const MockLayer = ({ incidents }: { incidents: IncidentListItem[] }) => {
    const openIncident = detailStore((state) => state.openIncident);
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

  MockLayer.displayName = 'IncidentClusterLayerMock';
  return {
    __esModule: true,
    default: MockLayer,
  };
});

vi.mock('@/components/StationLayer', async () => {
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

const INCIDENTS: IncidentListItem[] = [
  {
    incidentNumber: 'INC-100',
    title: 'Uptown Electrical Fire',
    externalReference: null,
    occurrenceAt: '2025-01-05T09:15:00Z',
    reportedAt: '2025-01-05T09:18:00Z',
    dispatchAt: '2025-01-05T09:20:00Z',
    arrivalAt: '2025-01-05T09:28:00Z',
    resolvedAt: null,
    isActive: true,
    casualtyCount: 0,
    responderInjuries: 0,
    estimatedDamageAmount: null,
    locationGeohash: null,
    location: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.41, 37.79] },
      properties: {},
    },
    type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
    severity: {
      code: 'MODERATE',
      name: 'Moderate',
      description: null,
      priority: 2,
      colorHex: '#f59e0b',
    },
    status: { code: 'REPORTED', name: 'Reported', description: null, isTerminal: false },
    source: null,
    weather: null,
    primaryStation: { stationCode: 'ST-101', name: 'Station 101' },
  },
  {
    incidentNumber: 'INC-200',
    title: 'Warehouse Fire',
    externalReference: null,
    occurrenceAt: '2025-01-08T12:00:00Z',
    reportedAt: '2025-01-08T12:04:00Z',
    dispatchAt: '2025-01-08T12:06:00Z',
    arrivalAt: '2025-01-08T12:14:00Z',
    resolvedAt: null,
    isActive: true,
    casualtyCount: 0,
    responderInjuries: 0,
    estimatedDamageAmount: null,
    locationGeohash: null,
    location: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.4, 37.78] },
      properties: {},
    },
    type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
    severity: {
      code: 'CRITICAL',
      name: 'Critical',
      description: null,
      priority: 4,
      colorHex: '#dc2626',
    },
    status: { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
    source: null,
    weather: null,
    primaryStation: { stationCode: 'ST-102', name: 'Station 102' },
  },
  {
    incidentNumber: 'INC-300',
    title: 'Hazmat Spill',
    externalReference: null,
    occurrenceAt: '2025-01-10T16:20:00Z',
    reportedAt: '2025-01-10T16:24:00Z',
    dispatchAt: '2025-01-10T16:26:00Z',
    arrivalAt: '2025-01-10T16:40:00Z',
    resolvedAt: null,
    isActive: true,
    casualtyCount: 1,
    responderInjuries: 0,
    estimatedDamageAmount: null,
    locationGeohash: null,
    location: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.39, 37.76] },
      properties: {},
    },
    type: { code: 'HAZMAT', name: 'Hazmat', description: null },
    severity: {
      code: 'CRITICAL',
      name: 'Critical',
      description: null,
      priority: 4,
      colorHex: '#b91c1c',
    },
    status: { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
    source: null,
    weather: null,
    primaryStation: { stationCode: 'ST-103', name: 'Station 103' },
  },
];

const INCIDENT_DETAIL: Record<string, IncidentDetail> = Object.fromEntries(
  INCIDENTS.map((incident) => [
    incident.incidentNumber,
    {
      ...incident,
      narrative: null,
      metadata: { source: 'msw' },
      units: [],
      assets: [],
      notes: [],
    },
  ])
);

const INCIDENT_METADATA: IncidentMetadata = {
  types: [
    { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
    { code: 'HAZMAT', name: 'Hazardous Materials', description: null },
  ],
  severities: [
    { code: 'CRITICAL', name: 'Critical', description: null, priority: 4, colorHex: '#dc2626' },
    { code: 'MODERATE', name: 'Moderate', description: null, priority: 2, colorHex: '#f59e0b' },
  ],
  statuses: [
    { code: 'REPORTED', name: 'Reported', description: null, isTerminal: false },
    { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
  ],
  occurrenceRange: { start: '2025-01-01T00:00:00Z', end: '2025-01-31T23:59:59Z' },
  reportedRange: { start: '2025-01-01T00:00:00Z', end: '2025-01-31T23:59:59Z' },
  activeCount: INCIDENTS.length,
  limits: { maxPageSize: 100, maxTotalResults: 5000 },
};

const STATIONS_RESPONSE: StationListResponse = {
  data: [
    {
      stationCode: 'ST-102',
      name: 'Station 102',
      battalion: 'B2',
      phone: null,
      address: {
        line1: '42 Firehouse Way',
        city: 'Metropolis',
        region: 'CA',
        postalCode: '94102',
      },
      isActive: true,
      commissionedOn: '1990-01-01T00:00:00Z',
      decommissionedOn: null,
      coverageRadiusMeters: 5000,
      location: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.4, 37.78],
        },
        properties: {},
      },
      responseZone: null,
    },
  ],
};

const incidentsRequests: string[] = [];

const buildListResponse = (items: IncidentListItem[]): IncidentListResponse => ({
  data: items,
  pagination: {
    page: 1,
    pageSize: 25,
    total: items.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    sortBy: 'reportedAt',
    sortDirection: 'desc',
  },
});

const server = setupServer(
  http.get('*/api/incidents', ({ request }) => {
    incidentsRequests.push(request.url);

    const url = new URL(request.url);
    const incidentNumber = url.searchParams.get('incidentNumber');
    const severityCodes = url.searchParams.get('severityCodes')?.split(',') ?? [];
    const statusCodes = url.searchParams.get('statusCodes')?.split(',') ?? [];
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let items = INCIDENTS;

    if (incidentNumber) {
      const normalized = incidentNumber.toUpperCase();
      items = items.filter((incident) => incident.incidentNumber === normalized);
    }

    if (severityCodes.length > 0) {
      items = items.filter((incident) => severityCodes.includes(incident.severity.code));
    }

    if (statusCodes.length > 0) {
      items = items.filter((incident) => statusCodes.includes(incident.status.code));
    }

    if (startDate && endDate) {
      const start = Date.parse(startDate);
      const end = Date.parse(endDate);
      items = items.filter((incident) => {
        const occurrence = Date.parse(incident.occurrenceAt);
        return occurrence >= start && occurrence <= end;
      });
    }

    return HttpResponse.json(buildListResponse(items));
  }),
  http.get('*/api/incidents/meta', () => HttpResponse.json(INCIDENT_METADATA)),
  http.get('*/api/incidents/search', ({ request }) => {
    const url = new URL(request.url);
    const incidentNumber = url.searchParams.get('incidentNumber')?.toUpperCase() ?? '';
    const match = INCIDENTS.find((incident) => incident.incidentNumber === incidentNumber);
    if (!match) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      incidentNumber: match.incidentNumber,
      title: match.title,
      occurrenceAt: match.occurrenceAt,
      reportedAt: match.reportedAt,
      isActive: match.isActive,
      location: match.location,
      severity: match.severity,
      status: match.status,
      type: match.type,
    });
  }),
  http.get('*/api/incidents/:incidentNumber', ({ params }) => {
    const id = (params.incidentNumber as string | undefined)?.toUpperCase();
    if (!id || !INCIDENT_DETAIL[id]) {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json(INCIDENT_DETAIL[id]);
  }),
  http.get('*/api/stations', () => HttpResponse.json(STATIONS_RESPONSE))
);

describe('DashboardPage integration', () => {
  beforeAll(() => {
    server.listen();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    server.resetHandlers();
    incidentsRequests.length = 0;
    clearIncidentMetadataCache();
    localStorage.clear();
    act(() => {
      resetIncidentDetailStore({ clearStorage: true });
      resetMapPreferencesStore();
      useMapStore.setState({ center: [40.7128, -74.006], zoom: 11 });
    });
    setViewMock.mockReset();
  });

  afterAll(() => {
    server.close();
    // reset scrollIntoView mock
    delete (window.HTMLElement.prototype as unknown as { scrollIntoView?: () => void })
      .scrollIntoView;
  });

  it('applies incident filters, searches by incident number, and syncs table with map state', async () => {
    render(<DashboardPage />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Uptown Electrical Fire')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /incident overview/i })).toBeInTheDocument();

    const severityCritical = screen.getByLabelText(/Critical/i);
    fireEvent.click(severityCritical);

    const statusOnScene = screen.getByLabelText(/On Scene/i);
    fireEvent.click(statusOnScene);

    const startDateInput = screen.getByLabelText(/^Start$/i);
    const endDateInput = screen.getByLabelText(/^End$/i);
    fireEvent.change(startDateInput, { target: { value: '2025-01-07' } });
    fireEvent.change(endDateInput, { target: { value: '2025-01-12' } });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /apply filters/i })).not.toBeDisabled()
    );

    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    await waitFor(() =>
      expect(
        incidentsRequests.some(
          (url) =>
            url.includes('severityCodes=CRITICAL') &&
            url.includes('statusCodes=ON_SCENE') &&
            url.includes('startDate=2025-01-07T00%3A00%3A00.000Z') &&
            url.includes('endDate=2025-01-12T23%3A59%3A59.999Z')
        )
      ).toBe(true)
    );

    await within(table).findByText('Warehouse Fire');
    await waitFor(() =>
      expect(within(table).queryByText('Uptown Electrical Fire')).not.toBeInTheDocument()
    );

    const filterRequestMatch = incidentsRequests.some((url) => {
      const params = new URL(url).searchParams;
      return (
        params.get('severityCodes') === 'CRITICAL' &&
        params.get('statusCodes') === 'ON_SCENE' &&
        params.get('startDate') === '2025-01-07T00:00:00.000Z' &&
        params.get('endDate') === '2025-01-12T23:59:59.999Z'
      );
    });
    expect(filterRequestMatch).toBe(true);

    const searchInput = screen.getByLabelText(/incident search/i);
    fireEvent.change(searchInput, { target: { value: 'inc-300' } });
    fireEvent.click(screen.getByRole('button', { name: /search incidents/i }));

    await waitFor(() =>
      expect(useIncidentDetailStore.getState().selectedIncident?.incidentNumber).toBe('INC-300')
    );

    await within(table).findByText('Hazmat Spill');
    const incidentChip = await screen.findByText(/Incident: INC-300/i);
    expect(incidentChip).toBeInTheDocument();

    const incidentRequestMatched = incidentsRequests.some((url) => {
      const params = new URL(url).searchParams;
      return params.get('incidentNumber') === 'INC-300';
    });
    expect(incidentRequestMatched).toBe(true);

    await waitFor(() =>
      expect(setViewMock).toHaveBeenCalledWith(
        [37.76, -122.39],
        14,
        expect.objectContaining({ animate: true })
      )
    );

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Hazmat Spill');
    expect(dialog).toHaveTextContent('INC-300');
  });
});
