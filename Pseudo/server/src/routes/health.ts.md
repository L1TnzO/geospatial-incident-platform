# server/src/routes/health.ts

## Reference

Original File: server/src/routes/health.ts

## Summary

Health check endpoint.

## Pseudocode

MÓDULO routes/health

IMPORTAR: Router, appMetadata

ROUTER Express

RUTA GET /healthz: - Obtener uptime (process.uptime). - Obtener timestamp actual. - Retornar JSON:
{
status: "ok",
service: nombre,
version: versión,
uptimeSeconds,
timestamp
}

EXPORTAR router
