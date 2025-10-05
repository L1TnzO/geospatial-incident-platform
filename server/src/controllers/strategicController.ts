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
