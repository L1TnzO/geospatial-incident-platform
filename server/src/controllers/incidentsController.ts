import type { Request, Response } from 'express';
import { incidentRepository, type IncidentListFilters } from '../db';
import { HttpError } from '../errors/httpError';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_TOTAL_RESULTS = 5000;

const parseInteger = (
  value: unknown,
  field: string,
  options: { min?: number; max?: number }
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized: unknown = Array.isArray(value) ? value[0] : value;

  if (normalized === undefined) {
    return undefined;
  }

  if (typeof normalized !== 'string' && typeof normalized !== 'number') {
    throw HttpError.badRequest(`Query parameter '${field}' must be an integer.`);
  }

  const raw = typeof normalized === 'number' ? normalized : Number.parseInt(normalized.trim(), 10);

  if (Number.isNaN(raw)) {
    throw HttpError.badRequest(`Query parameter '${field}' must be an integer.`);
  }

  if (options.min !== undefined && raw < options.min) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must be greater than or equal to ${options.min}.`
    );
  }

  if (options.max !== undefined && raw > options.max) {
    throw HttpError.badRequest(
      `Query parameter '${field}' must be less than or equal to ${options.max}.`
    );
  }

  return raw;
};

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

const parseStringArray = (value: unknown, field: string): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized: unknown[] = Array.isArray(value) ? value : [value];
  const results: string[] = [];

  for (const entry of normalized) {
    if (typeof entry !== 'string') {
      throw HttpError.badRequest(
        `Query parameter '${field}' must be provided as a string or comma-separated list.`
      );
    }

    entry
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => results.push(part));
  }

  return results.length ? results : undefined;
};

const ensureValidDate = (value: unknown, field: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const normalized: unknown = Array.isArray(value) ? value[0] : value;

  if (normalized === undefined) {
    return undefined;
  }

  if (typeof normalized !== 'string') {
    throw HttpError.badRequest(`Query parameter '${field}' must be an ISO-8601 date string.`);
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    throw HttpError.badRequest(`Query parameter '${field}' must be an ISO-8601 date string.`);
  }

  return new Date(timestamp).toISOString();
};

const buildFilters = (req: Request): IncidentListFilters & { page: number; pageSize: number } => {
  const page = parseInteger(req.query.page, 'page', { min: 1 }) ?? DEFAULT_PAGE;
  const pageSize =
    parseInteger(req.query.pageSize, 'pageSize', { min: 1, max: MAX_PAGE_SIZE }) ??
    DEFAULT_PAGE_SIZE;

  const maxPage = Math.ceil(MAX_TOTAL_RESULTS / pageSize);
  if (page > maxPage) {
    throw HttpError.badRequest(
      `The combination of page=${page} and pageSize=${pageSize} exceeds the maximum supported range of ${MAX_TOTAL_RESULTS} records.`
    );
  }

  const typeCodes = parseStringArray(req.query.typeCodes, 'typeCodes');
  const severityCodes = parseStringArray(req.query.severityCodes, 'severityCodes');
  const statusCodes = parseStringArray(req.query.statusCodes, 'statusCodes');
  const startDate = ensureValidDate(req.query.startDate, 'startDate');
  const endDate = ensureValidDate(req.query.endDate, 'endDate');

  let isActive: boolean | undefined;
  if (req.query.isActive !== undefined) {
    isActive = parseBoolean(req.query.isActive, 'isActive');
  }

  return {
    page,
    pageSize,
    typeCodes,
    severityCodes,
    statusCodes,
    startDate,
    endDate,
    isActive,
  };
};

export const listIncidents = async (req: Request, res: Response): Promise<void> => {
  const filters = buildFilters(req);

  const result = await incidentRepository.listIncidents({
    ...filters,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  res.json({
    data: result.data,
    pagination: {
      page: result.page,
      pageSize: result.pageSize,
      total: Math.min(result.total, MAX_TOTAL_RESULTS),
    },
  });
};

export const getIncidentDetail = async (req: Request, res: Response): Promise<void> => {
  const incidentNumber = req.params.incidentNumber?.trim();
  if (!incidentNumber) {
    throw HttpError.badRequest('Incident number is required.');
  }

  const detail = await incidentRepository.getIncidentDetail(incidentNumber);
  if (!detail) {
    throw HttpError.notFound(`Incident '${incidentNumber}' was not found.`);
  }

  res.json(detail);
};
