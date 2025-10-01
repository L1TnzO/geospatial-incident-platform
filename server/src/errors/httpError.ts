export type HttpErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';

export interface HttpErrorOptions {
  code?: HttpErrorCode;
  details?: unknown;
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: HttpErrorCode;
  public readonly details?: unknown;

  constructor(status: number, message: string, options: HttpErrorOptions = {}) {
    super(message);
    this.status = status;
    this.code = options.code ?? HttpError.mapStatusToCode(status);
    this.details = options.details;
  }

  private static mapStatusToCode(status: number): HttpErrorCode {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 404:
        return 'NOT_FOUND';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  static badRequest(message: string, details?: unknown): HttpError {
    return new HttpError(400, message, { code: 'BAD_REQUEST', details });
  }

  static notFound(message: string, details?: unknown): HttpError {
    return new HttpError(404, message, { code: 'NOT_FOUND', details });
  }

  static internal(message: string, details?: unknown): HttpError {
    return new HttpError(500, message, { code: 'INTERNAL_SERVER_ERROR', details });
  }
}

export const isHttpError = (error: unknown): error is HttpError => error instanceof HttpError;
