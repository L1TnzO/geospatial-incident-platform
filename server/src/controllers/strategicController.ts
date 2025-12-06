import type { NextFunction, Request, Response } from 'express';
import { strategicService } from '../services/strategicService';

export const getMonthlyTrend = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getMonthlyTrend(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getDailyTrend = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getDailyTrend(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getTimeOfDayDistribution = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getTimeOfDayDistribution(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getQuarterlyTrends = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getQuarterlyTrends(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getTypeTimeline = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getTypeTimeline(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getCoverageBuffers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getCoverageBuffers(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getResponseMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getResponseMetrics(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getPriorityScores = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getPriorityScores(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getHotspots = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getHotspots(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getZoneFrequency = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getZoneFrequency(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getStationIncidentCounts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getStationIncidentCounts(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getIncidentProjection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await strategicService.getIncidentProjection(
      req.query as Record<string, string | string[] | undefined>
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};
