import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { IncidentListItem, IncidentListResponse } from '@/types/incidents';
import { fetchIncidentTableData } from './incidentsTableService';

const fetchIncidentsMock = vi.hoisted(() => vi.fn());

vi.mock('./incidentsService', async () => {
  const actual = await vi.importActual<typeof import('./incidentsService')>('./incidentsService');
  return {
    ...actual,
    fetchIncidents: fetchIncidentsMock,
  };
});

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-001',
  title: 'Test Incident',
  externalReference: null,
  occurrenceAt: new Date().toISOString(),
  reportedAt: new Date().toISOString(),
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
    geometry: {
      type: 'Point',
      coordinates: [-73.9857, 40.7484],
    },
    properties: {},
  },
  type: { code: 'FIRE', name: 'Fire', description: null },
  severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
  status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
  source: null,
  weather: null,
  primaryStation: null,
  ...overrides,
});

const buildResponse = (overrides: Partial<IncidentListResponse> = {}): IncidentListResponse => ({
  data: [buildIncident()],
  pagination: {
    page: 1,
    pageSize: 25,
    total: 50,
    totalPages: 2,
    hasNext: true,
    hasPrevious: false,
    sortBy: 'reportedAt',
    sortDirection: 'desc',
  },
  ...overrides,
});

describe('fetchIncidentTableData', () => {
  beforeEach(() => {
    fetchIncidentsMock.mockReset();
  });

  it('passes sanitized pagination and sorting to fetchIncidents', async () => {
    const response = buildResponse();
    fetchIncidentsMock.mockResolvedValue(response);

    await fetchIncidentTableData({
      page: -5,
      pageSize: 250,
      sortBy: 'occurrenceAt',
      sortDirection: 'asc',
    });

    expect(fetchIncidentsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 100,
        sortBy: 'occurrenceAt',
        sortDirection: 'asc',
      })
    );
  });

  it('applies defaults when filters omitted', async () => {
    const response = buildResponse();
    fetchIncidentsMock.mockResolvedValue(response);

    const result = await fetchIncidentTableData();

    expect(fetchIncidentsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pageSize: 25,
        sortBy: 'reportedAt',
        sortDirection: 'desc',
      })
    );
    expect(result.rows).toEqual(response.data);
    expect(result.pagination.nextPage).toBe(2);
    expect(result.pagination.previousPage).toBeNull();
    expect(result.pagination.remainder).toBe(25);
  });

  it('calculates remainder and cursor metadata with boundary conditions', async () => {
    const response = buildResponse({
      pagination: {
        page: 3,
        pageSize: 20,
        total: 60,
        totalPages: 3,
        hasNext: false,
        hasPrevious: true,
        sortBy: 'severityPriority',
        sortDirection: 'desc',
      },
    });

    fetchIncidentsMock.mockResolvedValue(response);

    const result = await fetchIncidentTableData({ page: 3, pageSize: 20 });

    expect(result.pagination.remainder).toBe(0);
    expect(result.pagination.nextPage).toBeNull();
    expect(result.pagination.previousPage).toBe(2);
    expect(result.pagination.sortBy).toBe('severityPriority');
    expect(result.pagination.sortDirection).toBe('desc');
  });
});
