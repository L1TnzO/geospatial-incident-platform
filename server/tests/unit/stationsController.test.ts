import type { Request, Response } from 'express';
import * as stationsController from '../../src/controllers/stationsController';
import { stationRepository } from '../../src/db';
import { HttpError } from '../../src/errors/httpError';

jest.mock('../../src/db', () => ({
  stationRepository: {
    listStations: jest.fn(),
  },
}));

describe('stationsController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let json: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    req = { query: {} };
    res = { json };
    jest.clearAllMocks();
  });

  describe('listStations', () => {
    it('returns stations list', async () => {
      const mockStations: any[] = [];
      (stationRepository.listStations as jest.Mock).mockResolvedValue(mockStations);

      await stationsController.listStations(req as Request, res as Response);

      expect(stationRepository.listStations).toHaveBeenCalledWith({ isActive: undefined });
      expect(res.json).toHaveBeenCalledWith({ data: mockStations });
    });

    it('filters by isActive true', async () => {
      req.query = { isActive: 'true' };
      (stationRepository.listStations as jest.Mock).mockResolvedValue([]);

      await stationsController.listStations(req as Request, res as Response);

      expect(stationRepository.listStations).toHaveBeenCalledWith({ isActive: true });
    });

    it('filters by isActive false', async () => {
      req.query = { isActive: 'false' };
      (stationRepository.listStations as jest.Mock).mockResolvedValue([]);

      await stationsController.listStations(req as Request, res as Response);

      expect(stationRepository.listStations).toHaveBeenCalledWith({ isActive: false });
    });

    it('throws error for invalid boolean', async () => {
      req.query = { isActive: 'not_boolean' };

      await expect(stationsController.listStations(req as Request, res as Response))
        .rejects.toThrow(HttpError);
    });
  });
});
