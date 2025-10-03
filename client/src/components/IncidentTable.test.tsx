import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentTable from './IncidentTable';
import type { UseIncidentTableDataState } from '@/hooks/useIncidentTableData';
import type { IncidentListItem } from '@/types/incidents';
import { resetIncidentDetailStore, useIncidentDetailStore } from '@/store/useIncidentDetailStore';

const createState = (
  overrides: Partial<UseIncidentTableDataState> = {}
): UseIncidentTableDataState => ({
  rows: overrides.rows ?? [],
  pagination: overrides.pagination,
  isLoading: overrides.isLoading ?? false,
  isError: overrides.isError ?? false,
  error: overrides.error,
  filters: {
    page: 1,
    pageSize: 25,
    sortBy: 'reportedAt',
    sortDirection: 'desc',
    isActive: true,
    ...(overrides.filters ?? {}),
  },
  remainder: overrides.remainder ?? 0,
  nextPage: overrides.nextPage ?? null,
  previousPage: overrides.previousPage ?? null,
  totalPages: overrides.totalPages ?? 0,
  total: overrides.total ?? 0,
  setPage: overrides.setPage ?? vi.fn(),
  setPageSize: overrides.setPageSize ?? vi.fn(),
  setFilters: overrides.setFilters ?? vi.fn(),
  refresh: overrides.refresh ?? vi.fn(),
  lastUpdated: overrides.lastUpdated,
});

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-001',
  title: 'Structure Fire',
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
    geometry: { type: 'Point', coordinates: [-73.98, 40.75] },
    properties: {},
  },
  locationGeohash: null,
  externalReference: null,
  type: { code: 'FIRE', name: 'Fire', description: null },
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
  primaryStation: { stationCode: 'STA-01', name: 'Central Station' },
  ...overrides,
});

const buildDetail = (incident: IncidentListItem) => ({
  ...incident,
  narrative: null,
  metadata: {},
  units: [],
  assets: [],
  notes: [],
});

const useIncidentTableDataMock = vi.fn(() => createState());

vi.mock('@/hooks/useIncidentTableData', () => ({
  useIncidentTableData: () => useIncidentTableDataMock(),
}));

const scrollIntoViewMock = vi.fn();

describe('IncidentTable', () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    act(() => {
      resetIncidentDetailStore();
    });
    useIncidentTableDataMock.mockReset();
    useIncidentTableDataMock.mockReturnValue(createState());
    scrollIntoViewMock.mockClear();

    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (typeof input === 'string' && input.includes('/incidents/')) {
        const incidentNumber = decodeURIComponent(input.split('/').pop() ?? '');
        const incident = useIncidentDetailStore.getState().selectedIncident;
        const detailIncident =
          incident && incident.incidentNumber === incidentNumber
            ? incident
            : buildIncident({ incidentNumber });
        return Promise.resolve(
          new Response(JSON.stringify(buildDetail(detailIncident)), {
            headers: { 'Content-Type': 'application/json' },
          })
        );
      }
      return Promise.resolve(new Response('[]'));
    });

    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    act(() => {
      resetIncidentDetailStore();
    });
  });

  it('renders loading state', () => {
    useIncidentTableDataMock.mockReturnValue(createState({ isLoading: true }));

    render(<IncidentTable />);

    expect(screen.getByText(/loading incidents/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/loading incidents/i);
  });

  it('renders error state and retries on click', () => {
    const refresh = vi.fn();
    useIncidentTableDataMock.mockReturnValue(
      createState({ isError: true, error: 'API offline', refresh })
    );

    render(<IncidentTable />);

    expect(screen.getByRole('alert')).toHaveTextContent('API offline');

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('renders empty state', () => {
    useIncidentTableDataMock.mockReturnValue(createState());

    render(<IncidentTable />);

    expect(screen.getByText(/no incidents to display/i)).toBeInTheDocument();
  });

  it('renders table rows and pagination controls', () => {
    const setPage = vi.fn();
    const incident = buildIncident({ incidentNumber: 'INC-123', title: 'Warehouse Fire' });

    useIncidentTableDataMock.mockReturnValue(
      createState({
        rows: [incident],
        total: 40,
        totalPages: 4,
        remainder: 12,
        filters: { page: 2, pageSize: 25 },
        nextPage: 3,
        previousPage: 1,
        setPage,
        lastUpdated: new Date('2025-01-01T12:00:00Z'),
      })
    );

    render(<IncidentTable />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('INC-123')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Fire')).toBeInTheDocument();
    expect(screen.getByText(/showing 26-26 of 40 incidents \(\+12 more\)/i)).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
    expect(screen.getByText(/no filters applied/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /view details/i })).toHaveLength(1);

    const nextButton = screen.getByRole('button', { name: /next/i });
    const prevButton = screen.getByRole('button', { name: /previous/i });

    fireEvent.click(nextButton);
    fireEvent.click(prevButton);

    expect(setPage).toHaveBeenNthCalledWith(1, 3);
    expect(setPage).toHaveBeenNthCalledWith(2, 1);
  });

  it('updates page size when selection changes', () => {
    const setPageSize = vi.fn();
    useIncidentTableDataMock.mockReturnValue(createState({ setPageSize }));

    render(<IncidentTable />);

    const select = screen.getByLabelText(/page size/i);
    fireEvent.change(select, { target: { value: '50' } });

    expect(setPageSize).toHaveBeenCalledWith(50);
  });

  it('applies filter selections and emits hook updates', async () => {
    const setFilters = vi.fn();
    useIncidentTableDataMock.mockReturnValue(createState({ setFilters }));

    render(<IncidentTable />);

    fireEvent.click(screen.getByLabelText(/critical/i));
    fireEvent.click(screen.getByLabelText(/on scene/i));

    const startInput = screen.getByLabelText(/^start$/i);
    const endInput = screen.getByLabelText(/^end$/i);
    fireEvent.change(startInput, { target: { value: '2025-01-01' } });
    fireEvent.change(endInput, { target: { value: '2025-01-31' } });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /apply filters/i })).not.toBeDisabled()
    );

    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(setFilters).toHaveBeenCalledWith({
      severityCodes: ['CRITICAL'],
      statusCodes: ['ON_SCENE'],
      startDate: '2025-01-01T00:00:00.000Z',
      endDate: '2025-01-31T23:59:59.999Z',
    });
  });

  it('clears filters and shows summary chips for active filters', () => {
    const setFilters = vi.fn();
    useIncidentTableDataMock.mockReturnValue(
      createState({
        setFilters,
        filters: {
          page: 1,
          pageSize: 25,
          sortBy: 'reportedAt',
          sortDirection: 'desc',
          isActive: true,
          severityCodes: ['CRITICAL'],
          statusCodes: ['RESOLVED'],
          startDate: '2025-02-01T00:00:00.000Z',
          endDate: '2025-02-15T23:59:59.999Z',
        },
      })
    );

    render(<IncidentTable />);

    expect(screen.getByText(/severity: critical/i)).toBeInTheDocument();
    expect(screen.getByText(/status: resolved/i)).toBeInTheDocument();
    expect(screen.getByText(/dates:/i)).toBeInTheDocument();

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    expect(clearButton).not.toBeDisabled();
    fireEvent.click(clearButton);

    expect(setFilters).toHaveBeenCalledWith({
      severityCodes: undefined,
      statusCodes: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  });

  it('prevents applying invalid date ranges', async () => {
    const setFilters = vi.fn();
    useIncidentTableDataMock.mockReturnValue(createState({ setFilters }));

    render(<IncidentTable />);

    const startInput = screen.getByLabelText(/^start$/i);
    const endInput = screen.getByLabelText(/^end$/i);
    fireEvent.change(startInput, { target: { value: '2025-03-10' } });
    fireEvent.change(endInput, { target: { value: '2025-03-05' } });

    expect(await screen.findByText(/start date must be before end date/i)).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /apply filters/i })).toBeDisabled()
    );

    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));
    expect(setFilters).not.toHaveBeenCalled();
  });

  it('highlights the selected incident row from the detail store', async () => {
    const incident = buildIncident({ incidentNumber: 'INC-777', title: 'Selected Incident' });
    useIncidentTableDataMock.mockReturnValue(createState({ rows: [incident] }));

    render(<IncidentTable />);

    act(() => {
      useIncidentDetailStore.setState({ selectedIncident: incident, isOpen: true });
    });

    const selectedRow = await screen.findByRole('row', { selected: true });
    expect(selectedRow).toHaveTextContent('INC-777');
    expect(selectedRow).toHaveClass('incident-table__row--selected');

    await waitFor(() => expect(scrollIntoViewMock).toHaveBeenCalled());
  });

  it('opens the incident detail modal when a row is activated', async () => {
    const incident = buildIncident({ incidentNumber: 'INC-314', title: 'Activation Test' });
    useIncidentTableDataMock.mockReturnValue(createState({ rows: [incident] }));

    render(<IncidentTable />);

    const row = screen.getByText('INC-314').closest('tr') as HTMLTableRowElement;
    await act(async () => {
      fireEvent.click(row);
      await Promise.resolve();
    });

    const state = useIncidentDetailStore.getState();
    expect(state.selectedIncident).toEqual(incident);
    expect(state.isOpen).toBe(true);
  });

  it('opens the incident detail modal via keyboard activation', async () => {
    const incident = buildIncident({ incidentNumber: 'INC-400', title: 'Keyboard Activation' });
    useIncidentTableDataMock.mockReturnValue(createState({ rows: [incident] }));

    render(<IncidentTable />);

    const row = screen.getByText('INC-400').closest('tr') as HTMLTableRowElement;
    await act(async () => {
      fireEvent.keyDown(row, { key: 'Enter' });
      await Promise.resolve();
    });

    const state = useIncidentDetailStore.getState();
    expect(state.selectedIncident).toEqual(incident);
    expect(state.isOpen).toBe(true);
  });

  it('opens the incident detail modal when clicking the view details button', async () => {
    const incident = buildIncident({ incidentNumber: 'INC-555', title: 'Button Activation' });
    useIncidentTableDataMock.mockReturnValue(createState({ rows: [incident] }));

    render(<IncidentTable />);

    const button = screen.getByRole('button', { name: /view details/i });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    const state = useIncidentDetailStore.getState();
    expect(state.selectedIncident).toEqual(incident);
    expect(state.isOpen).toBe(true);
  });
});
