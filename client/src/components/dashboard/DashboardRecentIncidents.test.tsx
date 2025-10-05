import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardRecentIncidents from './DashboardRecentIncidents';
import type { DashboardRecentIncidentsState } from '@/hooks/useDashboardRecentIncidents';
import type { DashboardRecentIncident } from '@/types/dashboard';

type HookSelector<T> = (state: T) => unknown;

const mocks = vi.hoisted(() => ({
  setViewMock: vi.fn(),
  openIncidentMock: vi.fn(),
  setStateMock: vi.fn(),
}));

type IncidentDetailHook = {
  openIncident: (incident: unknown) => void;
};

type MapHook = {
  setView: (coords: [number, number], zoom?: number) => void;
};

vi.mock('@/store/useMapStore', () => ({
  useMapStore: (selector: HookSelector<MapHook>) => selector({ setView: mocks.setViewMock }),
}));

vi.mock('@/store/useIncidentDetailStore', () => {
  const hook = ((selector: HookSelector<IncidentDetailHook>) =>
    selector({ openIncident: mocks.openIncidentMock })) as ((
    selector: HookSelector<IncidentDetailHook>
  ) => unknown) & {
    setState: typeof mocks.setStateMock;
  };
  hook.setState = mocks.setStateMock;
  return { useIncidentDetailStore: hook };
});

const buildIncident = (
  overrides: Partial<DashboardRecentIncident> = {}
): DashboardRecentIncident => ({
  incidentNumber: 'INC-200',
  title: 'Warehouse Fire',
  occurrenceAt: '2025-01-08T11:58:00Z',
  reportedAt: '2025-01-08T12:04:00Z',
  isActive: true,
  location: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-122.41, 37.79] },
    properties: {},
  },
  severity: {
    code: 'CRITICAL',
    name: 'Critical',
    description: null,
    priority: 4,
    colorHex: '#dc2626',
  },
  status: { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
  type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
  primaryStation: { stationCode: 'FS21', name: 'Fire Station 21' },
  ...overrides,
});

const buildState = (
  overrides: Partial<DashboardRecentIncidentsState>
): DashboardRecentIncidentsState => ({
  status: 'success',
  data: [],
  error: null,
  lastUpdated: null,
  refresh: vi.fn(),
  ...overrides,
});

describe('DashboardRecentIncidents', () => {
  beforeEach(() => {
    mocks.setViewMock.mockReset();
    mocks.openIncidentMock.mockReset();
    mocks.setStateMock.mockReset();
  });

  it('renders skeleton while loading', () => {
    const recent = buildState({ status: 'loading' });
    render(<DashboardRecentIncidents recent={recent} />);

    expect(screen.getByText(/loading recent incidents/i)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(4);
  });

  it('renders error with retry button', () => {
    const refresh = vi.fn();
    const recent = buildState({ status: 'error', error: 'Boom', refresh });

    render(<DashboardRecentIncidents recent={recent} />);

    const retry = screen.getByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();
    fireEvent.click(retry);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders list items and wires actions', () => {
    const incident = buildIncident();
    const recent = buildState({ data: [incident] });

    render(<DashboardRecentIncidents recent={recent} />);

    expect(screen.getByText('Warehouse Fire')).toBeInTheDocument();
    expect(screen.getByText(/fire station 21/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view on map/i }));
    expect(mocks.setViewMock).toHaveBeenCalledWith([37.79, -122.41], 14);
    expect(mocks.setStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedIncident: expect.objectContaining({ incidentNumber: 'INC-200' }),
        isOpen: false,
      })
    );

    mocks.setViewMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /open details/i }));
    expect(mocks.setViewMock).toHaveBeenCalledWith([37.79, -122.41], 14);
    expect(mocks.openIncidentMock).toHaveBeenCalledWith(
      expect.objectContaining({ incidentNumber: 'INC-200' })
    );
  });

  it('disables view on map when coordinates are missing', () => {
    const incident = buildIncident({
      location: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [] },
        properties: {},
      },
    });
    const recent = buildState({ data: [incident] });

    render(<DashboardRecentIncidents recent={recent} />);

    expect(screen.getByRole('button', { name: /view on map/i })).toBeDisabled();
  });
});
