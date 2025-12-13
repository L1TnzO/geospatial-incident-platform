# server/src/middleware/notFoundHandler.ts

## Reference

Original File: server/src/middleware/notFoundHandler.ts

## Summary

404 Not Found error handler.

## Pseudocode

MÓDULO middleware/notFoundHandler

FUNCIÓN notFoundHandler(req, res, next): - Crear error HttpError.notFound con mensaje indicando la URL solicitada. - Pasar error a next().
