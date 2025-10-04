import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentSearchBar from './IncidentSearchBar';
import { INCIDENT_SEARCH_HISTORY_STORAGE_KEY } from './incidentSearchBar.constants';
import { resetIncidentDetailStore, useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { useMapStore } from '@/store/useMapStore';

const fetchIncidentMetadataMock = vi.hoisted(() => vi.fn());
const clearIncidentMetadataCacheMock = vi.hoisted(() => vi.fn());
const searchIncidentByNumberMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/incidentsMetaService', () => ({
  fetchIncidentMetadata: fetchIncidentMetadataMock,
  clearIncidentMetadataCache: clearIncidentMetadataCacheMock,
}));

vi.mock('@/services/incidentSearchService', () => ({
  searchIncidentByNumber: searchIncidentByNumberMock,
}));

const buildMetadata = () => ({
  types: [],
  severities: [],
  statuses: [],
  occurrenceRange: { start: null, end: null },
  reportedRange: { start: null, end: null },
  activeCount: 42,
  limits: { maxPageSize: 100, maxTotalResults: 5000 },
});

const buildBaseResult = () => ({
  incidentNumber: 'INC-100',
  title: 'Structure Fire',
  occurrenceAt: new Date().toISOString(),
  reportedAt: new Date().toISOString(),
  isActive: true,
  location: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-73.99, 40.7] },
    properties: {},
  },
  severity: {
    code: 'HIGH',
    name: 'High',
    description: null,
    priority: 2,
    colorHex: '#f87171',
  },
  status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
  type: { code: 'FIRE', name: 'Fire', description: null },
});

describe('IncidentSearchBar', () => {
  beforeEach(() => {
    fetchIncidentMetadataMock.mockReset();
    searchIncidentByNumberMock.mockReset();
    clearIncidentMetadataCacheMock.mockReset();
    fetchIncidentMetadataMock.mockResolvedValue(buildMetadata());
    searchIncidentByNumberMock.mockResolvedValue(buildBaseResult());
    window.localStorage.clear();
    resetIncidentDetailStore({ clearStorage: true });
    useMapStore.setState({ center: [40.7128, -74.006], zoom: 11 });
  });

  afterEach(() => {
    resetIncidentDetailStore({ clearStorage: true });
  });

  it('searches incidents and updates stores', async () => {
    render(<IncidentSearchBar />);

    await waitFor(() => expect(fetchIncidentMetadataMock).toHaveBeenCalledTimes(1));

    const input = screen.getByLabelText(/incident search/i);
    fireEvent.change(input, { target: { value: 'inc-100' } });

    fireEvent.click(screen.getByRole('button', { name: /search incidents/i }));

    await waitFor(() =>
      expect(searchIncidentByNumberMock.mock.calls.map((call) => call[0])).toContain('inc-100')
    );

    await waitFor(() =>
      expect(useIncidentDetailStore.getState().selectedIncident?.incidentNumber).toBe('INC-100')
    );

    const mapState = useMapStore.getState();
    expect(mapState.center[0]).toBeCloseTo(40.7, 3);
    expect(mapState.center[1]).toBeCloseTo(-73.99, 3);
    expect(mapState.zoom).toBe(14);

    expect(await screen.findByText(/Found INC-100 \(Fire\)/i)).toBeInTheDocument();

    const historyPayload = window.localStorage.getItem(INCIDENT_SEARCH_HISTORY_STORAGE_KEY);
    expect(historyPayload).not.toBeNull();
    const history = historyPayload ? JSON.parse(historyPayload) : [];
    expect(history[0]?.incidentNumber).toBe('INC-100');

    fireEvent.focus(input);
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /INC-100/i })).toBeInTheDocument()
    );
  });

  it('shows error feedback when search fails', async () => {
    const error = new Error("Incident 'INC-404' was not found.");
    searchIncidentByNumberMock.mockImplementation(() => Promise.reject(error));

    render(<IncidentSearchBar />);
    await waitFor(() => expect(fetchIncidentMetadataMock).toHaveBeenCalled());

    const input = screen.getByLabelText(/incident search/i);
    fireEvent.change(input, { target: { value: 'INC-404' } });
    fireEvent.click(screen.getByRole('button', { name: /search incidents/i }));

    await waitFor(() =>
      expect(searchIncidentByNumberMock.mock.calls.map((call) => call[0])).toContain('INC-404')
    );
    expect(await screen.findByText(/Incident 'INC-404' was not found\./i)).toBeInTheDocument();
    expect(useIncidentDetailStore.getState().selectedIncident).toBeNull();

    const mapState = useMapStore.getState();
    expect(mapState.center).toEqual([40.7128, -74.006]);
    expect(mapState.zoom).toBe(11);
  });

  it('loads recent history from localStorage and limits suggestions', async () => {
    const history = Array.from({ length: 7 }, (_, index) => ({
      incidentNumber: `INC-${index + 1}`,
      title: `Incident ${index + 1}`,
      timestamp: Date.now() - index * 1000,
    }));
    window.localStorage.setItem(INCIDENT_SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(history));

    render(<IncidentSearchBar />);

    const input = await screen.findByLabelText(/incident search/i);
    fireEvent.focus(input);

    const suggestions = await screen.findAllByRole('option');
    expect(suggestions).toHaveLength(5);
    expect(suggestions[0]).toHaveTextContent('INC-1');
  });
});
