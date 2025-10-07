import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrategicHotspotResponse } from '@/types/strategic';
import { defaultStrategicMocks } from '@/test-utils/strategicHandlers';
import StrategicHotspotOverlayCard from './StrategicHotspotOverlayCard';

const fitBoundsMock = vi.fn();

vi.mock('react-leaflet', () => {
  return {
    __esModule: true,
    MapContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="map-container">{children}</div>
    ),
    TileLayer: () => <div data-testid="tile-layer" />,
    GeoJSON: ({ data }: { data: { features?: unknown[] } }) => (
      <div data-testid="geojson" data-feature-count={data.features?.length ?? 0} />
    ),
    useMap: () => ({
      fitBounds: fitBoundsMock,
      stop: vi.fn(),
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
    })),
    Icon: { Default: { mergeOptions: vi.fn() } },
  },
  geoJSON: vi.fn(() => ({
    getBounds: () => ({
      isValid: () => true,
    }),
  })),
}));

vi.mock('@/lib/leaflet', () => ({ leaflet: {} }));

const baseState = (overrides: Partial<StrategicHotspotResponse> = {}) => ({
  status: 'success' as const,
  data: { ...defaultStrategicMocks.hotspots, ...overrides },
  error: null,
  lastUpdated: '2025-01-11T12:00:00Z',
  refresh: vi.fn(),
  cancel: vi.fn(),
  isIdle: false,
  isLoading: false,
  isSuccess: true,
  isError: false,
});

describe('StrategicHotspotOverlayCard', () => {
  beforeEach(() => {
    fitBoundsMock.mockClear();
  });

  it('renders map, legend, and metadata when data is available', () => {
    const state = baseState();

    render(
      <StrategicHotspotOverlayCard
        state={state}
        resolution={state.data.metadata.resolution}
        onResolutionChange={vi.fn()}
        intensityScale={1.5}
        onIntensityScaleChange={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /hotspot heatmap/i })).toBeInTheDocument();
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('geojson').getAttribute('data-feature-count')).toBe('1');
    expect(screen.getByText(/total incidents/i)).toBeInTheDocument();
    expect(fitBoundsMock).toHaveBeenCalled();
  });

  it('invokes callbacks when controls change', () => {
    const state = baseState();
    const onResolutionChange = vi.fn();
    const onIntensityScaleChange = vi.fn();

    render(
      <StrategicHotspotOverlayCard
        state={state}
        resolution={state.data.metadata.resolution}
        onResolutionChange={onResolutionChange}
        intensityScale={1.5}
        onIntensityScaleChange={onIntensityScaleChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/resolution/i), { target: { value: '8' } });
    expect(onResolutionChange).toHaveBeenCalledWith(8);

    fireEvent.change(screen.getByLabelText(/intensity scaling/i), { target: { value: '2' } });
    expect(onIntensityScaleChange).toHaveBeenCalledWith(2);
  });

  it('fires refresh and cancel actions', () => {
    const state = baseState();

    render(
      <StrategicHotspotOverlayCard
        state={state}
        resolution={state.data.metadata.resolution}
        onResolutionChange={vi.fn()}
        intensityScale={1.5}
        onIntensityScaleChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh layer/i }));
    expect(state.refresh).toHaveBeenCalled();

    expect(screen.getByRole('button', { name: /cancel request/i })).toBeDisabled();
  });

  it('enables cancel while loading', () => {
    const state = {
      ...baseState(),
      status: 'loading' as const,
      isLoading: true,
      isSuccess: false,
    };

    render(
      <StrategicHotspotOverlayCard
        state={state}
        resolution={4}
        onResolutionChange={vi.fn()}
        intensityScale={1.5}
        onIntensityScaleChange={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel request/i });
    expect(cancelButton).toBeEnabled();
    fireEvent.click(cancelButton);
    expect(state.cancel).toHaveBeenCalled();
    expect(screen.getByText(/loading heatmap data/i)).toBeInTheDocument();
  });

  it('shows error state when request fails', () => {
    const state = {
      ...baseState(),
      status: 'error' as const,
      isError: true,
      isSuccess: false,
      error: 'Boom',
      data: null,
    };

    render(
      <StrategicHotspotOverlayCard
        state={state}
        resolution={4}
        onResolutionChange={vi.fn()}
        intensityScale={1.5}
        onIntensityScaleChange={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
  });
});
