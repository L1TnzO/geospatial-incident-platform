import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseIncidentsResult } from '@/hooks/useIncidents';
import type { UseStationsResult } from '@/hooks/useStations';
import MapView from './MapView';
import { resetIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { resetMapPreferencesStore } from '@/store/useMapPreferencesStore';

type PartialIncident = UseIncidentsResult['incidents'][number];

const mockedUseIncidents = vi.fn<() => UseIncidentsResult>(() => {
  throw new Error('useIncidents mock not configured');
});

const mockedUseStations = vi.fn<() => UseStationsResult>(() => {
  throw new Error('useStations mock not configured');
});

vi.mock('@/hooks/useIncidents', () => ({
  useIncidents: () => mockedUseIncidents(),
}));

vi.mock('@/hooks/useStations', () => ({
  useStations: () => mockedUseStations(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile" />,
}));

const stationLayerSpy = vi.fn<(isVisible: boolean) => void>();

vi.mock('./IncidentClusterLayer', () => ({
  __esModule: true,
  default: ({ incidents }: { incidents: UseIncidentsResult['incidents'] }) => (
    <div data-testid="cluster-layer" data-count={incidents.length} />
  ),
}));

vi.mock('./StationLayer', () => ({
  __esModule: true,
  default: ({
    isVisible,
    stations,
  }: {
    isVisible: boolean;
    stations: UseStationsResult['stations'];
  }) => {
    stationLayerSpy(isVisible);
    return (
      <div
        data-testid="station-layer"
        data-visible={String(isVisible)}
        data-count={stations.length}
      />
    );
  },
}));

describe('MapView', () => {
  afterEach(() => {
    mockedUseIncidents.mockReset();
    mockedUseStations.mockReset();
    stationLayerSpy.mockReset();
  });

  beforeEach(() => {
    act(() => {
      resetIncidentDetailStore();
      resetMapPreferencesStore();
    });
    mockedUseStations.mockImplementation(() => ({
      stations: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
    }));
  });

  it('renders markers when incidents are available', async () => {
    const incident: PartialIncident = {
      incidentNumber: 'INC-123',
      title: 'Test Incident',
      severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
      status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
      type: { code: 'FIRE', name: 'Fire', description: null },
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
        geometry: { type: 'Point', coordinates: [-74, 40.7] } as const,
        properties: {},
      } as PartialIncident['location'],
      source: null,
      weather: null,
      primaryStation: null,
    };

    mockedUseIncidents.mockReturnValue({
      incidents: [incident],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
      totalCount: 1,
      renderedCount: 1,
      remainder: 0,
      pagination: {
        page: 1,
        pageSize: 1,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      },
    });

    mockedUseStations.mockReturnValue({
      stations: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
    });

    render(<MapView />);

    expect(screen.getByTestId('map')).toBeInTheDocument();
    const cluster = screen.getByTestId('cluster-layer');
    expect(cluster).toHaveAttribute('data-count', '1');
    expect(screen.getByTestId('station-layer')).toHaveAttribute('data-visible', 'true');
  });

  it('shows error overlay with retry button when load fails', () => {
    const refreshMock = vi.fn();

    mockedUseIncidents.mockReturnValue({
      incidents: [],
      isLoading: false,
      isError: true,
      error: 'Network error',
      refresh: refreshMock,
      lastUpdated: undefined,
      totalCount: 0,
      renderedCount: 0,
      remainder: 0,
      pagination: undefined,
    });

    mockedUseStations.mockReturnValue({
      stations: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
    });

    render(<MapView />);

    expect(screen.getByText('Network error')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(button);
    expect(refreshMock).toHaveBeenCalled();
  });

  it('shows remainder indicator when data exceeds cap', () => {
    mockedUseIncidents.mockReturnValue({
      incidents: [
        {
          incidentNumber: 'INC-001',
          title: 'Test',
          severity: {
            code: 'HIGH',
            name: 'High',
            description: null,
            priority: 1,
            colorHex: '#ff0000',
          },
          status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
          type: { code: 'FIRE', name: 'Fire', description: null },
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
            geometry: { type: 'Point', coordinates: [-74, 40.7] },
            properties: {},
          },
          source: null,
          weather: null,
          primaryStation: null,
        } as PartialIncident,
      ],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
      totalCount: 6000,
      renderedCount: 5000,
      remainder: 1000,
      pagination: {
        page: 1,
        pageSize: 5000,
        total: 6000,
        totalPages: 60,
        hasNext: true,
        hasPrevious: false,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      },
    });

    mockedUseStations.mockReturnValue({
      stations: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
    });

    render(<MapView />);

    expect(screen.getByText(/showing/i)).toHaveTextContent('Showing 5,000 of 6,000 incidents.');
  });

  it('toggles station overlay visibility', () => {
    mockedUseIncidents.mockReturnValue({
      incidents: [],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
      totalCount: 0,
      renderedCount: 0,
      remainder: 0,
      pagination: undefined,
    });

    mockedUseStations.mockReturnValue({
      stations: [
        {
          stationCode: 'ST-1',
          name: 'Station One',
          battalion: null,
          phone: null,
          address: undefined,
          isActive: true,
          commissionedOn: null,
          decommissionedOn: null,
          coverageRadiusMeters: null,
          location: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-74, 40.7] },
            properties: {},
          },
          responseZone: null,
        },
      ],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
    });

    render(<MapView />);

    const toggle = screen.getByLabelText(/show fire stations/i) as HTMLInputElement;
    const layer = screen.getByTestId('station-layer');

    expect(toggle.checked).toBe(true);
    expect(layer).toHaveAttribute('data-visible', 'true');

    fireEvent.click(toggle);

    expect(toggle.checked).toBe(false);
    expect(layer).toHaveAttribute('data-visible', 'false');
    expect(stationLayerSpy).toHaveBeenCalledWith(false);
  });
});
