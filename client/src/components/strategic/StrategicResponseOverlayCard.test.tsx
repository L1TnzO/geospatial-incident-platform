import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StrategicResponseMetricsResponse } from '@/types/strategic';
import StrategicResponseOverlayCard from './StrategicResponseOverlayCard';

const fitBoundsMock = vi.fn();
const overlayLayerMock = vi.fn();

vi.mock('react-leaflet', () => {
  return {
    __esModule: true,
    MapContainer: ({ children }: { children?: ReactNode }) => (
      <div data-testid="response-map">{children}</div>
    ),
    TileLayer: () => <div data-testid="tile-layer" />,
    useMap: () => ({
      fitBounds: fitBoundsMock,
    }),
  };
});

vi.mock('./StrategicResponseOverlayLayer', () => {
  return {
    __esModule: true,
    default: (props: unknown) => {
      overlayLayerMock(props);
      return <div data-testid="response-overlay-layer" />;
    },
  };
});

vi.mock('@/lib/leaflet', () => ({ leaflet: {} }));

const baseResponse: StrategicResponseMetricsResponse = {
  metadata: {
    groupBy: 'grid',
    sampleThreshold: 3,
    totalGroups: 2,
    minAverageSeconds: 240,
    maxAverageSeconds: 480,
    generatedAt: '2025-01-15T12:00:00Z',
  },
  groups: [
    {
      groupType: 'grid',
      cell: {
        cellId: 'A1',
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
      },
      sampleSize: 12,
      averageSeconds: 360,
      medianSeconds: 340,
      p90Seconds: 480,
      normalizedAverage: 0.5,
      percentileRank: 0.5,
      insufficientSample: false,
    },
    {
      groupType: 'station',
      station: {
        code: 'ST-101',
        name: 'Station 101',
        location: { latitude: 37.78, longitude: -122.4 },
      },
      sampleSize: 6,
      averageSeconds: 520,
      medianSeconds: 500,
      p90Seconds: 640,
      normalizedAverage: 0.9,
      percentileRank: 0.9,
      insufficientSample: false,
    },
  ],
};

const createState = (overrides: Partial<StrategicResponseMetricsResponse> = {}) => ({
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

describe('StrategicResponseOverlayCard', () => {
  beforeEach(() => {
    fitBoundsMock.mockClear();
    overlayLayerMock.mockClear();
  });

  it('renders map, legend, and default controls', () => {
    const state = createState();

    render(<StrategicResponseOverlayCard state={state} groupBy="grid" onGroupByChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /response time heatmap/i })).toBeInTheDocument();
    expect(screen.getByTestId('response-map')).toBeInTheDocument();
    const thresholdSlider = screen.getByLabelText(/highlight groups above threshold minutes/i);
    expect(thresholdSlider).toBeInTheDocument();
    const thresholdLabel = thresholdSlider.closest('label');
    expect(thresholdLabel).not.toBeNull();
    if (thresholdLabel) {
      expect(within(thresholdLabel).getByText('Threshold')).toBeInTheDocument();
    }
    const legend = screen.getByLabelText(/response time legend/i);
    expect(within(legend).getByText('Above threshold')).toBeInTheDocument();
    expect(overlayLayerMock).toHaveBeenCalled();
  });

  it('invokes group toggle and updates threshold display', () => {
    const onGroupChange = vi.fn();
    const state = createState();

    render(
      <StrategicResponseOverlayCard state={state} groupBy="grid" onGroupByChange={onGroupChange} />
    );

    const stationButton = screen.getByRole('button', { name: /station view/i });
    fireEvent.click(stationButton);
    expect(onGroupChange).toHaveBeenCalledWith('station');

    const slider = screen.getByLabelText(
      /highlight groups above threshold minutes/i
    ) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '10' } });
    const thresholdWrapper = slider.closest('label');
    expect(thresholdWrapper).not.toBeNull();
    if (thresholdWrapper) {
      const thresholdDisplays = within(thresholdWrapper).getAllByText(/10 min/);
      expect(thresholdDisplays.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles refresh and cancel interactions', () => {
    const state = createState();

    const { rerender } = render(
      <StrategicResponseOverlayCard state={state} groupBy="grid" onGroupByChange={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: /refresh overlay/i }));
    expect(state.refresh).toHaveBeenCalled();

    const loadingState = {
      ...state,
      isLoading: true,
      isSuccess: false,
    };

    rerender(
      <StrategicResponseOverlayCard state={loadingState} groupBy="grid" onGroupByChange={vi.fn()} />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel request/i });
    expect(cancelButton).toBeEnabled();
    fireEvent.click(cancelButton);
    expect(loadingState.cancel).toHaveBeenCalled();
  });

  it('shows error state when response metrics fail', () => {
    const errorState = {
      ...createState(),
      isError: true,
      isSuccess: false,
      status: 'error' as const,
      error: 'Response error',
      data: null,
    };

    render(
      <StrategicResponseOverlayCard state={errorState} groupBy="grid" onGroupByChange={vi.fn()} />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Response error');
  });

  it('renders empty state when no groups available', () => {
    const emptyState = createState({ groups: [] });

    render(
      <StrategicResponseOverlayCard state={emptyState} groupBy="grid" onGroupByChange={vi.fn()} />
    );

    expect(screen.getByText(/no response metrics are available/i)).toBeInTheDocument();
  });
});
