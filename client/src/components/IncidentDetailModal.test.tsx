import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IncidentDetailModal from './IncidentDetailModal';
import { resetIncidentDetailStore, useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import type { IncidentDetail, IncidentListItem } from '@/types/incidents';

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-100',
  title: 'Detail Test',
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
  externalReference: null,
  type: { code: 'FIRE', name: 'Fire', description: null },
  severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
  status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
  source: null,
  weather: null,
  primaryStation: null,
  ...overrides,
});

const buildDetail = (
  incident: IncidentListItem,
  overrides: Partial<IncidentDetail> = {}
): IncidentDetail => ({
  ...incident,
  narrative: 'Sample narrative',
  metadata: {},
  units: [
    {
      stationCode: 'STA-01',
      stationName: 'Central Station',
      assignmentRole: 'Primary',
      dispatchedAt: new Date().toISOString(),
      clearedAt: null,
    },
  ],
  assets: [
    {
      assetIdentifier: 'ENG-5',
      assetType: 'Engine',
      status: 'On Scene',
      notes: null,
    },
  ],
  notes: [
    {
      author: 'Captain Holt',
      note: 'Maintain perimeter.',
      createdAt: new Date().toISOString(),
    },
  ],
  ...overrides,
});

const mockFetch = (
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
) => {
  const fetchMock = vi.fn(implementation);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const jsonResponse = (data: unknown, init: ResponseInit = {}): Response => {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return new Response(JSON.stringify(data), {
    ...init,
    status: init.status ?? 200,
    headers,
  });
};

describe('IncidentDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    act(() => {
      resetIncidentDetailStore();
    });
  });

  it('is hidden when no incident is selected', () => {
    render(<IncidentDetailModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows loading state when details are fetching', () => {
    const incident = buildIncident();
    mockFetch(() => new Promise<Response>(() => {}));

    act(() => {
      useIncidentDetailStore.getState().openIncident(incident);
    });

    render(<IncidentDetailModal />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/loading incident detail/i)).toBeInTheDocument();
  });

  it('renders fetched detail content', async () => {
    const incident = buildIncident();
    const detail = buildDetail(incident);

    mockFetch(() => Promise.resolve(jsonResponse(detail)));

    await act(async () => {
      useIncidentDetailStore.getState().openIncident(incident);
    });

    render(<IncidentDetailModal />);

    expect(await screen.findByText(detail.status.name)).toBeInTheDocument();
    expect(screen.getByText(detail.severity.name)).toBeInTheDocument();
    expect(screen.getByText(/responding units/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(useIncidentDetailStore.getState().isOpen).toBe(false);
  });

  it('surfaces errors and allows retry', async () => {
    const incident = buildIncident();
    const fetchMock = mockFetch(() => Promise.resolve(jsonResponse({}, { status: 500 })));

    await act(async () => {
      useIncidentDetailStore.getState().openIncident(incident);
    });

    render(<IncidentDetailModal />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Failed to load incident detail (500)'
    );

    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(buildDetail(incident))));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    });

    expect(await screen.findByText(/responding units/i)).toBeInTheDocument();
  });
});
