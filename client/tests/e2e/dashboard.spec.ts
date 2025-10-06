import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

type IncidentSummary = {
  incidentNumber: string;
  title: string;
  occurrenceAt: string;
  reportedAt: string;
  isActive: boolean;
  location: {
    type: string;
    geometry: { type: string; coordinates: [number, number] };
    properties: Record<string, unknown>;
  };
  severity: {
    code: string;
    name: string;
    description: string | null;
    priority: number;
    colorHex: string;
  };
  status: { code: string; name: string; description: string | null; isTerminal: boolean };
  type: { code: string; name: string; description: string | null };
};

type IncidentListEntry = IncidentSummary & {
  dispatchAt: string | null;
  arrivalAt: string | null;
  resolvedAt: string | null;
  casualtyCount: number;
  responderInjuries: number;
  estimatedDamageAmount: string | null;
  externalReference: string | null;
  isActive: boolean;
  locationGeohash: string | null;
  source: unknown;
  weather: unknown;
  primaryStation: { stationCode: string; name: string } | null;
};

const INCIDENTS: IncidentListEntry[] = [
  {
    incidentNumber: 'INC-100',
    title: 'Uptown Electrical Fire',
    occurrenceAt: '2025-01-05T09:15:00Z',
    reportedAt: '2025-01-05T09:18:00Z',
    dispatchAt: '2025-01-05T09:20:00Z',
    arrivalAt: '2025-01-05T09:28:00Z',
    resolvedAt: null,
    isActive: true,
    casualtyCount: 0,
    responderInjuries: 0,
    estimatedDamageAmount: null,
    externalReference: null,
    locationGeohash: null,
    location: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.41, 37.79] },
      properties: {},
    },
    severity: {
      code: 'MODERATE',
      name: 'Moderate',
      description: null,
      priority: 2,
      colorHex: '#f59e0b',
    },
    status: { code: 'REPORTED', name: 'Reported', description: null, isTerminal: false },
    type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
    source: null,
    weather: null,
    primaryStation: { stationCode: 'ST-101', name: 'Station 101' },
  },
  {
    incidentNumber: 'INC-200',
    title: 'Warehouse Fire',
    occurrenceAt: '2025-01-08T12:00:00Z',
    reportedAt: '2025-01-08T12:04:00Z',
    dispatchAt: '2025-01-08T12:06:00Z',
    arrivalAt: '2025-01-08T12:14:00Z',
    resolvedAt: null,
    isActive: true,
    casualtyCount: 0,
    responderInjuries: 0,
    estimatedDamageAmount: null,
    externalReference: null,
    locationGeohash: null,
    location: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.4, 37.78] },
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
    source: null,
    weather: null,
    primaryStation: { stationCode: 'FS21', name: 'Fire Station 21' },
  },
  {
    incidentNumber: 'INC-300',
    title: 'Hazmat Spill',
    occurrenceAt: '2025-01-10T16:20:00Z',
    reportedAt: '2025-01-10T16:24:00Z',
    dispatchAt: '2025-01-10T16:26:00Z',
    arrivalAt: '2025-01-10T16:40:00Z',
    resolvedAt: null,
    isActive: true,
    casualtyCount: 1,
    responderInjuries: 0,
    estimatedDamageAmount: null,
    externalReference: null,
    locationGeohash: null,
    location: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.39, 37.76] },
      properties: {},
    },
    severity: {
      code: 'CRITICAL',
      name: 'Critical',
      description: null,
      priority: 4,
      colorHex: '#b91c1c',
    },
    status: { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
    type: { code: 'HAZMAT', name: 'Hazmat', description: null },
    source: null,
    weather: null,
    primaryStation: { stationCode: 'ST-103', name: 'Station 103' },
  },
];

const INCIDENT_METADATA = {
  types: [
    { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
    { code: 'HAZMAT', name: 'Hazardous Materials', description: null },
  ],
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
  activeCount: INCIDENTS.length,
  limits: { maxPageSize: 100, maxTotalResults: 5000 },
};

const STATIONS_RESPONSE = {
  data: [
    {
      stationCode: 'ST-102',
      name: 'Station 102',
      battalion: 'B2',
      phone: null,
      address: {
        line1: '42 Firehouse Way',
        city: 'Metropolis',
        region: 'CA',
        postalCode: '94102',
      },
      isActive: true,
      commissionedOn: '1990-01-01T00:00:00Z',
      decommissionedOn: null,
      coverageRadiusMeters: 5000,
      location: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-122.4, 37.78] },
        properties: {},
      },
      responseZone: null,
    },
  ],
};

const DASHBOARD_LAST_24H = {
  window: { start: '2025-01-10T12:00:00Z', end: '2025-01-11T12:00:00Z' },
  previousWindow: { start: '2025-01-09T12:00:00Z', end: '2025-01-10T12:00:00Z' },
  currentCount: 18,
  previousCount: 14,
  delta: 4,
  deltaPercentage: 28.57,
};

const DASHBOARD_TYPE_DISTRIBUTION = {
  total: 18,
  buckets: [
    {
      type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
      count: 12,
      percentage: 66.67,
    },
    {
      type: { code: 'HAZMAT', name: 'Hazmat', description: null },
      count: 4,
      percentage: 22.22,
    },
    {
      type: { code: 'MEDICAL', name: 'Medical', description: null },
      count: 2,
      percentage: 11.11,
    },
  ],
};

const DASHBOARD_SEVERITY_DISTRIBUTION = {
  total: 18,
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
      percentage: 44.44,
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
      percentage: 33.33,
    },
    {
      severity: {
        code: 'LOW',
        name: 'Low',
        description: null,
        priority: 1,
        colorHex: '#10b981',
      },
      count: 4,
      percentage: 22.22,
    },
  ],
};

const DASHBOARD_DAILY_TREND = {
  points: [
    { date: '2025-01-04T00:00:00Z', count: 3 },
    { date: '2025-01-05T00:00:00Z', count: 4 },
    { date: '2025-01-06T00:00:00Z', count: 5 },
    { date: '2025-01-07T00:00:00Z', count: 6 },
    { date: '2025-01-08T00:00:00Z', count: 7 },
    { date: '2025-01-09T00:00:00Z', count: 8 },
    { date: '2025-01-10T00:00:00Z', count: 9 },
  ],
  trend: {
    currentTotal: 35,
    previousTotal: 21,
    change: 14,
    percentageChange: 66.67,
    direction: 'up',
  },
};

const DASHBOARD_RECENT_INCIDENTS = [
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
  {
    incidentNumber: 'INC-300',
    title: 'Hazmat Spill',
    occurrenceAt: '2025-01-10T16:20:00Z',
    reportedAt: '2025-01-10T16:24:00Z',
    isActive: true,
    location: {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-122.39, 37.76] },
      properties: {},
    },
    severity: {
      code: 'CRITICAL',
      name: 'Critical',
      description: null,
      priority: 4,
      colorHex: '#b91c1c',
    },
    status: { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
    type: { code: 'HAZMAT', name: 'Hazmat', description: null },
    primaryStation: { stationCode: 'ST-103', name: 'Station 103' },
  },
];

const STRATEGIC_MONTHLY = {
  range: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z', months: 12 },
  series: [
    {
      month: '2024-10',
      label: 'Oct 2024',
      start: '2024-10-01T00:00:00Z',
      end: '2024-10-31T23:59:59Z',
      count: 210,
      previousMonthCount: 190,
      monthOverMonthDelta: 20,
      monthOverMonthPercentage: 10.53,
      previousYearCount: 170,
      yearOverYearDelta: 40,
      yearOverYearPercentage: 23.53,
    },
    {
      month: '2024-11',
      label: 'Nov 2024',
      start: '2024-11-01T00:00:00Z',
      end: '2024-11-30T23:59:59Z',
      count: 240,
      previousMonthCount: 210,
      monthOverMonthDelta: 30,
      monthOverMonthPercentage: 14.29,
      previousYearCount: 200,
      yearOverYearDelta: 40,
      yearOverYearPercentage: 20,
    },
    {
      month: '2024-12',
      label: 'Dec 2024',
      start: '2024-12-01T00:00:00Z',
      end: '2024-12-31T23:59:59Z',
      count: 280,
      previousMonthCount: 240,
      monthOverMonthDelta: 40,
      monthOverMonthPercentage: 16.67,
      previousYearCount: 220,
      yearOverYearDelta: 60,
      yearOverYearPercentage: 27.27,
    },
  ],
  totals: {
    currentPeriodTotal: 730,
    previousPeriodTotal: 600,
    periodDelta: 130,
    periodPercentage: 21.67,
  },
};

const STRATEGIC_QUARTERLY = {
  range: { start: '2023-04-01T00:00:00Z', end: '2024-03-31T23:59:59Z', quarters: 4 },
  series: [
    {
      year: 2023,
      quarter: 4,
      label: 'Q4 2023',
      start: '2023-10-01T00:00:00Z',
      end: '2023-12-31T23:59:59Z',
      count: 600,
      previousQuarterCount: 560,
      quarterOverQuarterDelta: 40,
      quarterOverQuarterPercentage: 7.14,
      previousYearCount: 520,
      yearOverYearDelta: 80,
      yearOverYearPercentage: 15.38,
    },
    {
      year: 2024,
      quarter: 1,
      label: 'Q1 2024',
      start: '2024-01-01T00:00:00Z',
      end: '2024-03-31T23:59:59Z',
      count: 640,
      previousQuarterCount: 600,
      quarterOverQuarterDelta: 40,
      quarterOverQuarterPercentage: 6.67,
      previousYearCount: 540,
      yearOverYearDelta: 100,
      yearOverYearPercentage: 18.52,
    },
  ],
  summary: {
    current: {
      year: 2024,
      quarter: 1,
      label: 'Q1 2024',
      start: '2024-01-01T00:00:00Z',
      end: '2024-03-31T23:59:59Z',
      count: 640,
      previousQuarterCount: 600,
      quarterOverQuarterDelta: 40,
      quarterOverQuarterPercentage: 6.67,
      previousYearCount: 540,
      yearOverYearDelta: 100,
      yearOverYearPercentage: 18.52,
    },
    previous: {
      year: 2023,
      quarter: 4,
      label: 'Q4 2023',
      start: '2023-10-01T00:00:00Z',
      end: '2023-12-31T23:59:59Z',
      count: 600,
      previousQuarterCount: 560,
      quarterOverQuarterDelta: 40,
      quarterOverQuarterPercentage: 7.14,
      previousYearCount: 520,
      yearOverYearDelta: 80,
      yearOverYearPercentage: 15.38,
    },
    delta: 40,
    percentage: 6.67,
    yearOverYearReference: {
      year: 2023,
      quarter: 1,
      label: 'Q1 2023',
      start: '2023-01-01T00:00:00Z',
      end: '2023-03-31T23:59:59Z',
      count: 540,
      previousQuarterCount: 520,
      quarterOverQuarterDelta: 20,
      quarterOverQuarterPercentage: 3.85,
      previousYearCount: 500,
      yearOverYearDelta: 40,
      yearOverYearPercentage: 8,
    },
    yearOverYearDelta: 100,
    yearOverYearPercentage: 18.52,
  },
};

const STRATEGIC_TYPE_TIMELINES = {
  range: { start: '2024-01-01T00:00:00Z', end: '2024-12-31T23:59:59Z', months: 12 },
  totalsByMonth: [
    { month: '2024-11', start: '2024-11-01T00:00:00Z', end: '2024-11-30T23:59:59Z', count: 240 },
    { month: '2024-12', start: '2024-12-01T00:00:00Z', end: '2024-12-31T23:59:59Z', count: 280 },
  ],
  types: [
    {
      type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
      total: 420,
      points: [
        {
          month: '2024-11',
          start: '2024-11-01T00:00:00Z',
          end: '2024-11-30T23:59:59Z',
          count: 190,
        },
        {
          month: '2024-12',
          start: '2024-12-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
          count: 230,
        },
      ],
    },
    {
      type: { code: 'HAZMAT', name: 'Hazmat', description: null },
      total: 180,
      points: [
        { month: '2024-11', start: '2024-11-01T00:00:00Z', end: '2024-11-30T23:59:59Z', count: 80 },
        {
          month: '2024-12',
          start: '2024-12-01T00:00:00Z',
          end: '2024-12-31T23:59:59Z',
          count: 100,
        },
      ],
    },
  ],
};

const STRATEGIC_HOTSPOTS = {
  metadata: {
    resolution: 4,
    cellSizeMeters: 500,
    cellAreaSquareMeters: 250000,
    totalIncidents: 950,
    maxIncidentCount: 120,
    cellCount: 42,
    generatedAt: '2025-01-11T12:00:00Z',
  },
  cells: [
    {
      cellId: 'cell-100',
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-122.42, 37.79],
              [-122.41, 37.79],
              [-122.41, 37.78],
              [-122.42, 37.78],
              [-122.42, 37.79],
            ],
          ],
        },
      },
      centroid: { latitude: 37.785, longitude: -122.415 },
      incidentCount: 120,
      intensity: 1,
    },
    {
      cellId: 'cell-101',
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-122.4, 37.77],
              [-122.39, 37.77],
              [-122.39, 37.76],
              [-122.4, 37.76],
              [-122.4, 37.77],
            ],
          ],
        },
      },
      centroid: { latitude: 37.765, longitude: -122.395 },
      incidentCount: 95,
      intensity: 0.79,
    },
    {
      cellId: 'cell-102',
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-122.38, 37.75],
              [-122.37, 37.75],
              [-122.37, 37.74],
              [-122.38, 37.74],
              [-122.38, 37.75],
            ],
          ],
        },
      },
      centroid: { latitude: 37.745, longitude: -122.375 },
      incidentCount: 72,
      intensity: 0.6,
    },
  ],
};

const STRATEGIC_RESPONSE_METRICS = {
  metadata: {
    groupBy: 'station',
    sampleThreshold: 3,
    totalGroups: 2,
    minAverageSeconds: 240,
    maxAverageSeconds: 480,
    generatedAt: '2025-01-11T12:00:00Z',
  },
  groups: [
    {
      groupType: 'station',
      station: { code: 'ST-101', name: 'Station 101' },
      sampleSize: 12,
      averageSeconds: 260,
      medianSeconds: 250,
      p90Seconds: 410,
      normalizedAverage: 1,
      percentileRank: 1,
      insufficientSample: false,
    },
    {
      groupType: 'station',
      station: { code: 'ST-102', name: 'Station 102' },
      sampleSize: 5,
      averageSeconds: 420,
      medianSeconds: 430,
      p90Seconds: 620,
      normalizedAverage: 0,
      percentileRank: 0,
      insufficientSample: false,
    },
  ],
};

const STRATEGIC_PRIORITY_SCORES = {
  metadata: {
    groupBy: 'station',
    totalGroups: 2,
    minRawScore: 12,
    maxRawScore: 48,
    decayHalfLifeDays: 45,
    generatedAt: '2025-01-11T12:00:00Z',
  },
  groups: [
    {
      groupType: 'station',
      station: { code: 'ST-101', name: 'Station 101' },
      totalIncidents: 24,
      rawScore: 48,
      normalizedScore: 1,
      percentileRank: 1,
      weightSum: 24,
      averageSeverity: 3.6,
    },
    {
      groupType: 'station',
      station: { code: 'ST-102', name: 'Station 102' },
      totalIncidents: 18,
      rawScore: 12,
      normalizedScore: 0.15,
      percentileRank: 0.1,
      weightSum: 18,
      averageSeverity: 1.8,
    },
  ],
};

type SearchParams = URLSearchParams;

const buildListResponse = (items: IncidentListEntry[]) => ({
  data: items,
  pagination: {
    page: 1,
    pageSize: 25,
    total: items.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
    sortBy: 'reportedAt',
    sortDirection: 'desc',
  },
});

const filterIncidents = (params: SearchParams) => {
  let items = INCIDENTS;
  const incidentNumber = params.get('incidentNumber');
  const severityCodes = params.get('severityCodes')?.split(',') ?? [];
  const statusCodes = params.get('statusCodes')?.split(',') ?? [];
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');

  if (incidentNumber) {
    const normalized = incidentNumber.toUpperCase();
    items = items.filter((incident) => incident.incidentNumber === normalized);
  }

  if (severityCodes.length > 0) {
    items = items.filter((incident) => severityCodes.includes(incident.severity.code));
  }

  if (statusCodes.length > 0) {
    items = items.filter((incident) => statusCodes.includes(incident.status.code));
  }

  if (startDate && endDate) {
    const start = Date.parse(startDate);
    const end = Date.parse(endDate);
    items = items.filter((incident) => {
      const occurrence = Date.parse(incident.occurrenceAt);
      return occurrence >= start && occurrence <= end;
    });
  }

  return items;
};

const configureApiRoutes = async (
  page: Page,
  incidentsRequests: string[],
  exportRequests?: string[],
  strategicMonthlyRequests?: string[]
) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    sessionStorage.clear();
  });

  await page.route('https://tile.openstreetmap.org/**', (route: Route) =>
    route.fulfill({ status: 204, body: '' })
  );

  await page.route('**/api/dashboard/kpi/last-24h**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DASHBOARD_LAST_24H),
    })
  );

  await page.route('**/api/dashboard/incidents/by-type**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DASHBOARD_TYPE_DISTRIBUTION),
    })
  );

  await page.route('**/api/dashboard/incidents/severity-distribution**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DASHBOARD_SEVERITY_DISTRIBUTION),
    })
  );

  await page.route('**/api/dashboard/incidents/daily-trend**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DASHBOARD_DAILY_TREND),
    })
  );

  await page.route('**/api/dashboard/incidents/recent**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DASHBOARD_RECENT_INCIDENTS),
    })
  );

  await page.route('**/api/strategic/trends/monthly**', (route: Route) => {
    const requestUrl = route.request().url();
    strategicMonthlyRequests?.push(requestUrl);
    const url = new URL(requestUrl);
    const months = Number(url.searchParams.get('months') ?? '12');
    const sliceCount = Math.min(months, STRATEGIC_MONTHLY.series.length);
    const responseBody = {
      ...STRATEGIC_MONTHLY,
      range: { ...STRATEGIC_MONTHLY.range, months },
      series: STRATEGIC_MONTHLY.series.slice(-sliceCount),
    };

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    });
  });

  await page.route('**/api/strategic/trends/quarters**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STRATEGIC_QUARTERLY),
    })
  );

  await page.route('**/api/strategic/trends/types**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STRATEGIC_TYPE_TIMELINES),
    })
  );

  await page.route('**/api/strategic/hotspots**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STRATEGIC_HOTSPOTS),
    })
  );

  await page.route('**/api/strategic/response-metrics**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STRATEGIC_RESPONSE_METRICS),
    })
  );

  await page.route('**/api/strategic/priority-scores**', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STRATEGIC_PRIORITY_SCORES),
    })
  );

  await page.route('**/api/dashboard/export**', async (route: Route) => {
    exportRequests?.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'text/csv',
      headers: {
        'Content-Disposition': 'attachment; filename="incidents-export.csv"',
      },
      body: 'id,title\nINC-200,Warehouse Fire',
    });
  });

  await page.route('**/api/incidents/meta', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(INCIDENT_METADATA),
    })
  );

  await page.route('**/api/incidents/search**', (route: Route) => {
    const url = new URL(route.request().url());
    const incidentNumber = url.searchParams.get('incidentNumber')?.toUpperCase() ?? '';
    const match = INCIDENTS.find((incident) => incident.incidentNumber === incidentNumber);

    if (!match) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    }

    const summary: IncidentSummary = {
      incidentNumber: match.incidentNumber,
      title: match.title,
      occurrenceAt: match.occurrenceAt,
      reportedAt: match.reportedAt,
      isActive: match.isActive,
      location: match.location,
      severity: match.severity,
      status: match.status,
      type: match.type,
    };

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(summary),
    });
  });

  await page.route('**/api/incidents/*', (route: Route) => {
    const url = new URL(route.request().url());
    const match = url.pathname.match(/\/api\/incidents\/([^/]+)$/);
    if (!match) {
      return route.fallback();
    }
    const incidentNumber = match[1]?.toUpperCase();
    const detail = INCIDENTS.find((incident) => incident.incidentNumber === incidentNumber);
    if (!detail) {
      return route.fulfill({ status: 404 });
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...detail,
        narrative: null,
        metadata: { source: 'playwright' },
        units: [],
        assets: [],
        notes: [],
      }),
    });
  });

  await page.route('**/api/incidents**', (route: Route) => {
    const url = new URL(route.request().url());
    if (url.pathname.match(/\/api\/incidents\/[^/]+$/)) {
      return route.fallback();
    }
    incidentsRequests.push(url.toString());
    const items = filterIncidents(url.searchParams);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildListResponse(items)),
    });
  });

  await page.route('**/api/stations', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(STATIONS_RESPONSE),
    })
  );
};

test('filters incidents, searches by number, and opens detail modal', async ({ page }) => {
  const incidentsRequests: string[] = [];
  await configureApiRoutes(page, incidentsRequests);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('table[role="table"] tbody tr');

  const table = page.getByRole('table');

  await expect(page.getByRole('heading', { name: /incident overview/i })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Uptown Electrical Fire' })).toBeVisible();

  await page.getByLabel('Critical').check();
  await page.getByLabel('On Scene').check();

  await page.getByLabel('Start', { exact: true }).fill('2025-01-07');
  await page.getByLabel('End', { exact: true }).fill('2025-01-12');

  const applyButton = page.getByRole('button', { name: /apply filters/i });
  await expect(applyButton).toBeEnabled();
  await applyButton.click();

  await expect(table.getByRole('cell', { name: 'Warehouse Fire' })).toBeVisible();
  await expect(table.getByRole('cell', { name: 'Uptown Electrical Fire' })).toHaveCount(0);

  expect(
    incidentsRequests.some(
      (url) =>
        url.includes('severityCodes=CRITICAL') &&
        url.includes('statusCodes=ON_SCENE') &&
        url.includes('startDate=2025-01-07T00%3A00%3A00.000Z') &&
        url.includes('endDate=2025-01-12T23%3A59%3A59.999Z')
    )
  ).toBeTruthy();

  await page.getByLabel(/incident search/i).fill('inc-300');
  await page.getByRole('button', { name: /search incidents/i }).click();

  await expect(table.getByRole('cell', { name: 'Hazmat Spill' })).toBeVisible();
  await table
    .getByRole('row', { name: /INC-300/i })
    .getByRole('button', { name: /view details/i })
    .click();
  await page.waitForSelector('[role="dialog"]');
  await expect(page.getByRole('dialog')).toContainText('INC-300');

  expect(incidentsRequests.some((url) => url.includes('incidentNumber=INC-300'))).toBeTruthy();
});

test('dashboard analytics screen renders navigation and placeholders', async ({ page }) => {
  const incidentsRequests: string[] = [];
  const exportRequests: string[] = [];
  await configureApiRoutes(page, incidentsRequests, exportRequests);

  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
    'aria-current',
    'page'
  );
  await expect(page.getByRole('heading', { name: /dashboard analytics/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /key performance indicators/i })).toBeVisible();
  await expect(page.getByText('Incidents (last 24h)')).toBeVisible();
  await expect(page.getByText('+4')).toBeVisible();
  await expect(page.getByText('+28.6%')).toBeVisible();
  await expect(page.getByText(/vs previous 24h/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /refresh kpi/i })).toBeVisible();
  await expect(page.getByText(/structure fire/i)).toBeVisible();
  const structureFireItem = page.getByRole('listitem', {
    name: /structure fire: 12 incidents \(66\.7%\)/i,
  });
  const hazmatItem = page.getByRole('listitem', { name: /hazmat: 4 incidents \(22\.2%\)/i });
  const medicalItem = page.getByRole('listitem', { name: /medical: 2 incidents \(11\.1%\)/i });

  await expect(structureFireItem).toBeVisible();
  await expect(hazmatItem).toBeVisible();
  await expect(medicalItem).toBeVisible();

  await expect(structureFireItem.locator('.dashboard-type-chart__bar-value span')).toHaveText('12');
  await expect(hazmatItem.locator('.dashboard-type-chart__bar-value span')).toHaveText('4');
  await expect(medicalItem.locator('.dashboard-type-chart__bar-value span')).toHaveText('2');

  const severityChart = page.getByRole('img', { name: /incident counts by severity/i });
  await expect(severityChart).toBeVisible();
  const criticalItem = page.getByRole('listitem', {
    name: /critical: 8 incidents \(44\.4%\)/i,
  });
  const moderateItem = page.getByRole('listitem', {
    name: /moderate: 6 incidents \(33\.3%\)/i,
  });
  const lowItem = page.getByRole('listitem', { name: /low: 4 incidents \(22\.2%\)/i });

  await expect(criticalItem).toBeVisible();
  await expect(moderateItem).toBeVisible();
  await expect(lowItem).toBeVisible();
  await expect(criticalItem.locator('.dashboard-severity-chart__legend-value')).toHaveText(
    /8 · 44\.4%/i
  );
  await expect(moderateItem.locator('.dashboard-severity-chart__legend-value')).toHaveText(
    /6 · 33\.3%/i
  );
  await expect(lowItem.locator('.dashboard-severity-chart__legend-value')).toHaveText(
    /4 · 22\.2%/i
  );
  const trendFigure = page.getByRole('figure', { name: /incident counts per day/i });
  await expect(trendFigure).toBeVisible();
  await expect(page.getByText(/7-day trend:/i)).toBeVisible();
  await expect(page.getByText(/current 7-day total/i)).toBeVisible();

  const exportButton = page.getByRole('button', { name: /export csv/i });
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await expect(page.getByText(/export ready/i)).toBeVisible();
  expect(exportRequests).toHaveLength(1);
  await page.getByRole('button', { name: /download again/i }).click();
  await page.getByRole('button', { name: /dismiss/i }).click();
  await page.waitForSelector('text=Export ready', { state: 'detached' });

  const recentItem = page.getByRole('listitem', { name: /INC-200/i });
  await expect(recentItem).toBeVisible();
  await expect(recentItem.locator('.dashboard-recent__station')).toHaveText(
    /Fire Station 21 \(FS21\)/i
  );
  await recentItem.getByRole('button', { name: /view on map/i }).click();
  await page.getByRole('link', { name: /overview/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.waitForSelector('table[role="table"] tbody tr');
  await expect(page.locator('.incident-table__row--selected')).toContainText('INC-200');
  await page.getByRole('link', { name: /dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const dashboardRecentItem = page.getByRole('listitem', { name: /INC-200/i });
  await expect(dashboardRecentItem).toBeVisible();
  await dashboardRecentItem.getByRole('button', { name: /open details/i }).click();
  await expect(page.getByRole('dialog')).toContainText('INC-200');
  await page.getByRole('button', { name: /^close$/i }).click();
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });

  await page.getByRole('button', { name: /percentage/i }).click();
  await expect(page.getByRole('button', { name: /percentage/i })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(structureFireItem.locator('.dashboard-type-chart__bar-value span')).toHaveText(
    '66.7%'
  );
  await expect(hazmatItem.locator('.dashboard-type-chart__bar-value span')).toHaveText('22.2%');
  await expect(medicalItem.locator('.dashboard-type-chart__bar-value span')).toHaveText('11.1%');
  await expect(page.getByText('INC-200')).toBeVisible();
});

test('strategic analytics screen renders trend, composition, and refresh controls', async ({
  page,
}) => {
  const incidentsRequests: string[] = [];
  const strategicMonthlyRequests: string[] = [];
  await configureApiRoutes(page, incidentsRequests, undefined, strategicMonthlyRequests);

  await page.goto('/strategic');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('link', { name: /strategic/i })).toHaveAttribute(
    'aria-current',
    'page'
  );

  await expect(page.getByRole('heading', { name: /strategic analytics/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /trend intelligence/i })).toBeVisible();
  await expect(page.getByRole('article', { name: /monthly trendline/i })).toContainText('730');
  await expect(
    page.getByRole('figure', { name: /monthly incident counts compared to previous year/i })
  ).toBeVisible();
  await expect(page.getByRole('article', { name: /quarterly comparison/i })).toContainText(
    /quarter-over-quarter change/i
  );
  await expect(page.getByRole('article', { name: /incident type timelines/i })).toContainText(
    /structure fire/i
  );
  await expect(page.getByRole('article', { name: /hotspot heatmap preview/i })).toContainText(
    /120 incidents/i
  );
  await expect(page.getByRole('article', { name: /response readiness snapshot/i })).toContainText(
    /260s/i
  );
  await expect(page.getByRole('article', { name: /priority score leaders/i })).toContainText(
    /score 1\.00/i
  );

  const timeframeSix = page.getByRole('button', { name: '6m' });
  const timeframeTwelve = page.getByRole('button', { name: '12m' });
  await expect(timeframeTwelve).toHaveAttribute('aria-pressed', 'true');

  const initialRequestCount = strategicMonthlyRequests.length;
  await timeframeSix.click();
  await expect.poll(() => strategicMonthlyRequests.length).toBe(initialRequestCount + 1);
  expect(strategicMonthlyRequests.at(-1)).toContain('months=6');
  await expect(timeframeSix).toHaveAttribute('aria-pressed', 'true');

  const afterSixCount = strategicMonthlyRequests.length;
  await timeframeTwelve.click();
  await expect.poll(() => strategicMonthlyRequests.length).toBe(afterSixCount);
  await expect(timeframeTwelve).toHaveAttribute('aria-pressed', 'true');

  const refreshAll = page.getByRole('button', { name: /refresh all/i });
  await refreshAll.click();

  await expect(refreshAll).toBeEnabled();
  await expect(page.getByText(/last updated/i)).toBeVisible();

  await page.getByRole('link', { name: /dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
