# client/src/services/api-client.ts

## Reference

Original File: [client/src/services/api-client.ts](client/src/services/api-client.ts)

## Summary

Typed wrapper for backend API calls.

## Pseudocode

MÓDULO services/api-client

IMPORTAR: http (lib/http)

INTERFAZ FetchIncidentsParams: page, pageSize, filtrado...
INTERFAZ ApiClientOptions: Opciones de request raw

OBJETO apiClient:
incidents:
list(params): GET /incidents con query params mapeados.
mapList(params): GET /incidents/map optimizado para mapa.
metadata(): GET /incidents/meta (tipos, estados).
search(id): GET /incidents/search.
detail(id): GET /incidents/:id.
create(payload): POST /incidents.
syncStatus(): GET /incidents/sync-status (para sincronización).
getDelta(since): GET /incidents/delta (cambios incrementales).

    stations:
        list(params): GET /stations.

    infrastructure:
        list(): GET /infrastructure.

    dashboard:
        kpiLast24Hours(params): GET /dashboard/kpi/last-24h.
        typeDistribution(params): GET /dashboard/incidents/by-type.
        severityDistribution(params): GET /dashboard/incidents/severity-distribution.
        dailyTrend(params): GET /dashboard/incidents/daily-trend.
        recentIncidents(params): GET /dashboard/incidents/recent.
        export(params): GET /dashboard/export (retorna Response/Blob).

    strategic:
        monthlyTrends(params): GET /strategic/trends/monthly.
        dailyTrend(params): GET /strategic/trends/daily.
        timeOfDay(params): GET /strategic/trends/time-of-day.
        quarterlyTrends(params): GET /strategic/trends/quarters.
        typeTimelines(params): GET /strategic/trends/types.
        hotspots(params): GET /strategic/hotspots.
        coverageBuffers(params): GET /strategic/coverage-buffers.
        responseMetrics(params): GET /strategic/response-metrics.
        priorityScores(params): GET /strategic/priority-scores.
        zoneFrequency(params): GET /strategic/zones/frequency.
        projections(params): GET /strategic/projections.
        districtFrequentIncidents(params): GET /strategic/district-frequent-incidents.

EXPORTAR apiClient
