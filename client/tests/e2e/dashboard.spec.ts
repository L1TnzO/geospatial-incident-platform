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

const configureApiRoutes = async (page: Page, incidentsRequests: string[]) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    sessionStorage.clear();
  });

  await page.route('https://tile.openstreetmap.org/**', (route: Route) =>
    route.fulfill({ status: 204, body: '' })
  );

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
