# server/src/routes/index.ts

## Reference

Original File: server/src/routes/index.ts

## Summary

Main router aggregation.

## Pseudocode

MÓDULO routes/index

IMPORTAR: Routers individuales (health, incidents, dashboard, etc)

ROUTER PRINCIPAL

FUNCIÓN AUXILIAR mountRoutes(prefix): - Normalizar prefijo. - Montar sub-routers bajo ese prefijo: - /incidents -> incidentsRouter - /dashboard -> dashboardRouter - /stations -> stationsRouter - /strategic -> strategicRouter - /infrastructure -> infrastructureRouter

EJECUTAR mountRoutes: - 'api' (para acceder via /api/...) - '' (para acceder desde raíz, soporte legacy/proxy simple)

USAR healthRouter (en raíz)

EXPORTAR router principal
