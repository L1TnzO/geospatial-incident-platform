# client/src/types/api/strategic.ts

## Reference

Original File: [client/src/types/api/strategic.ts](client/src/types/api/strategic.ts)

## Summary

Definiciones extensivas para la API de Análisis Estratégico. Cubre múltiples dimensiones de análisis (tendencias, mapas de calor, cobertura, tiempos de respuesta).

## Pseudocode

```typescript
/*
    Parametros de Filtro (Request Params)
    - StrategicFilterParams: Base.
    - MonthlyTrendsParams, QuarterlyTrendsParams: Extienden base + cantidad de periodos.
    - HotspotsParams, ResponseMetricsParams: Incluyen resolución de grid.
    - CoverageBuffersParams: Radio y estado de estación.
    - PriorityScoresParams: Agrupación y decaimiento temporal.
*/

/*
    Respuestas de Tendencias
    - StrategicMonthlyTrendResponse: Series mensuales con deltas MoM/YoY.
    - StrategicQuarterlyTrendResponse: Series trimestrales con deltas QoQ/YoY.
    - StrategicTypeTimelineResponse: Desglose temporal por tipo de incidente.
*/

/*
    Respuestas Geoespaciales
    - StrategicHotspotResponse: Celdas de grid con intensidad y geometría.
    - StrategicCoverageResponse: Polígonos de cobertura de estaciones.
*/

/*
    Respuestas de Métricas
    - StrategicResponseMetricsResponse: Agrupado por Estación/Grid/Zona. Metricas: promedio, mediana, p90.
    - StrategicPriorityScoreResponse: Puntajes de prioridad normalizados basados en frecuencia y severidad.
*/

/*
    Otras Respuestas
    - StrategicTimeOfDayResponse: Desglose Mañana/Tarde/Noche.
    - StrategicZoneFrequencyResponse: Frecuencia por zonas.
    - StrategicStationVolumeResponse: Volumen por estación.
    - StrategicIncidentProjectionResponse: Proyecciones futuras (regresión lineal).
*/
```
