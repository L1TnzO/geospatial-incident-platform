import { Readable } from 'stream';
import { DashboardService } from '../../src/services/dashboardService';
import type {
  IncidentListItem,
  IncidentSeverity,
  IncidentStatus,
  IncidentLookupValue,
} from '../../src/db';
import { HttpError } from '../../src/errors/httpError';

describe('DashboardService – CSV export', () => {
  const buildIncident = (): IncidentListItem => {
    const type: IncidentLookupValue = { code: 'FIRE_STRUCTURE', name: 'Structure' };
    const severity: IncidentSeverity = {
      code: 'CRITICAL',
      name: 'Critical',
      description: undefined,
      priority: 4,
      colorHex: '#ff0000',
    };
    const status: IncidentStatus = {
      code: 'ON_SCENE',
      name: 'On Scene',
      description: undefined,
      isTerminal: false,
    };

    return {
      incidentNumber: 'UNIT-001',
      externalReference: null,
      title: 'Structure Fire',
      occurrenceAt: '2025-09-01T10:00:00.000Z',
      reportedAt: '2025-09-01T10:05:00.000Z',
      dispatchAt: null,
      arrivalAt: null,
      resolvedAt: null,
      isActive: true,
      casualtyCount: 0,
      responderInjuries: 0,
      estimatedDamageAmount: null,
      location: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-122.4, 37.78] },
        properties: {},
      },
      locationGeohash: null,
      type,
      severity,
      status,
      source: null,
      weather: null,
      primaryStation: { stationCode: 'STN-01', name: 'Station 01' },
    };
  };

  const createService = (
    overrides: {
      countIncidents?: jest.Mock;
      createIncidentExportStream?: jest.Mock;
      buildFilterOptions?: jest.Mock;
    } = {}
  ) => {
    const repository = {
      countIncidents: overrides.countIncidents ?? jest.fn().mockResolvedValue(1),
      createIncidentExportStream:
        overrides.createIncidentExportStream ??
        jest.fn().mockReturnValue(Readable.from([buildIncident()])),
    };

    const incidentSvc = {
      buildFilterOptions: overrides.buildFilterOptions ?? jest.fn().mockReturnValue({}),
    };

    const service = new DashboardService(repository as never, incidentSvc as never);

    return { service, repository, incidentSvc };
  };

  const streamToString = async (stream: NodeJS.ReadableStream): Promise<string> =>
    new Promise((resolve, reject) => {
      let data = '';
      stream.on('data', (chunk: Buffer | string) => {
        data += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      });
      stream.on('end', () => resolve(data));
      stream.on('error', (error) => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });

  it('throws an error when export total exceeds limit', async () => {
    const { service, repository, incidentSvc } = createService({
      countIncidents: jest.fn().mockResolvedValue(12),
    });

    await expect(
      service.prepareIncidentsExport({ limit: '5' } as Record<
        string,
        string | string[] | undefined
      >)
    ).rejects.toThrow(HttpError);

    expect(repository.createIncidentExportStream).not.toHaveBeenCalled();
    expect(incidentSvc.buildFilterOptions).toHaveBeenCalled();
  });

  it('returns metadata, filename, and column selection for CSV export', async () => {
    const now = new Date('2025-10-05T09:30:00.000Z');
    const { service } = createService({
      countIncidents: jest.fn().mockResolvedValue(1),
    });

    const result = await service.prepareIncidentsExport(
      { includeColumns: 'incidentNumber,severityCode' } as Record<
        string,
        string | string[] | undefined
      >,
      now
    );

    expect(result.filename).toBe('incidents-export-20251005-093000.csv');
    expect(result.total).toBe(1);
    expect(result.selectedColumns.map((col) => col.key)).toEqual([
      'incidentNumber',
      'severityCode',
    ]);

    const csv = await streamToString(result.stream);
    expect(csv).toContain('# Generated At: 2025-10-05T09:30:00.000Z');
    expect(csv).toContain('Incident Number,Severity Code');
    expect(csv).toContain('UNIT-001,CRITICAL');
  });
});
