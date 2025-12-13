# server/src/db/repositories/incidentsRepository.ts

## Reference

Original File: [server/src/db/repositories/incidentsRepository.ts](server/src/db/repositories/incidentsRepository.ts)

## Summary

Knex-based data access for incidents, including PostGIS spatial queries.

## Pseudocode

MÓDULO incidentsRepository

CLASE IncidentRepository
PROPIEDADES: - db: Instancia Knex

    MÉTODO listIncidents(filters):
        1. Construir query base ('incidents' join tipos, severidades, estados, etc).
        2. Aplicar filtros dinámicos (applyFilters):
           - WHERE type IN (...)
           - WHERE severity IN (...)
           - WHERE occurrence BETWEEN start AND end
           - WHERE ST_Within(location, bbox)
        3. Calcular total de registros (COUNT).
        4. Configurar ordenamiento (sortBy, sortDirection).
        5. Paginación: LIMIT pageSize OFFSET (page-1)*pageSize.
        6. Ejecutar query.
        7. Mapear filas (DB rows) a objetos de dominio (IncidentListItem) usando mapIncidentRow.
        8. Retornar { data, pagination }.

    MÉTODO countIncidentsByReportedRange(filters, window):
        - Contar incidentes en un rango de fechas de reporte específico.

    MÉTODO getIncidentDetail(incidentNumber):
        1. Query por incidentNumber.
        2. Unir tablas de detalles (assets, units, notes).
        3. Si no existe, retornar null.
        4. Mapear a modelo completo IncidentDetail.

    MÉTODO createIncident(input):
        1. Validar integridad referencial (IDs de tipos, estados existan).
        2. Construir objeto de inserción SQL.
        3. Convertir geoJSON a geometría PostGIS (ST_GeomFromGeoJSON).
        4. Insertar en tabla 'incidents'.
        5. Retornar el nuevo incidente recuperado.

    MÉTODO getZoneFrequency(filters):
        - Agregación: GROUP BY city, ORDER BY COUNT DESC.

    MÉTODO getStationIncidentCounts(filters):
        - Agregación: JOIN stations, GROUP BY station_name, ORDER BY COUNT DESC.

    MÉTODO AUXILIAR applyFilters(query, filters):
        - Aplica cláusulas WHERE condicionales.
        - Maneja lógica geoespacial (PostGIS).
        - Excluye borrados lógicos (deleted_at IS NULL).
