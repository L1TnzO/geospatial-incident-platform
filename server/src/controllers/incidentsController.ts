import type { Request, Response } from 'express';
import { incidentService } from '../services/incidentsService';

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
