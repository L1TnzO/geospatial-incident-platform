# server/src/services/strategicService.ts

## Reference

Original File: [server/src/services/strategicService.ts](server/src/services/strategicService.ts)

## Summary

Complex analytical logic for strategic reports, including geospatial calculations and trend analysis.

## Pseudocode

MÓDULO strategicService

CONSTANTES:

- CACHE_TTL: 5 min
- HOTSPOT_RESOLUTIONS: Mapeo de niveles de zoom a tamaños de celda en metros.

CLASE StrategicAnalyticsService
PROPIEDADES: - cache: Map - repository: IncidentRepository - incidentSvc: IncidentService

    MÉTODO getMonthlyTrend(query):
        1. Obtener filtros y ventana de meses (default 12).
        2. Determinar rango de fechas exacto (alineado a inicio/fin de mes).
        3. Cachear/Ejecutar:
           a. Consultar repositorio por mes.
           b. Rellenar meses vacíos con 0.
           c. Calcular deltas mes a mes y año a año (YoY).
           d. Retornar serie de datos con etiquetas formateadas ("Ene 2024").

    MÉTODO getQuarterlyTrend(query):
        1. Similar a MonthlyTrend pero agrupando por trimestres (Q1, Q2, Q3, Q4).
        2. Calcular métricas comparativas Quarter-over-Quarter y Year-over-Year.

    MÉTODO getZoneFrequency(query):
        1. Cachear/Ejecutar:
           a. Consultar repositorio agrupando por zona/distrito.
           b. Calcular porcentajes del total.
           c. Retornar lista ordenada por frecuencia.

    MÉTODO getStationVolume(query):
        1. Cachear/Ejecutar:
           a. Consultar repositorio agrupando por estación primaria.
           b. Calcular carga (porcentaje) de cada estación.

    MÉTODO getDistrictFrequentIncidents(query):
        1. Cachear/Ejecutar:
           a. Consultar incidente más frecuente por cada distrito (moda).
           b. Retornar lista { distrito, tipoMasFrecuente, conteo }.

    MÉTODO getTimeOfDayDistribution(query):
        1. Cachear/Ejecutar:
           a. Consultar distribución por hora del día.
           b. Agrupar en bloques: Mañana, Tarde, Noche.
           c. Retornar conteos por bloque.

    MÉTODO getHotspots(query):
        1. Parsear resolución (1-8) y calcular tamaño de celda en metros.
        2. Cachear/Ejecutar:
           a. Consultar repositorio para generar grid geoespacial (PostGIS ST_SquareGrid o similar).
           b. Contar incidentes por celda.
           c. Calcular intensidad relativa (0.0 - 1.0) basada en el máximo encontrado.
           d. Retornar celdas GeoJSON enriquecidas con metadatos.

    MÉTODO getResponseMetrics(query):
        1. Parsear groupBy (station, zone, grid).
        2. Cachear/Ejecutar:
           a. Consultar tiempos de respuesta (arrival - reported).
           b. Calcular agregados: promedio, mediana y percentil 90.
           c. Excluir grupos con muestra insuficiente (sample threshold).
           d. Normalizar métricas para ranking (0-1, donde 1 es el peor tiempo).
           e. Retornar grupos con sus métricas.

    MÉTODO getPriorityScores(query):
        /* Análisis multicriterio para identificar áreas de atención */
        1. Parsear groupBy.
        2. Cachear/Ejecutar:
           a. Obtener métricas por grupo: volumen incidentes, severidad promedio, tiempo respuesta.
           b. Normalizar cada métrica (0-1).
           c. Aplicar pesos (e.g., volumen 40%, severidad 30%, respuesta 30%).
           d. Calcular 'Score' final compuesto.
           e. Generar ranking de prioridad.

    MÉTODO getIncidentProjections(query):
        /* Proyección lineal simple de tendencias futuras */
        1. Obtener datos históricos mensuales.
        2. Calcular regresión lineal (pendiente e intercepto).
        3. Proyectar X meses en el futuro.
        4. Detectar estacionalidad básica (comparando mismos meses de años previos).
        5. Retornar serie proyectada.

    MÉTODO getCoverageGaps(query):
        1. Cachear/Ejecutar:
           a. Obtener estaciones activas.
           b. Calcular buffers de cobertura (radios de servicio).
           c. Geoprocesamiento: Identificar zonas con alta densidad de incidentes fuera de los buffers.
           d. (O simplemente retornar los polígonos de cobertura para visualización en cliente).
           e. Retornar FeatureCollection.
