import type { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';
import { HttpError } from '../../src/errors/httpError';

describe('errorHandler', () => {
  let req: Request;
  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    req = {} as Request;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    next = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles HttpError correctly', () => {
    const error = new HttpError(404, 'Resource not found', { code: 'NOT_FOUND', details: { foo: 'bar' } });
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: { foo: 'bar' },
      },
    });
  });

  it('handles generic Error as 500', () => {
    const error = new Error('Something went wrong');
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  });

  it('handles non-Error objects as 500', () => {
    const error = 'String error';
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
      },
    });
  });

  it('includes details if present in HttpError', () => {
    const error = new HttpError(400, 'Bad Request', { code: 'BAD_REQUEST' });
    errorHandler(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Bad Request',
      },
    });
  });

  it('logs 500 errors when not in test environment', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new Error('Critical failure');
    errorHandler(error, req, res, next);

    expect(console.error).toHaveBeenCalledWith(error);

    process.env.NODE_ENV = originalEnv;
  });

  it('does not log non-500 errors', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new HttpError(400, 'Bad Input');
    errorHandler(error, req, res, next);

    expect(console.error).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
