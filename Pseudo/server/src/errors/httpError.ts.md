# server/src/errors/httpError.ts

## Reference

Original File: server/src/errors/httpError.ts

## Summary

Custom error class for HTTP exceptions.

## Pseudocode

MÓDULO errors/httpError

CLASE HttpError EXTIENDE Error
PROPIEDADES: status, code, details

    CONSTRUCTOR(status, message, options):
        - Asignar status.
        - Asignar code (o derivar de status).
        - Asignar details.

    MÉTODOS ESTÁTICOS DE FÁBRICA:
        - badRequest(msg, details) -> 400
        - notFound(msg, details) -> 404
        - conflict(msg, details) -> 409
        - internal(msg, details) -> 500

FUNCIÓN isHttpError(err): - Type guard: return err instanceof HttpError
