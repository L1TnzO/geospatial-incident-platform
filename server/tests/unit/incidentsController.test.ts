import type { Request, Response } from 'express';
import * as incidentsController from '../../src/controllers/incidentsController';
import { incidentService } from '../../src/services/incidentsService';

jest.mock('../../src/services/incidentsService', () => ({
  incidentService: {
    buildListOptions: jest.fn(),
    listIncidents: jest.fn(),
    listMapIncidents: jest.fn(),
    getIncidentDetail: jest.fn(),
    getIncidentMetadata: jest.fn(),
    searchIncidentByNumber: jest.fn(),
    createIncident: jest.fn(),
    getSyncStatus: jest.fn(),
    getDelta: jest.fn(),
  },
}));

describe('incidentsController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let json: jest.Mock;
  let status: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnThis();
    req = {};
    res = {
      json,
      status,
      location: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('listIncidents', () => {
    it('calls service with built options and returns result', async () => {
      req.query = { page: '1' };
      const options = { page: 1, pageSize: 25 };
      const result = { data: [], pagination: {} };

      (incidentService.buildListOptions as jest.Mock).mockReturnValue(options);
      (incidentService.listIncidents as jest.Mock).mockResolvedValue(result);

      await incidentsController.listIncidents(req as Request, res as Response);

      expect(incidentService.buildListOptions).toHaveBeenCalledWith(req.query);
      expect(incidentService.listIncidents).toHaveBeenCalledWith(options);
      expect(res.json).toHaveBeenCalledWith(result);
    });
  });

  describe('listMapIncidents', () => {
    it('calls service with built options and returns result', async () => {
      req.query = { bbox: '0,0,1,1' };
      const options = { bounds: {} };
      const result = { data: [], pagination: {} };

      (incidentService.buildListOptions as jest.Mock).mockReturnValue(options);
      (incidentService.listMapIncidents as jest.Mock).mockResolvedValue(result);

      await incidentsController.listMapIncidents(req as Request, res as Response);

      expect(incidentService.buildListOptions).toHaveBeenCalledWith(req.query);
      expect(incidentService.listMapIncidents).toHaveBeenCalledWith(options);
      expect(res.json).toHaveBeenCalledWith(result);
    });
  });

  describe('getIncidentDetail', () => {
    it('calls service and returns result', async () => {
      req.params = { incidentNumber: 'INC-01' };
      const detail = { incidentNumber: 'INC-01' };

      (incidentService.getIncidentDetail as jest.Mock).mockResolvedValue(detail);

      await incidentsController.getIncidentDetail(req as Request, res as Response);

      expect(incidentService.getIncidentDetail).toHaveBeenCalledWith('INC-01');
      expect(res.json).toHaveBeenCalledWith(detail);
    });
  });

  describe('getIncidentMetadata', () => {
    it('passes forceRefresh false by default', async () => {
      req.query = {};
      const meta = {};
      (incidentService.getIncidentMetadata as jest.Mock).mockResolvedValue(meta);

      await incidentsController.getIncidentMetadata(req as Request, res as Response);

      expect(incidentService.getIncidentMetadata).toHaveBeenCalledWith(false);
      expect(res.json).toHaveBeenCalledWith(meta);
    });

    it('passes forceRefresh true when requested', async () => {
      req.query = { refresh: 'true' };
      (incidentService.getIncidentMetadata as jest.Mock).mockResolvedValue({});

      await incidentsController.getIncidentMetadata(req as Request, res as Response);

      expect(incidentService.getIncidentMetadata).toHaveBeenCalledWith(true);
    });
  });

  describe('searchIncidentByNumber', () => {
    it('calls service and returns result', async () => {
      req.query = { incidentNumber: 'INC-01' };
      const summary = { incidentNumber: 'INC-01' };
      (incidentService.searchIncidentByNumber as jest.Mock).mockResolvedValue(summary);

      await incidentsController.searchIncidentByNumber(req as Request, res as Response);

      expect(incidentService.searchIncidentByNumber).toHaveBeenCalledWith('INC-01');
      expect(res.json).toHaveBeenCalledWith(summary);
    });
  });

  describe('createIncident', () => {
    it('creates incident and sets location header', async () => {
      req.body = { incidentNumber: 'INC-NEW' };
      const detail = { incidentNumber: 'INC-NEW' };
      (incidentService.createIncident as jest.Mock).mockResolvedValue(detail);

      await incidentsController.createIncident(req as Request, res as Response);

      expect(incidentService.createIncident).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.location).toHaveBeenCalledWith('/api/incidents/INC-NEW');
      expect(res.json).toHaveBeenCalledWith(detail);
    });
  });

  describe('getSyncStatus', () => {
    it('returns sync status', async () => {
      const status = { lastModified: '2025-01-01', count: 100 };
      (incidentService.getSyncStatus as jest.Mock).mockResolvedValue(status);

      await incidentsController.getSyncStatus(req as Request, res as Response);

      expect(incidentService.getSyncStatus).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(status);
    });
  });

  describe('getDelta', () => {
    it('returns 400 if since param missing', async () => {
      req.query = {};
      await incidentsController.getDelta(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('required') }));
    });

    it('returns delta if since param provided', async () => {
      req.query = { since: '2025-01-01' };
      const delta = { changes: [] };
      (incidentService.getDelta as jest.Mock).mockResolvedValue(delta);

      await incidentsController.getDelta(req as Request, res as Response);

      expect(incidentService.getDelta).toHaveBeenCalledWith('2025-01-01');
      expect(res.json).toHaveBeenCalledWith(delta);
    });
  });
});
