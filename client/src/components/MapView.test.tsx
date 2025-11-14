import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MapView } from './MapView';
import { resetMapPreferencesStore } from '../store/map-preferences-store';

const mapStoreState = {
  center: [40.7128, -74.006] as [number, number],
  zoom: 11,
  setView: vi.fn(),
  resetView: vi.fn(),
};

vi.mock('../store/map-store', () => {
  const useMapStore = (selector?: (value: typeof mapStoreState) => unknown) =>
    selector ? selector(mapStoreState) : mapStoreState;

  useMapStore.setState = (partial: Partial<typeof mapStoreState>) => {
    Object.assign(mapStoreState, partial);
  };
  useMapStore.getState = () => mapStoreState;

  return { useMapStore };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  useMap: () => ({
    setView: vi.fn(),
    getCenter: () => ({ lat: 0, lng: 0 }),
    getZoom: () => 10,
    on: vi.fn(),
    off: vi.fn(),
    getBounds: () => ({
      getWest: () => -1,
      getSouth: () => -1,
      getEast: () => 1,
      getNorth: () => 1,
      contains: () => true,
    }),
    fitBounds: vi.fn(),
    getMaxZoom: () => 18,
  }),
  useMapEvents: () => null,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  LayerGroup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="layer-group">{children}</div>
  ),
}));

vi.mock('./map/IncidentClusterLayer', () => ({
  default: () => <div data-testid="incident-cluster-layer" />,
}));

vi.mock('./map/StationLayer', () => ({
  default: ({ isVisible }: { isVisible: boolean }) =>
    isVisible ? <div data-testid="station-layer" /> : null,
}));

vi.mock('./map/utils', () => ({
  computeIncidentBounds: () => null,
  resolveSeverityColor: () => '#2563eb',
}));

const defaultProps: React.ComponentProps<typeof MapView> = {
  incidents: [
    {
      id: 'INC-1',
      type: 'Structure Fire',
      severity: 'High',
      severityColor: '#f97316',
      date: '2025-10-19T13:25:00Z',
      timestamp: '2025-10-19T13:25:00Z',
      location: { lat: 40.71, lng: -74.0, address: '123 Main St' },
      description: 'Fire reported in warehouse',
      status: 'Active',
      isActive: true,
    },
  ],
  fireStations: [
    {
      id: 'STA-12',
      name: 'Station 12',
      location: { lat: 40.7, lng: -74.01 },
    },
  ],
  onIncidentClick: vi.fn(),
  isLoading: false,
  isFetching: false,
  isError: false,
  error: undefined,
  onRetry: vi.fn(),
  counts: {
    rendered: 1,
    total: 1,
    remainder: 0,
    limit: 1,
  },
  stationsLoading: false,
  stationsError: undefined,
};

const renderMapView = async (override: Partial<typeof defaultProps> = {}) => {
  let result;
  await act(async () => {
    result = render(<MapView {...defaultProps} {...override} />);
  });
  await act(async () => {});
  return result!;
};

afterEach(() => {
  resetMapPreferencesStore();
  mapStoreState.center = [40.7128, -74.006];
  mapStoreState.zoom = 11;
  mapStoreState.setView.mockClear();
  mapStoreState.resetView.mockClear();
});

describe('MapView overlays', () => {
  it('shows loading indicator when incidents are loading', async () => {
    await renderMapView({
      isLoading: true,
      counts: { rendered: 0, total: 0, remainder: 0, limit: 0 },
      incidents: [],
    });

    expect(screen.getByText('Loading incidents…')).toBeVisible();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders error state with retry action when incident load fails', async () => {
    const onRetry = vi.fn();

    await renderMapView({
      isError: true,
      error: 'Upstream service timeout',
      onRetry,
      incidents: [],
      counts: { rendered: 0, total: 0, remainder: 0, limit: 0 },
    });

    expect(screen.getByText('Unable to load incidents')).toBeVisible();
    expect(screen.getByText(/Upstream service timeout/i)).toBeVisible();

    screen.getByRole('button', { name: /retry/i }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows friendly empty state when no incidents are returned', async () => {
    await renderMapView({
      incidents: [],
      counts: { rendered: 0, total: 0, remainder: 0, limit: 0 },
      isLoading: false,
      isError: false,
    });

    expect(screen.getByText('No incidents available')).toBeVisible();
    expect(screen.getByText(/Adjust filters or check back soon/i)).toBeVisible();
  });
});
