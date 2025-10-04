import { render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import DashboardPage from '@/pages/DashboardPage';
import type { IncidentListResponse, IncidentMetadata } from '@/types/incidents';
import type { DashboardRecentIncident, DashboardSummary } from '@/types/dashboard';
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

const DASHBOARD_SUMMARY: DashboardSummary = {
  kpis: [
    { id: 'activeIncidents', label: 'Active incidents', value: 18, unit: null, delta: 4.2 },
    { id: 'criticalShare', label: 'Critical share', value: 42, unit: '%', delta: 1.5 },
  ],
  typeDistribution: [
    { id: 'FIRE_STRUCTURE', label: 'Structure Fire', value: 12 },
    { id: 'HAZMAT', label: 'Hazmat', value: 4 },
  ],
  severityDistribution: [
    { id: 'CRITICAL', label: 'Critical', value: 8 },
    { id: 'MODERATE', label: 'Moderate', value: 6 },
  ],
  dailyTrend: [
    { date: '2025-01-08', count: 5 },
    { date: '2025-01-09', count: 7 },
    { date: '2025-01-10', count: 6 },
  ],
  generatedAt: '2025-01-11T12:00:00Z',
};

const DASHBOARD_RECENT_INCIDENTS: DashboardRecentIncident[] = [
  {
    incidentNumber: 'INC-200',
    title: 'Warehouse Fire',
    severity: { code: 'CRITICAL', name: 'Critical' },
    status: { code: 'ON_SCENE', name: 'On Scene' },
    reportedAt: '2025-01-08T12:04:00Z',
  },
];

const server = setupServer(
  http.get('*/api/incidents', () => HttpResponse.json(INCIDENTS_RESPONSE)),
  http.get('*/api/incidents/meta', () => HttpResponse.json(INCIDENT_METADATA)),
  http.get('*/api/incidents/search', () =>
    HttpResponse.json({ error: 'Not implemented' }, { status: 404 })
  ),
  http.get('*/api/dashboard/summary', () => HttpResponse.json(DASHBOARD_SUMMARY)),
  http.get('*/api/dashboard/recent-incidents', () => HttpResponse.json(DASHBOARD_RECENT_INCIDENTS))
);

describe('DashboardPage analytics integration', () => {
  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    clearIncidentMetadataCache();
    localStorage.clear();
    resetIncidentDetailStore({ clearStorage: true });
    resetMapPreferencesStore();
    useMapStore.setState({ center: [40.7128, -74.006], zoom: 11 });
  });

  afterAll(() => {
    server.close();
  });

  it('renders dashboard sections with loaded data', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(screen.queryByText(/loading kpi metrics/i)).not.toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /dashboard analytics/i })).toBeInTheDocument();
    expect(screen.getByText('Active incidents')).toBeInTheDocument();
    expect(screen.getByText(/critical share/i)).toBeInTheDocument();
    expect(screen.getByText(/structure fire/i)).toBeInTheDocument();
    expect(screen.getByText('Warehouse Fire')).toBeInTheDocument();
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();
  });

  it('surfaces error states when dashboard endpoints fail', async () => {
    server.use(
      http.get('*/api/dashboard/summary', () => HttpResponse.text('', { status: 500 })),
      http.get('*/api/dashboard/recent-incidents', () => HttpResponse.text('', { status: 500 }))
    );

    render(<DashboardPage />);

    const summaryErrors = await screen.findAllByText(
      /failed to fetch dashboard summary \(status 500\)/i
    );
    expect(summaryErrors).toHaveLength(2);
    expect(
      screen.getByText(/failed to fetch dashboard recent incidents \(status 500\)/i)
    ).toBeInTheDocument();
  });
});
