import type { NextFunction, Request, Response } from 'express';
import { HttpError, isHttpError } from '../errors/httpError';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  void _next;
  const error = isHttpError(err) ? err : new HttpError(500, 'An unexpected error occurred.');

  if (process.env.NODE_ENV !== 'test' && error.status === 500) {
    console.error(err);
  }

  const body: ErrorResponseBody = {
    error: {
      code: error.code,
      message: error.message,
    },
  };

  if (error.details !== undefined) {
    body.error.details = error.details;
  }

  res.status(error.status).json(body);
};
