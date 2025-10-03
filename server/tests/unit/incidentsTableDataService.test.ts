import { describe, expect, it, jest } from '@jest/globals';
import type { IncidentListItem } from '../../src/db';
import type {
  IncidentListOptions,
  IncidentListResponse,
} from '../../src/services/incidentsService';
import {
  IncidentsTableDataService,
  buildIncidentListQuery,
  buildIncidentTablePagination,
} from '../../src/services/incidentsTableDataService';

describe('buildIncidentListQuery', () => {
  it('normalises filter values and trims arrays', () => {
    const query = buildIncidentListQuery({
      page: 2,
      pageSize: 50,
      sortBy: 'occurrenceAt',
      sortDirection: 'asc',
      typeCodes: [' FIRE_STRUCTURE ', ''],
      severityCodes: ['CRITICAL', ' MODERATE '],
      statusCodes: [' REPORTED '],
      startDate: '2025-09-01T00:00:00Z',
      endDate: '   ',
      isActive: false,
    });

    expect(query).toEqual({
      page: '2',
      pageSize: '50',
      sortBy: 'occurrenceAt',
      sortDirection: 'asc',
      typeCodes: 'FIRE_STRUCTURE',
      severityCodes: 'CRITICAL,MODERATE',
      statusCodes: 'REPORTED',
      startDate: '2025-09-01T00:00:00Z',
      isActive: 'false',
    });
  });

  it('omits empty lists and undefined filters', () => {
    const query = buildIncidentListQuery({});

    expect(query).toEqual({});
  });
});

describe('buildIncidentTablePagination', () => {
  it('adds cursor helpers and remainder calculation', () => {
    const summary = buildIncidentTablePagination({
      page: 2,
      pageSize: 25,
      total: 240,
      totalPages: 10,
      hasNext: true,
      hasPrevious: true,
      sortBy: 'reportedAt',
      sortDirection: 'desc',
    });

    expect(summary.nextPage).toBe(3);
    expect(summary.previousPage).toBe(1);
    expect(summary.remainder).toBe(190);
  });

  it('handles first and last page boundaries', () => {
    const summary = buildIncidentTablePagination({
      page: 1,
      pageSize: 50,
      total: 50,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      sortBy: 'reportedAt',
      sortDirection: 'desc',
    });

    expect(summary.nextPage).toBeNull();
    expect(summary.previousPage).toBeNull();
    expect(summary.remainder).toBe(0);
  });
});

describe('IncidentsTableDataService', () => {
  it('builds queries, delegates to IncidentService, and enhances pagination metadata', async () => {
    const mockOptions: IncidentListOptions = {
      page: 2,
      pageSize: 25,
      sortBy: 'reportedAt',
      sortDirection: 'desc',
      severityCodes: ['CRITICAL'],
      isActive: true,
    };

    const mockResponse: IncidentListResponse = {
      data: [] as IncidentListItem[],
      pagination: {
        page: 2,
        pageSize: 25,
        total: 60,
        totalPages: 3,
        hasNext: true,
        hasPrevious: true,
        sortBy: 'reportedAt' as const,
        sortDirection: 'desc' as const,
      },
    };

    const buildListOptions = jest
      .fn<(query: Record<string, string | string[] | undefined>) => IncidentListOptions>()
      .mockReturnValue(mockOptions);
    const listIncidents = jest
      .fn<(options: IncidentListOptions) => Promise<IncidentListResponse>>()
      .mockResolvedValue(mockResponse);

    const service = new IncidentsTableDataService({
      buildListOptions,
      listIncidents,
    });

    const result = await service.fetchTableData({
      page: 2,
      severityCodes: ['CRITICAL'],
      isActive: true,
    });

    expect(buildListOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        page: '2',
        severityCodes: 'CRITICAL',
        isActive: 'true',
      })
    );
    expect(listIncidents).toHaveBeenCalledWith(mockOptions);
    expect(result.rows).toBe(mockResponse.data);
    expect(result.pagination.nextPage).toBe(3);
    expect(result.pagination.previousPage).toBe(1);
    expect(result.pagination.remainder).toBe(10);
  });
});
