# server/src/services/incidentsTableDataService.ts

## Reference

Original File: [server/src/services/incidentsTableDataService.ts](server/src/services/incidentsTableDataService.ts)

## Summary

Specialized logic for formatting incident data for the tabular view, including pagination calculations.

## Pseudocode

MÓDULO incidentsTableDataService

CLASE IncidentsTableDataService
PROPIEDADES: - incidentService: Referencia al servicio principal IncidentsService

    MÉTODO buildQuery(params):
        /* Transforma parámetros específicos de la tabla (UI) a query string estándar */
        - Mapear typeCodes, severityCodes, statusCodes a strings separados por coma.
        - Mapear booleanos a 'true'/'false'.
        - Retornar objeto plano Record<string, string>.

    MÉTODO fetchTableData(params):
        1. Convertir params de tabla a query estándar con buildQuery.
        2. Generar opciones de listado usando incidentService.buildListOptions(query).
        3. Invocar incidentService.listIncidents(options).
        4. Construir paginación extendida para la tabla:
           - Calcular página siguiente y previa.
           - Calcular "remainder" (elementos restantes).
        5. Retornar { rows: data, pagination: extendedPagination }.
