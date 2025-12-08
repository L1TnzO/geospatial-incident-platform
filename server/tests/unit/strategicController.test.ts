import type { Request, Response, NextFunction } from 'express';
import * as strategicController from '../../src/controllers/strategicController';
import { strategicService } from '../../src/services/strategicService';

jest.mock('../../src/services/strategicService', () => ({
  strategicService: {
    getMonthlyTrend: jest.fn(),
    getDailyTrend: jest.fn(),
    getTimeOfDayDistribution: jest.fn(),
    getQuarterlyTrends: jest.fn(),
    getTypeTimeline: jest.fn(),
    getCoverageBuffers: jest.fn(),
    getResponseMetrics: jest.fn(),
    getPriorityScores: jest.fn(),
    getHotspots: jest.fn(),
    getZoneFrequency: jest.fn(),
    getStationIncidentCounts: jest.fn(),
    getIncidentProjection: jest.fn(),
    getDistrictFrequentIncidentTypes: jest.fn(),
  },
}));

describe('strategicController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let json: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    req = { query: {} };
    res = { json };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getMonthlyTrend', () => {
    it('calls service and returns result', async () => {
      (strategicService.getMonthlyTrend as jest.Mock).mockResolvedValue([]);
      await strategicController.getMonthlyTrend(req as Request, res as Response, next);
      expect(strategicService.getMonthlyTrend).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('handles errors', async () => {
      const error = new Error('Fail');
      (strategicService.getMonthlyTrend as jest.Mock).mockRejectedValue(error);
      await strategicController.getMonthlyTrend(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getDailyTrend', () => {
    it('calls service and returns result', async () => {
      (strategicService.getDailyTrend as jest.Mock).mockResolvedValue([]);
      await strategicController.getDailyTrend(req as Request, res as Response, next);
      expect(strategicService.getDailyTrend).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getTimeOfDayDistribution', () => {
    it('calls service and returns result', async () => {
      (strategicService.getTimeOfDayDistribution as jest.Mock).mockResolvedValue([]);
      await strategicController.getTimeOfDayDistribution(req as Request, res as Response, next);
      expect(strategicService.getTimeOfDayDistribution).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getQuarterlyTrends', () => {
    it('calls service and returns result', async () => {
      (strategicService.getQuarterlyTrends as jest.Mock).mockResolvedValue([]);
      await strategicController.getQuarterlyTrends(req as Request, res as Response, next);
      expect(strategicService.getQuarterlyTrends).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getTypeTimeline', () => {
    it('calls service and returns result', async () => {
      (strategicService.getTypeTimeline as jest.Mock).mockResolvedValue([]);
      await strategicController.getTypeTimeline(req as Request, res as Response, next);
      expect(strategicService.getTypeTimeline).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getCoverageBuffers', () => {
    it('calls service and returns result', async () => {
      (strategicService.getCoverageBuffers as jest.Mock).mockResolvedValue([]);
      await strategicController.getCoverageBuffers(req as Request, res as Response, next);
      expect(strategicService.getCoverageBuffers).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getResponseMetrics', () => {
    it('calls service and returns result', async () => {
      (strategicService.getResponseMetrics as jest.Mock).mockResolvedValue([]);
      await strategicController.getResponseMetrics(req as Request, res as Response, next);
      expect(strategicService.getResponseMetrics).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getPriorityScores', () => {
    it('calls service and returns result', async () => {
      (strategicService.getPriorityScores as jest.Mock).mockResolvedValue([]);
      await strategicController.getPriorityScores(req as Request, res as Response, next);
      expect(strategicService.getPriorityScores).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getHotspots', () => {
    it('calls service and returns result', async () => {
      (strategicService.getHotspots as jest.Mock).mockResolvedValue([]);
      await strategicController.getHotspots(req as Request, res as Response, next);
      expect(strategicService.getHotspots).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getZoneFrequency', () => {
    it('calls service and returns result', async () => {
      (strategicService.getZoneFrequency as jest.Mock).mockResolvedValue([]);
      await strategicController.getZoneFrequency(req as Request, res as Response, next);
      expect(strategicService.getZoneFrequency).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getStationIncidentCounts', () => {
    it('calls service and returns result', async () => {
      (strategicService.getStationIncidentCounts as jest.Mock).mockResolvedValue([]);
      await strategicController.getStationIncidentCounts(req as Request, res as Response, next);
      expect(strategicService.getStationIncidentCounts).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getIncidentProjection', () => {
    it('calls service and returns result', async () => {
      (strategicService.getIncidentProjection as jest.Mock).mockResolvedValue([]);
      await strategicController.getIncidentProjection(req as Request, res as Response, next);
      expect(strategicService.getIncidentProjection).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('getDistrictFrequentIncidentTypes', () => {
    it('calls service and returns result', async () => {
      (strategicService.getDistrictFrequentIncidentTypes as jest.Mock).mockResolvedValue([]);
      await strategicController.getDistrictFrequentIncidentTypes(req as Request, res as Response, next);
      expect(strategicService.getDistrictFrequentIncidentTypes).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });
});
