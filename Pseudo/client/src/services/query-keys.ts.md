# client/src/services/query-keys.ts

## Reference

Original File: [client/src/services/query-keys.ts](client/src/services/query-keys.ts)

## Summary

React Query key constants.

## Pseudocode

MÓDULO services/query-keys

OBJETO CONSTANTE queryKeys:
incidents:
all: ['incidents']
list(params): ['incidents', 'list', serializar(params)]
metadata: ['incidents', 'metadata']
detail(id): ['incidents', 'detail', id]
search(id): ['incidents', 'search', id]

    stations:
        all: ['stations']

    infrastructure:
        all: ['infrastructure']

    dashboard: keys para kpiLast24h, typeDistribution, dailyTrend, etc.

    strategic: keys para trends, hotspots, coverage, etc.

    location:
        reverseGeocode(lat, lng): keys para geocoding inverso.
