MÓDULO components/FiltersPanel

IMPORTAR: useIncidentFiltersStore, UI Inputs/Checkbox/Switch.

COMPONENTE FiltersPanel:

- STORE: extrae filters y setters (startDate, endDate, codes, isActive...).
- QUERY: metadataQuery (Incident Types, Severities).
- ESTADO: draft (copia local de filtros para edición).

- EFECTOS:
  - Sync draft con store changes.
  - Guest Restriction: Force isActive=true si no hay usuario logueado.

- HANDLERS:
  - toggleCode: Add/Remove codigo a arrays.
  - handleApply: Commit draft to store.
  - handleReset: Reset store y draft.

- RENDER:
  - Card.
  - Date Range inputs (min/max from metadata).
  - Active Switch (condicional por rol).
  - Checkbox Lists (ScrollAreas) para Type, Severity, Status.
  - Action Buttons (Apply, Reset). Apply disabled si no changed.
