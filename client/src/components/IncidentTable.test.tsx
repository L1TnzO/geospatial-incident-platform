import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentTable from './IncidentTable';
import type { UseIncidentTableDataState } from '@/hooks/useIncidentTableData';
import type { IncidentListItem } from '@/types/incidents';

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

const useIncidentTableDataMock = vi.fn(() => createState());

vi.mock('@/hooks/useIncidentTableData', () => ({
  useIncidentTableData: () => useIncidentTableDataMock(),
}));

describe('IncidentTable', () => {
  beforeEach(() => {
    useIncidentTableDataMock.mockReset();
    useIncidentTableDataMock.mockReturnValue(createState());
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
});
