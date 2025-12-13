# server/src/services/incidentsService.ts

## Reference

Original File: [server/src/services/incidentsService.ts](server/src/services/incidentsService.ts)

## Summary

Core logic for incident operations, including validation, caching, and delta generation.

## Pseudocode

MÓDULO incidentsService

CONSTANTES:

- MAX_PAGE_SIZE: Límite máximo de paginación
- SORTABLE_FIELDS: Campos permitidos para ordenar (reportedAt, occurrenceAt, severityPriority)

CLASE IncidentService
PROPIEDADES: - repository: IncidentRepository - metadataCache: Cache simple para metadatos estáticos

    MÉTODO buildFilterOptions(query):
        /* Valida y transforma los parámetros HTTP query string en un objeto de filtros tipado */
        1. Validar formato de incidentNumber (regex).
        2. Parsear listas separadas por coma (types, severities, status).
        3. Parsear fechas (startDate, endDate) y booleanos (isActive).
        4. Parsear coordenadas geográficas (bbox, center) validando rangos lat/lng.
        5. Retornar objeto IncidentFilterOptions.

    MÉTODO buildListOptions(query):
        /* Prepara opciones de paginación y ordenamiento además de los filtros */
        1. Parsear page y pageSize (validar límites).
        2. Si se busca por incidentNumber específico, forzar página 1.
        3. Validar que la página solicitada no exceda el total teórico máximo.
        4. Parsear sortBy y sortDirection.
        5. Retornar objeto IncidentListOptions combinando filtros y paginación.

    MÉTODO listIncidents(options):
        1. Llamar a repository.listIncidents(options).
        2. Calcular metadatos de paginación (total pages, hasNext, hasPrevious).
        3. Retornar estructura { data, pagination }.

    MÉTODO listMapIncidents(options):
        1. Similar a listIncidents pero invoca repository.listIncidentsForMap.
        2. Retorna versión optimizada (geoJSON light) para renderizado en mapa.

    MÉTODO getIncidentDetail(incidentNumber):
        1. Validar input.
        2. Consultar repository.getIncidentDetail.
        3. Si no existe, lanzar error 404 (NotFound).
        4. Retornar detalle completo.

    MÉTODO getIncidentMetadata(forceRefresh):
        1. Si hay cache válido y no se fuerza refresco, retornar cache.
        2. Consultar repository.getIncidentMetadata (valores distintos de type, severity, status, source, etc).
        3. Agregar límites duros de configuración.
        4. Guardar en cache y retornar.

    MÉTODO createIncident(payload):
        /* Lógica principal de validación de negocio para nuevos incidentes */
        1. Validar campos obligatorios (incidentNumber, title, type, severity, status, dates).
        2. Validar formato de incidentNumber.
        3. Validar coherencia cronológica de fechas:
           - occurrence <= reported
           - reported <= dispatch
           - dispatch <= arrival
           - arrival <= resolved
        4. Validar coordenadas geográficas.
        5. Validar integridad de claves foráneas (códigos de tipo, severidad, etc deben existir en metadatos, aunque el repo lanzará error FK si fallan).
        6. Determinar isActive basado en el estado (si es FINALizado -> false).
        7. Llamar a repository.createIncident(input).
        8. Manejar error de duplicado (UniqueViolation) lanzando HTTP 409 Conflict.
        9. Retornar nuevo incidente creado.

    MÉTODO getSyncStatus():
        - Delegar al repositorio para obtener timestamp de última modificación y conteo total.

    MÉTODO getDelta(since):
        - Delegar al repositorio para obtener incidentes modificados desde la fecha 'since'.
