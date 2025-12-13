# server/src/middleware/errorHandler.ts

## Reference

Original File: [server/src/middleware/errorHandler.ts](server/src/middleware/errorHandler.ts)

## Summary

Global error handling middleware.

## Pseudocode

MÓDULO middleware/errorHandler

FUNCIÓN errorHandler(err, req, res, next): 1. Determinar si el error es HttpError (tiene status). 2. Si no lo es, crear HttpError genérico (500 Internal Server Error). 3. Si es error 500 y no estamos en test, loguear a consola (console.error). 4. Construir cuerpo de respuesta JSON: { error: { code, message, details? } }. 5. Enviar respuesta con status code correspondiente.
