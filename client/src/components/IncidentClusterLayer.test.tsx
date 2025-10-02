import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { IncidentListItem } from '@/types/incidents';
import IncidentClusterLayer from './IncidentClusterLayer';
import { resetIncidentDetailStore, useIncidentDetailStore } from '@/store/useIncidentDetailStore';

const loadMock = vi.fn();
const getClustersMock = vi.fn();
const getClusterExpansionZoomMock = vi.fn<(clusterId: number) => number>(() => 12);

vi.mock('supercluster', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
      load: loadMock,
      getClusters: (...args: unknown[]) => getClustersMock(...args),
      getClusterExpansionZoom: (clusterId: number) => getClusterExpansionZoomMock(clusterId),
    })),
  };
});

type MarkerProps = {
  position: { lat: number; lng: number };
  eventHandlers?: { click?: () => void };
  icon?: unknown;
  children?: ReactNode;
};

type PopupProps = {
  children?: ReactNode;
};

const setViewMock = vi.fn();

const mapStub = {
  getBounds: () => ({
    getWest: () => -180,
    getSouth: () => -90,
    getEast: () => 180,
    getNorth: () => 90,
  }),
  getZoom: () => 5,
  getMaxZoom: () => 18,
  setView: setViewMock,
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('react-leaflet', async () => {
  const actual = (await vi.importActual<typeof import('react-leaflet')>(
    'react-leaflet'
  )) as typeof import('react-leaflet');
  return {
    ...actual,
    useMap: () => mapStub,
    Marker: ({ position, eventHandlers, icon, children }: MarkerProps) => (
      <div
        data-testid="marker"
        data-lat={position.lat}
        data-lng={position.lng}
        data-has-icon={icon ? 'true' : 'false'}
        onClick={() => eventHandlers?.click?.()}
      >
        {children}
      </div>
    ),
    Popup: ({ children }: PopupProps) => <div data-testid="popup">{children}</div>,
  };
});

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-123',
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
  location: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-74, 40.7] },
    properties: {},
  },
  locationGeohash: null,
  type: { code: 'FIRE', name: 'Fire', description: null },
  severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
  status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
  source: null,
  weather: null,
  primaryStation: null,
  ...overrides,
});

describe('IncidentClusterLayer', () => {
  beforeEach(() => {
    loadMock.mockClear();
    getClustersMock.mockReset();
    getClusterExpansionZoomMock.mockClear();
    setViewMock.mockClear();
    mapStub.on.mockClear();
    mapStub.off.mockClear();
    act(() => {
      resetIncidentDetailStore();
    });
  });

  afterEach(() => {
    getClustersMock.mockReset();
  });

  it('renders incident markers when clusters return point features', () => {
    const incident = buildIncident();

    getClustersMock.mockReturnValue([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: incident.location.geometry.coordinates },
        properties: { type: 'incident', incident },
      },
    ]);

    render(<IncidentClusterLayer incidents={[incident]} />);

    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(1);
    expect(markers[0]).toHaveAttribute('data-has-icon', 'false');
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
  });

  it('renders cluster markers and zooms on click', () => {
    const incident = buildIncident();

    getClustersMock.mockReturnValue([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.9, 40.75] },
        properties: {
          cluster: true,
          cluster_id: 99,
          point_count: 25,
          point_count_abbreviated: '25',
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: incident.location.geometry.coordinates },
        properties: { type: 'incident', incident },
      },
    ]);

    render(<IncidentClusterLayer incidents={[incident]} />);

    const markers = screen.getAllByTestId('marker');
    const clusterMarker = markers.find((marker) => marker.getAttribute('data-has-icon') === 'true');
    expect(clusterMarker).toBeDefined();

    if (clusterMarker) {
      fireEvent.click(clusterMarker);
    }

    expect(setViewMock).toHaveBeenCalledTimes(1);
    const [center, zoom] = setViewMock.mock.calls[0];
    expect(center).toMatchObject({ lat: 40.75, lng: -73.9 });
    expect(zoom).toBeGreaterThan(5);
  });

  it('dispatches detail trigger when view details clicked', () => {
    const incident = buildIncident();

    getClustersMock.mockReturnValue([
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: incident.location.geometry.coordinates },
        properties: { type: 'incident', incident },
      },
    ]);

    render(<IncidentClusterLayer incidents={[incident]} />);

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));

    const state = useIncidentDetailStore.getState();
    expect(state.selectedIncident?.incidentNumber).toBe(incident.incidentNumber);
    expect(state.isOpen).toBe(true);
  });
});
