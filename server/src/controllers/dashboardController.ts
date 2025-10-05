import type { Request, Response } from 'express';
import { dashboardService } from '../services/dashboardService';
import { HttpError } from '../errors/httpError';
import type { NextFunction } from 'express';

const parseRefreshFlag = (refresh: unknown): boolean => {
  if (refresh === undefined) {
    return false;
  }
  if (typeof refresh === 'string') {
    return ['true', '1', 'yes'].includes(refresh.toLowerCase());
  }
  if (Array.isArray(refresh)) {
    return refresh.some((value) => ['true', '1', 'yes'].includes(String(value).toLowerCase()));
  }
  return Boolean(refresh);
};

const parseLimit = (value: unknown, defaultValue: number, maxValue: number): number => {
  if (value === undefined) {
    return defaultValue;
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw HttpError.badRequest(`Query parameter 'limit' must be a positive integer.`);
  }
  return Math.min(Math.trunc(numeric), maxValue);
};

export const getLast24HoursKpi = async (req: Request, res: Response): Promise<void> => {
  const refresh = parseRefreshFlag(req.query.refresh);
  const result = await dashboardService.getLast24HoursKpi(
    req.query as Record<string, string | string[] | undefined>,
    refresh
  );
  res.json(result);
};

export const getIncidentsByType = async (req: Request, res: Response): Promise<void> => {
  const refresh = parseRefreshFlag(req.query.refresh);
  const result = await dashboardService.getIncidentsByType(
    req.query as Record<string, string | string[] | undefined>,
    refresh
  );
  res.json(result);
};

export const getDailyTrend = async (req: Request, res: Response): Promise<void> => {
  const refresh = parseRefreshFlag(req.query.refresh);
  const result = await dashboardService.getDailyTrend(
    req.query as Record<string, string | string[] | undefined>,
    refresh
  );
  res.json(result);
};

export const getSeverityDistribution = async (req: Request, res: Response): Promise<void> => {
  const refresh = parseRefreshFlag(req.query.refresh);
  const result = await dashboardService.getSeverityDistribution(
    req.query as Record<string, string | string[] | undefined>,
    refresh
  );
  res.json(result);
};

export const getRecentIncidents = async (req: Request, res: Response): Promise<void> => {
  const refresh = parseRefreshFlag(req.query.refresh);
  const limit = parseLimit(req.query.limit, 10, 25);
  const result = await dashboardService.getRecentIncidents(
    req.query as Record<string, string | string[] | undefined>,
    refresh,
    limit
  );
  res.json(result);
};

export const exportIncidentsCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await dashboardService.prepareIncidentsExport(
      req.query as Record<string, string | string[] | undefined>
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('X-Export-Total', String(result.total));
    res.status(200);

    result.stream.once('error', (error) => {
      if (!res.headersSent) {
        next(error);
      } else {
        res.destroy(error as Error);
      }
    });

    result.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};
