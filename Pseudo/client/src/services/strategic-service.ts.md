# client/src/services/strategic-service.ts

## Reference

Original File: [client/src/services/strategic-service.ts](client/src/services/strategic-service.ts)

## Summary

API service for strategic analysis data.

## Pseudocode

MÓDULO services/strategic-service

IMPORTAR: apiClient

CLASE StrategicServiceError extiende Error - Wrapper similar a DashboardServiceError.

FUNCIONES fetchX (Wrappers): - fetchStrategicTrends -> monthlyTrends - fetchStrategicDailyTrend -> dailyTrend - fetchStrategicTimeOfDay -> timeOfDay - fetchStrategicQuarterlyTrends -> quarterlyTrends - fetchStrategicTypeTimelines -> typeTimelines - fetchHotspots -> hotspots - fetchCoverageAnalysis -> coverageBuffers - fetchResponseTimePatterns -> responseMetrics - fetchPriorityZones -> priorityScores - fetchIncidentProjections -> projections - fetchDistrictFrequentIncidents -> districtFrequentIncidents \* Manejo de errores consistente mapeando a StrategicServiceError.
