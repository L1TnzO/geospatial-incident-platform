# client/src/components/TableView.tsx

## Reference

Original File: [client/src/components/TableView.tsx](client/src/components/TableView.tsx)

## Summary

Complex data grid for incidents.

## Pseudocode

MÓDULO components/TableView

IMPORTAR: components UI (Table, Button, Input), hooks (useDebounce)

COMPONENTE TableView(props):

- PROPS: incidents, pagination, sorting params, callbacks, export props.

- ESTADO: searchValue (local para input controlado), debouncedSearchValue.

- EFECTOS:
  - Sincronizar debounceSearchValue con onSearchChange prop.
  - Sincronizar prop searchTerm externa con searchValue local.

- RENDER:
  - Barra superior:
    - Input de búsqueda (CommandInput).
    - Indicador de resultados ("Showing X-Y of Z").
    - Botón Exportar CSV.
  - Tabla:
    - Headers ordenables (Severity, Reported, Occurrence).
    - Rows iterando 'incidents':
      - ID, Status, Severity (Badge con color), Type, Fechas.
      - Botón "View" -> onIncidentClick.
  - Overlay de carga/error/vacío.
  - Paginación (si totalCount > 0):
    - Botones Prev/Next.
    - Números de página.
    - Métricas de paginación.
