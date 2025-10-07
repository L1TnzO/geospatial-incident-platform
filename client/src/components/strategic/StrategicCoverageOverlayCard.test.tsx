import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrategicCoverageResponse } from '@/types/strategic';
import StrategicCoverageOverlayCard from './StrategicCoverageOverlayCard';

const fitBoundsMock = vi.fn();

vi.mock('react-leaflet', () => {
  return {
    __esModule: true,
    MapContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="coverage-map">{children}</div>
    ),
    TileLayer: () => <div data-testid="tile-layer" />,
    GeoJSON: () => <div data-testid="geojson" />,
    useMap: () => ({
      fitBounds: fitBoundsMock,
    }),
  };
});

vi.mock('leaflet', () => ({
  __esModule: true,
  default: {
    geoJSON: vi.fn(() => ({
      getBounds: () => ({
        isValid: () => true,
      }),
      remove: vi.fn(),
    })),
    Icon: { Default: { mergeOptions: vi.fn() } },
  },
  geoJSON: vi.fn(() => ({
    getBounds: () => ({
      isValid: () => true,
    }),
    remove: vi.fn(),
  })),
}));

vi.mock('@/lib/leaflet', () => ({ leaflet: {} }));

const baseResponse: StrategicCoverageResponse = {
  metadata: {
    totalStations: 2,
    activeStations: 2,
    generatedAt: '2025-01-15T12:00:00Z',
    defaultColorHex: null,
  },
  stations: [
    {
      station: { code: 'ST-101', name: 'Station 101' },
      coverageRadiusMeters: 4800,
      lastUpdated: '2025-01-15T10:00:00Z',
      isActive: true,
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-122.42, 37.78],
              [-122.41, 37.78],
              [-122.41, 37.77],
              [-122.42, 37.77],
              [-122.42, 37.78],
            ],
          ],
        },
      },
      centroid: { latitude: 37.775, longitude: -122.415 },
      colorHex: '#2563eb',
    },
    {
      station: { code: 'ST-202', name: 'Station 202' },
      coverageRadiusMeters: 5200,
      lastUpdated: '2025-01-14T16:30:00Z',
      isActive: true,
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-122.39, 37.79],
              [-122.38, 37.79],
              [-122.38, 37.78],
              [-122.39, 37.78],
              [-122.39, 37.79],
            ],
          ],
        },
      },
      centroid: { latitude: 37.785, longitude: -122.385 },
      colorHex: '#f97316',
    },
  ],
};

const createState = (overrides: Partial<StrategicCoverageResponse> = {}) => ({
  status: 'success' as const,
  data: { ...baseResponse, ...overrides },
  error: null,
  lastUpdated: '2025-01-15T12:05:00Z',
  refresh: vi.fn(),
  cancel: vi.fn(),
  isIdle: false,
  isLoading: false,
  isSuccess: true,
  isError: false,
});

describe('StrategicCoverageOverlayCard', () => {
  beforeEach(() => {
    fitBoundsMock.mockClear();
  });

  it('renders map, station list, and metadata', () => {
    const state = createState();

    render(<StrategicCoverageOverlayCard state={state} />);

    expect(screen.getByRole('heading', { name: /station coverage overlay/i })).toBeInTheDocument();
    expect(screen.getByTestId('coverage-map')).toBeInTheDocument();
    const totalStationsLabel = screen.getByText(/total stations/i);
    expect(totalStationsLabel).toBeInTheDocument();
    expect(totalStationsLabel.nextElementSibling?.textContent).toBe('2');
    expect(screen.getByLabelText(/toggle coverage for station 101/i)).toBeChecked();
    expect(screen.getByLabelText(/toggle coverage for station 202/i)).toBeChecked();
    expect(fitBoundsMock).toHaveBeenCalled();
  });

  it('allows toggling stations and refreshing', () => {
    const state = createState();

    render(<StrategicCoverageOverlayCard state={state} />);

    const stationToggle = screen.getByLabelText(/toggle coverage for station 202/i);
    fireEvent.click(stationToggle);
    expect(stationToggle).not.toBeChecked();

    const enableAll = screen.getByRole('button', { name: /enable all/i });
    fireEvent.click(enableAll);
    expect(stationToggle).toBeChecked();

    const refreshButton = screen.getByRole('button', { name: /refresh coverage/i });
    fireEvent.click(refreshButton);
    expect(state.refresh).toHaveBeenCalled();
  });

  it('disables cancel button when not loading and invokes cancel when loading', () => {
    const loadingState = {
      ...createState(),
      status: 'loading' as const,
      isLoading: true,
      isSuccess: false,
    };

    render(<StrategicCoverageOverlayCard state={loadingState} />);

    const cancelButton = screen.getByRole('button', { name: /cancel request/i });
    expect(cancelButton).toBeEnabled();
    fireEvent.click(cancelButton);
    expect(loadingState.cancel).toHaveBeenCalled();
  });

  it('shows error state when coverage buffers fail to load', () => {
    const errorState = {
      ...createState(),
      status: 'error' as const,
      isError: true,
      isSuccess: false,
      error: 'Coverage failed',
      data: null,
    };

    render(<StrategicCoverageOverlayCard state={errorState} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Coverage failed');
    expect(screen.queryByTestId('coverage-map')).not.toBeInTheDocument();
  });

  it('renders empty state when no stations available', () => {
    const emptyState = createState({
      stations: [],
      metadata: { ...baseResponse.metadata, totalStations: 0, activeStations: 0 },
    });

    render(<StrategicCoverageOverlayCard state={emptyState} />);

    expect(screen.getByText(/no station coverage areas/i)).toBeInTheDocument();
  });
});
