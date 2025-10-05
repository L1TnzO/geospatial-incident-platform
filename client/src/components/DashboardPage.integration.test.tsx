import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import DashboardPage from '@/pages/DashboardPage';
import type { IncidentListResponse, IncidentMetadata } from '@/types/incidents';
import type {
  DashboardDailyTrend,
  DashboardLast24HoursKpi,
  DashboardRecentIncident,
  DashboardSeverityDistribution,
  DashboardTypeDistribution,
} from '@/types/dashboard';
import { clearIncidentMetadataCache } from '@/services/incidentsMetaService';
import { resetIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { resetMapPreferencesStore } from '@/store/useMapPreferencesStore';
import { useMapStore } from '@/store/useMapStore';

const INCIDENTS_RESPONSE: IncidentListResponse = {
  data: [
    {
      incidentNumber: 'INC-100',
      title: 'Uptown Electrical Fire',
      externalReference: null,
      occurrenceAt: '2025-01-05T09:15:00Z',
      reportedAt: '2025-01-05T09:18:00Z',
      dispatchAt: null,
      arrivalAt: null,
      resolvedAt: null,
      isActive: true,
      casualtyCount: 0,
      responderInjuries: 0,
      estimatedDamageAmount: null,
      locationGeohash: null,
      location: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-122.41, 37.79] },
        properties: {},
      },
      type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
      severity: {
        code: 'MODERATE',
        name: 'Moderate',
        description: null,
        priority: 2,
        colorHex: '#f59e0b',
      },
      status: { code: 'REPORTED', name: 'Reported', description: null, isTerminal: false },
      source: null,
      weather: null,
      primaryStation: null,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 25,
    total: 1,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    sortBy: 'reportedAt',
    sortDirection: 'desc',
  },
};

const INCIDENT_METADATA: IncidentMetadata = {
  types: [{ code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null }],
  severities: [
    { code: 'CRITICAL', name: 'Critical', description: null, priority: 4, colorHex: '#dc2626' },
    { code: 'MODERATE', name: 'Moderate', description: null, priority: 2, colorHex: '#f59e0b' },
  ],
  statuses: [
    { code: 'REPORTED', name: 'Reported', description: null, isTerminal: false },
    { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
  ],
  occurrenceRange: { start: '2025-01-01T00:00:00Z', end: '2025-01-31T23:59:59Z' },
  reportedRange: { start: '2025-01-01T00:00:00Z', end: '2025-01-31T23:59:59Z' },
  activeCount: 1,
  limits: { maxPageSize: 100, maxTotalResults: 5000 },
};

const DASHBOARD_LAST_24H: DashboardLast24HoursKpi = {
  window: { start: '2025-01-10T12:00:00Z', end: '2025-01-11T12:00:00Z' },
  previousWindow: { start: '2025-01-09T12:00:00Z', end: '2025-01-10T12:00:00Z' },
  currentCount: 18,
  previousCount: 14,
  delta: 4,
  deltaPercentage: 28.57,
};

const DASHBOARD_TYPE_DISTRIBUTION: DashboardTypeDistribution = {
  total: 16,
  buckets: [
    {
      type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
      count: 12,
      percentage: 75,
    },
    {
      type: { code: 'HAZMAT', name: 'Hazmat', description: null },
      count: 4,
      percentage: 25,
    },
  ],
};

const DASHBOARD_SEVERITY_DISTRIBUTION: DashboardSeverityDistribution = {
  total: 14,
  buckets: [
    {
      severity: {
        code: 'CRITICAL',
        name: 'Critical',
        description: null,
        priority: 4,
        colorHex: '#dc2626',
      },
      count: 8,
      percentage: 57.14,
    },
    {
      severity: {
        code: 'MODERATE',
        name: 'Moderate',
        description: null,
        priority: 2,
        colorHex: '#f59e0b',
      },
      count: 6,
      percentage: 42.86,
    },
  ],
};

const DASHBOARD_DAILY_TREND: DashboardDailyTrend = {
  points: [
    { date: '2025-01-04T00:00:00Z', count: 2 },
    { date: '2025-01-05T00:00:00Z', count: 3 },
    { date: '2025-01-06T00:00:00Z', count: 4 },
    { date: '2025-01-07T00:00:00Z', count: 5 },
    { date: '2025-01-08T00:00:00Z', count: 6 },
    { date: '2025-01-09T00:00:00Z', count: 7 },
    { date: '2025-01-10T00:00:00Z', count: 8 },
  ],
  trend: {
    currentTotal: 30,
    previousTotal: 18,
    change: 12,
    percentageChange: 66.67,
    direction: 'up',
  },
};

const DASHBOARD_RECENT_INCIDENTS: DashboardRecentIncident[] = [
  {
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
    primaryStation: null,
  },
];

const exportRequests: string[] = [];

const server = setupServer(
  http.get('*/api/incidents', () => HttpResponse.json(INCIDENTS_RESPONSE)),
  http.get('*/api/incidents/meta', () => HttpResponse.json(INCIDENT_METADATA)),
  http.get('*/api/incidents/search', () =>
    HttpResponse.json({ error: 'Not implemented' }, { status: 404 })
  ),
  http.get('*/api/dashboard/kpi/last-24h', () => HttpResponse.json(DASHBOARD_LAST_24H)),
  http.get('*/api/dashboard/incidents/by-type', () =>
    HttpResponse.json(DASHBOARD_TYPE_DISTRIBUTION)
  ),
  http.get('*/api/dashboard/incidents/severity-distribution', () =>
    HttpResponse.json(DASHBOARD_SEVERITY_DISTRIBUTION)
  ),
  http.get('*/api/dashboard/incidents/daily-trend', () => HttpResponse.json(DASHBOARD_DAILY_TREND)),
  http.get('*/api/dashboard/incidents/recent', () => HttpResponse.json(DASHBOARD_RECENT_INCIDENTS)),
  http.get('*/api/dashboard/export', ({ request }) => {
    exportRequests.push(request.url);
    return new HttpResponse('id,title\nINC-100,Uptown Electrical Fire', {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="incidents-export.csv"',
      },
    });
  })
);

const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;
const createObjectUrlMock = vi.fn(() => 'blob:dashboard-export');
const revokeObjectUrlMock = vi.fn();

describe('DashboardPage analytics integration', () => {
  beforeAll(() => {
    global.URL.createObjectURL = createObjectUrlMock;
    global.URL.revokeObjectURL = revokeObjectUrlMock;
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    clearIncidentMetadataCache();
    localStorage.clear();
    resetIncidentDetailStore({ clearStorage: true });
    resetMapPreferencesStore();
    useMapStore.setState({ center: [40.7128, -74.006], zoom: 11 });
    exportRequests.length = 0;
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
  });

  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    server.close();
  });

  it('renders dashboard sections with loaded data', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(screen.queryByText(/loading kpi metrics/i)).not.toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /dashboard analytics/i })).toBeInTheDocument();
    const kpiHeading = screen.getByText(/incidents \(last 24h\)/i);
    const kpiCard = kpiHeading.closest('article');
    expect(kpiCard).not.toBeNull();
    const kpi = within(kpiCard as HTMLElement);
    expect(kpi.getByText(/incidents \(last 24h\)/i)).toBeInTheDocument();
    expect(kpi.getByText('18')).toBeInTheDocument();
    expect(kpi.getByText('+4')).toBeInTheDocument();
    expect(kpi.getByText('+28.6%')).toBeInTheDocument();
    expect(kpi.getByText(/vs previous 24h/i)).toBeInTheDocument();
    expect(kpi.getByRole('button', { name: /refresh kpi/i })).toBeInTheDocument();
    expect(screen.getByText(/structure fire/i)).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', { name: /structure fire: 12 incidents \(75\.0%\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', { name: /hazmat: 4 incidents \(25\.0%\)/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /incident counts by severity/i })).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', { name: /critical: 8 incidents \(57\.1%\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', { name: /moderate: 6 incidents \(42\.9%\)/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /percentage/i }));
    expect(screen.getByText(/75.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/25.0%/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /percentage/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('figure', { name: /incident counts per day/i })).toBeInTheDocument();
    expect(screen.getByText(/7-day trend:/i)).toBeInTheDocument();
    expect(screen.getByText(/current 7-day total/i)).toBeInTheDocument();
    expect(screen.getByText('Warehouse Fire')).toBeInTheDocument();
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);
    expect(screen.getByRole('button', { name: /exporting…/i })).toBeDisabled();
    await screen.findByText(/export ready/i);
    expect(exportRequests).toHaveLength(1);
    expect(exportRequests[0]).toContain('/api/dashboard/export');
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /download again/i }));
    expect(createObjectUrlMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitFor(() => expect(screen.queryByText(/export ready/i)).not.toBeInTheDocument());
  });

  it('surfaces error states when dashboard endpoints fail', async () => {
    server.use(
      http.get('*/api/dashboard/kpi/last-24h', () => HttpResponse.text('', { status: 500 })),
      http.get('*/api/dashboard/incidents/by-type', () => HttpResponse.text('', { status: 500 })),
      http.get('*/api/dashboard/incidents/severity-distribution', () =>
        HttpResponse.text('', { status: 500 })
      ),
      http.get('*/api/dashboard/incidents/daily-trend', () =>
        HttpResponse.text('', { status: 500 })
      ),
      http.get('*/api/dashboard/incidents/recent', () => HttpResponse.text('', { status: 500 })),
      http.get('*/api/dashboard/export', () => HttpResponse.text('Export failed', { status: 500 }))
    );

    render(<DashboardPage />);

    await screen.findByText(/failed to fetch dashboard last-24-hours kpi \(status 500\)/i);
    expect(screen.getAllByRole('button', { name: /try again/i })).toHaveLength(4);
    expect(
      screen.getByText(/failed to fetch dashboard incidents by type \(status 500\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/failed to fetch dashboard severity distribution \(status 500\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/failed to fetch dashboard daily trend \(status 500\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/failed to fetch dashboard recent incidents \(status 500\)/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await screen.findByText(/export failed/i);
    expect(screen.getByRole('button', { name: /retry export/i })).toBeInTheDocument();
  });
});
