import type { Request, Response } from 'express';
import { incidentService, type CreateIncidentRequest } from '../services/incidentsService';

export const listIncidents = async (req: Request, res: Response): Promise<void> => {
  const options = incidentService.buildListOptions(
    req.query as Record<string, string | string[] | undefined>
  );
  const result = await incidentService.listIncidents(options);
  res.json(result);
};

export const getIncidentDetail = async (req: Request, res: Response): Promise<void> => {
  const detail = await incidentService.getIncidentDetail(req.params.incidentNumber);
  res.json(detail);
};

export const getIncidentMetadata = async (req: Request, res: Response): Promise<void> => {
  const refreshParam = req.query.refresh as string | undefined;
  const forceRefresh = refreshParam
    ? ['true', '1', 'yes'].includes(refreshParam.toLowerCase())
    : false;
  const metadata = await incidentService.getIncidentMetadata(forceRefresh);
  res.json(metadata);
};

export const searchIncidentByNumber = async (req: Request, res: Response): Promise<void> => {
  const summary = await incidentService.searchIncidentByNumber(
    req.query.incidentNumber as string | undefined
  );
  res.json(summary);
};

export const createIncident = async (req: Request, res: Response): Promise<void> => {
  const payload = req.body as CreateIncidentRequest;
  const detail = await incidentService.createIncident(payload);
  res.status(201).location(`/api/incidents/${detail.incidentNumber}`).json(detail);
};
