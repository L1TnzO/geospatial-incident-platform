# server/src/services/dashboardService.ts

## Reference

Original File: [server/src/services/dashboardService.ts](server/src/services/dashboardService.ts)

## Summary

Business logic for aggregating dashboard metrics and handling data transformations for charts.

## Pseudocode

MÓDULO dashboardService

CONSTANTES:

- DASHBOARD_CACHE_TTL_MS: 60 segundos
- EXPORT_COLUMN_DEFINITIONS: Mapeo de columnas para exportación CSV (incidente, fecha, tipo, severidad, etc)

CLASE DashboardService
PROPIEDADES PRIVADAS: - cache: Mapa en memoria para cachear resultados - repository: Repositorio de incidentes - incidentSvc: Servicio de incidentes (para filtros)

    MÉTODO clearCaches():
        - Limpiar el mapa de cache

    MÉTODO PRIVADO getFilters(query):
        - Delegar a incidentSvc.buildFilterOptions(query) para normalizar filtros

    MÉTODO PRIVADO withCache(key, refresh, resolver):
        - Si refresh es falso y la clave existe en cache y no ha expirado:
            - Retornar valor de cache
        - Si no:
            - Ejecutar resolver() para obtener datos frescos
            - Guardar en cache con TTL
            - Retornar datos

    MÉTODO getLast24HoursKpi(query, refresh, now):
        1. Obtener filtros base.
        2. Definir ventana de tiempo actual (start, end):
           - Si vienen en query, usarlas.
           - Si no, usar (now - 24h) hasta now.
        3. Definir ventana previa para comparación:
           - Si compare == 'year', restar 1 año.
           - Si no, restar la duración de la ventana actual (periodo previo inmediato).
        4. Generar clave de cache única.
        5. Ejecutar (con cache):
           a. Consultar repositorio: contar incidentes en ventana actual y previa.
           b. Calcular diferencia (delta) y porcentaje de cambio.
           c. Retornar estructura Last24HoursKpi (conteos, deltas, fechas).

    MÉTODO getIncidentsByType(query, refresh, now):
        1. Obtener filtros. Determinar rango de fecha (default últimas 7 días).
        2. Generar clave de cache.
        3. Ejecutar (con cache):
           a. Consultar repositorio: obtener conteo agrupado por tipo.
           b. Calcular total de incidentes.
           c. Para cada tipo, calcular porcentaje del total.
           d. Retornar lista de "buckets" con conteos y porcentajes.

    MÉTODO getDailyTrend(query, refresh, now):
        1. Obtener filtros. Determinar rango (default últimos 30 días).
        2. Normalizar fechas para agrupar por día o por hora (si el rango es <= 48h).
        3. Generar clave de cache.
        4. Ejecutar (con cache):
           a. Consultar repositorio para obtener conteos agrupados por tiempo (día u hora).
           b. Rellenar huecos (fechas sin incidentes) con 0 para asegurar continuidad en la gráfica.
           c. Calcular tendencia comparando con el periodo anterior (similar a getLast24HoursKpi).
           d. Retornar puntos de la gráfica y resumen de tendencia.

    MÉTODO getSeverityDistribution(query, refresh, now):
        1. Similar a getIncidentsByType pero agrupando por Severidad.
        2. Retornar buckets con conteos y porcentajes.

    MÉTODO getRecentIncidents(query, limit):
        1. Obtener filtros.
        2. Consultar repositorio: obtener lista de incidentes recientes ordenados por fecha reporte.
        3. Retornar lista simplificada.

    MÉTODO exportToCsv(query):
        1. Obtener filtros y columnas solicitadas.
        2. Crear stream de lectura desde el repositorio (cursor de base de datos).
        3. Transformar cada registro a formato CSV (escapar comillas, formatear fechas).
        4. Retornar metadata del export (filename, stream, total estimado).
