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
    primaryStation: { stationCode: 'ST-102', name: 'Station 102' },
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
    primaryStation: { stationCode: 'ST-102', name: 'Station 102' },
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
  exportRequests?: string[]
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
