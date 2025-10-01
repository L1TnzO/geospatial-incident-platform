import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../errors/httpError';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(HttpError.notFound(`The requested resource '${req.originalUrl}' was not found.`));
};
