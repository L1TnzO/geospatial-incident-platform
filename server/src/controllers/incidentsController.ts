import type { Request, Response } from 'express';
import { performance } from 'node:perf_hooks';
import { incidentService, type CreateIncidentRequest } from '../services/incidentsService';

export const listIncidents = async (req: Request, res: Response): Promise<void> => {
  const started = performance.now();
  const options = incidentService.buildListOptions(
    req.query as Record<string, string | string[] | undefined>
  );
  const result = await incidentService.listIncidents(options);
  const afterQuery = performance.now();
  res.json(result);
  const afterSend = performance.now();
  console.log(
    `[incidentsController] listIncidents page=${options.page} size=${options.pageSize} ` +
    `query=${(afterQuery - started).toFixed(2)}ms send=${(afterSend - afterQuery).toFixed(2)}ms total=${(afterSend - started).toFixed(2)}ms`
  );
};

export const listMapIncidents = async (req: Request, res: Response): Promise<void> => {
  const started = performance.now();
  const options = incidentService.buildListOptions(
    req.query as Record<string, string | string[] | undefined>
  );
  const result = await incidentService.listMapIncidents(options);
  const afterQuery = performance.now();
  res.json(result);
  const afterSend = performance.now();
  console.log(
    `[incidentsController] listMapIncidents page=${options.page} size=${options.pageSize} ` +
    `query=${(afterQuery - started).toFixed(2)}ms send=${(afterSend - afterQuery).toFixed(2)}ms total=${(afterSend - started).toFixed(2)}ms`
  );
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

export const getSyncStatus = async (req: Request, res: Response): Promise<void> => {
  const status = await incidentService.getSyncStatus();
  res.json(status);
};
