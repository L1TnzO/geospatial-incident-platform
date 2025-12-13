# client/src/services/dashboard-service.ts

## Reference

Original File: [client/src/services/dashboard-service.ts](client/src/services/dashboard-service.ts)

## Summary

API service for fetching dashboard KPIs, charts, and handling exports.

## Pseudocode

MÓDULO services/dashboard-service

IMPORTAR: apiClient

CLASE DashboardServiceError extiende Error - Wrapper para errores con códigos tipados (BAD_REQUEST, NOT_FOUND, etc).

FUNCIÓN mapHttpError(error): - Transforma errores HTTP genéricos en DashboardServiceError.

FUNCIONES fetchX (Wrappers): - fetchLast24HoursKpi -> apiClient.dashboard.kpiLast24Hours - fetchTypeDistribution -> apiClient.dashboard.typeDistribution - fetchSeverityDistribution -> apiClient.dashboard.severityDistribution - fetchDailyTrend -> apiClient.dashboard.dailyTrend - fetchRecentIncidents -> apiClient.dashboard.recentIncidents \* Todas envuelven la llamada en try/catch usabdo mapHttpError.

FUNCIÓN exportDashboardCsv(filters): 1. Llamar apiClient.dashboard.export con flag raw: true. 2. Verificar status ok. 3. Leer headers para obtener filename sugerido (Content-Disposition). 4. Convertir respuesta a Blob. 5. Crear URL de objeto (URL.createObjectURL). 6. Retornar { filename, blobUrl, totalRecords }.
