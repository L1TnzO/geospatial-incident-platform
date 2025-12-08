import type { Request, Response, NextFunction } from 'express';
import * as dashboardController from '../../src/controllers/dashboardController';
import { dashboardService } from '../../src/services/dashboardService';
import { HttpError } from '../../src/errors/httpError';
import { PassThrough } from 'stream';

jest.mock('../../src/services/dashboardService', () => ({
  dashboardService: {
    getLast24HoursKpi: jest.fn(),
    getIncidentsByType: jest.fn(),
    getDailyTrend: jest.fn(),
    getSeverityDistribution: jest.fn(),
    getRecentIncidents: jest.fn(),
    prepareIncidentsExport: jest.fn(),
  },
}));

describe('dashboardController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let json: jest.Mock;
  let status: jest.Mock;
  let setHeader: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnThis();
    setHeader = jest.fn().mockReturnThis();
    req = { query: {} };
    res = {
      json,
      status,
      setHeader,
      headersSent: false,
      destroy: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getLast24HoursKpi', () => {
    it('calls service and returns result', async () => {
      const mockResult = { currentCount: 10, previousCount: 5 };
      (dashboardService.getLast24HoursKpi as jest.Mock).mockResolvedValue(mockResult);

      await dashboardController.getLast24HoursKpi(req as Request, res as Response);

      expect(dashboardService.getLast24HoursKpi).toHaveBeenCalledWith({}, false);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('passes refresh flag', async () => {
      req.query = { refresh: 'true' };
      (dashboardService.getLast24HoursKpi as jest.Mock).mockResolvedValue({});

      await dashboardController.getLast24HoursKpi(req as Request, res as Response);

      expect(dashboardService.getLast24HoursKpi).toHaveBeenCalledWith({ refresh: 'true' }, true);
    });
  });

  describe('getIncidentsByType', () => {
    it('calls service and returns result', async () => {
      const mockResult = { total: 10, buckets: [] };
      (dashboardService.getIncidentsByType as jest.Mock).mockResolvedValue(mockResult);

      await dashboardController.getIncidentsByType(req as Request, res as Response);

      expect(dashboardService.getIncidentsByType).toHaveBeenCalledWith({}, false);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getDailyTrend', () => {
    it('calls service and returns result', async () => {
      const mockResult = { points: [] };
      (dashboardService.getDailyTrend as jest.Mock).mockResolvedValue(mockResult);

      await dashboardController.getDailyTrend(req as Request, res as Response);

      expect(dashboardService.getDailyTrend).toHaveBeenCalledWith({}, false);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getSeverityDistribution', () => {
    it('calls service and returns result', async () => {
      const mockResult = { total: 10, buckets: [] };
      (dashboardService.getSeverityDistribution as jest.Mock).mockResolvedValue(mockResult);

      await dashboardController.getSeverityDistribution(req as Request, res as Response);

      expect(dashboardService.getSeverityDistribution).toHaveBeenCalledWith({}, false);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getRecentIncidents', () => {
    it('calls service and returns result with default limit', async () => {
      const mockResult: any[] = [];
      (dashboardService.getRecentIncidents as jest.Mock).mockResolvedValue(mockResult);

      await dashboardController.getRecentIncidents(req as Request, res as Response);

      expect(dashboardService.getRecentIncidents).toHaveBeenCalledWith({}, false, 10);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('parses limit parameter', async () => {
      req.query = { limit: '20' };
      (dashboardService.getRecentIncidents as jest.Mock).mockResolvedValue([]);

      await dashboardController.getRecentIncidents(req as Request, res as Response);

      expect(dashboardService.getRecentIncidents).toHaveBeenCalledWith({ limit: '20' }, false, 20);
    });

    it('throws bad request for invalid limit', async () => {
      req.query = { limit: 'invalid' };
      await expect(dashboardController.getRecentIncidents(req as Request, res as Response)).rejects.toThrow(HttpError);
    });
  });

  describe('exportIncidentsCsv', () => {
    it('streams csv download', async () => {
      const mockStream = new PassThrough();
      const mockResult = {
        stream: mockStream,
        filename: 'export.csv',
        total: 100,
      };
      (dashboardService.prepareIncidentsExport as jest.Mock).mockResolvedValue(mockResult);
      res.pipe = jest.fn(); // Mock response stream behavior if needed, but we pass stream.pipe(res)

      // We need to mock result.stream.pipe(res)
      // PassThrough.pipe returns destination
      const pipeSpy = jest.spyOn(mockStream, 'pipe');

      await dashboardController.exportIncidentsCsv(req as Request, res as Response, next);

      expect(dashboardService.prepareIncidentsExport).toHaveBeenCalledWith({});
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="export.csv"');
      expect(res.setHeader).toHaveBeenCalledWith('X-Export-Total', '100');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(pipeSpy).toHaveBeenCalledWith(res);
    });

    it('handles service errors', async () => {
      const error = new Error('Service failed');
      (dashboardService.prepareIncidentsExport as jest.Mock).mockRejectedValue(error);

      await dashboardController.exportIncidentsCsv(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
