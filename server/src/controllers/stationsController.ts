import type { Request, Response } from 'express';
import { stationRepository } from '../db';
import { HttpError } from '../errors/httpError';

const parseBoolean = (value: unknown, field: string): boolean => {
  const normalized: unknown = Array.isArray(value) ? value[0] : value;

  if (typeof normalized === 'boolean') {
    return normalized;
  }

  if (typeof normalized === 'string') {
    const lowered = normalized.toLowerCase();
    if (['true', '1'].includes(lowered)) {
      return true;
    }
    if (['false', '0'].includes(lowered)) {
      return false;
    }
  }

  throw HttpError.badRequest(`Query parameter '${field}' must be a boolean.`);
};

export const listStations = async (req: Request, res: Response): Promise<void> => {
  let isActive: boolean | undefined;
  if (req.query.isActive !== undefined) {
    isActive = parseBoolean(req.query.isActive, 'isActive');
  }

  const stations = await stationRepository.listStations({ isActive });
  res.json({ data: stations });
};
