import { HttpResponse, http } from 'msw';
import type { IncidentDetail, IncidentListResponse, IncidentMetadata } from '@/types/incidents';
import type {
  DashboardDailyTrend,
  DashboardLast24HoursKpi,
  DashboardRecentIncident,
  DashboardSeverityDistribution,
  DashboardTypeDistribution,
} from '@/types/dashboard';

type ExportResponse = {
  status?: number;
  headers?: Record<string, string>;
  body: string;
};

type DashboardHandlersOptions = {
  incidentsResponse?: IncidentListResponse;
  incidentMetadata?: IncidentMetadata;
  last24h?: DashboardLast24HoursKpi;
  typeDistribution?: DashboardTypeDistribution;
  severityDistribution?: DashboardSeverityDistribution;
  dailyTrend?: DashboardDailyTrend;
  recentIncidents?: DashboardRecentIncident[];
  incidentDetail?: IncidentDetail;
  exportResponse?: ExportResponse;
  onExportRequest?: (url: string) => void;
};

type DashboardErrorOptions = {
  status?: number;
  errorBody?: string;
};

export const defaultDashboardMocks = {
  incidentsResponse: {
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
  } satisfies IncidentListResponse,
  incidentMetadata: {
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
  } satisfies IncidentMetadata,
  last24h: {
    window: { start: '2025-01-10T12:00:00Z', end: '2025-01-11T12:00:00Z' },
    previousWindow: { start: '2025-01-09T12:00:00Z', end: '2025-01-10T12:00:00Z' },
    currentCount: 18,
    previousCount: 14,
    delta: 4,
    deltaPercentage: 28.57,
  } satisfies DashboardLast24HoursKpi,
  typeDistribution: {
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
  } satisfies DashboardTypeDistribution,
  severityDistribution: {
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
  } satisfies DashboardSeverityDistribution,
  dailyTrend: {
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
  } satisfies DashboardDailyTrend,
  recentIncidents: [
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
      primaryStation: { stationCode: 'FS21', name: 'Fire Station 21' },
    },
  ] satisfies DashboardRecentIncident[],
  incidentDetail: {
    incidentNumber: 'INC-200',
    title: 'Warehouse Fire',
    occurrenceAt: '2025-01-08T11:58:00Z',
    reportedAt: '2025-01-08T12:04:00Z',
    dispatchAt: null,
    arrivalAt: null,
    resolvedAt: null,
    isActive: true,
    casualtyCount: 0,
    responderInjuries: 0,
    estimatedDamageAmount: null,
    location: {
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [-122.41, 37.79] },
      properties: {},
    },
    locationGeohash: null,
    externalReference: null,
    type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
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
    primaryStation: { stationCode: 'FS21', name: 'Fire Station 21' },
    narrative: null,
    metadata: { source: 'integration-test' },
    units: [],
    assets: [],
    notes: [],
  },
  exportResponse: {
    body: 'id,title\nINC-100,Uptown Electrical Fire',
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="incidents-export.csv"',
    },
  } satisfies ExportResponse,
};

export const createDashboardHandlers = (options: DashboardHandlersOptions = {}) => {
  const {
    incidentsResponse = defaultDashboardMocks.incidentsResponse,
    incidentMetadata = defaultDashboardMocks.incidentMetadata,
    last24h = defaultDashboardMocks.last24h,
    typeDistribution = defaultDashboardMocks.typeDistribution,
    severityDistribution = defaultDashboardMocks.severityDistribution,
    dailyTrend = defaultDashboardMocks.dailyTrend,
    recentIncidents = defaultDashboardMocks.recentIncidents,
    incidentDetail = defaultDashboardMocks.incidentDetail,
    exportResponse = defaultDashboardMocks.exportResponse,
    onExportRequest,
  } = options;

  return [
    http.get('*/api/incidents', () => HttpResponse.json(incidentsResponse)),
    http.get('*/api/incidents/meta', () => HttpResponse.json(incidentMetadata)),
    http.get('*/api/incidents/search', () =>
      HttpResponse.json({ error: 'Not implemented' }, { status: 404 })
    ),
    http.get('*/api/dashboard/kpi/last-24h', () => HttpResponse.json(last24h)),
    http.get('*/api/dashboard/incidents/by-type', () => HttpResponse.json(typeDistribution)),
    http.get('*/api/dashboard/incidents/severity-distribution', () =>
      HttpResponse.json(severityDistribution)
    ),
    http.get('*/api/dashboard/incidents/daily-trend', () => HttpResponse.json(dailyTrend)),
    http.get('*/api/dashboard/incidents/recent', () => HttpResponse.json(recentIncidents)),
    http.get('*/api/incidents/:incidentNumber', ({ params }) => {
      if ((params?.incidentNumber ?? '').toString().toUpperCase() === 'INC-200') {
        return HttpResponse.json(incidentDetail);
      }
      return HttpResponse.json({ error: 'Not found' }, { status: 404 });
    }),
    http.get('*/api/dashboard/export', ({ request }) => {
      onExportRequest?.(request.url);
      return new HttpResponse(exportResponse.body, {
        status: exportResponse.status ?? 200,
        headers: exportResponse.headers,
      });
    }),
  ];
};

export const createDashboardErrorHandlers = (options: DashboardErrorOptions = {}) => {
  const { status = 500, errorBody = '' } = options;
  const failure = () => HttpResponse.text(errorBody, { status });

  return [
    http.get('*/api/dashboard/kpi/last-24h', failure),
    http.get('*/api/dashboard/incidents/by-type', failure),
    http.get('*/api/dashboard/incidents/severity-distribution', failure),
    http.get('*/api/dashboard/incidents/daily-trend', failure),
    http.get('*/api/dashboard/incidents/recent', failure),
    http.get('*/api/dashboard/export', failure),
  ];
};
