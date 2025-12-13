MÓDULO components/IncidentDetailModal

IMPORTAR: UI Dialog, Table, Badge. Hooks useIncidentDetail, useReverseGeocode.

COMPONENTE IncidentDetailModal:

- STORE: selectedIncident, isOpen, closeIncident.
- QUERY: useIncidentDetail (fetch full data if needed).
- MEMO: Combinar selectedIncident (preview) con detailQuery.data (full).

- LOGIC:
  - Reverse Geocode si hay coordenadas.
  - Adaptadores para Unidades, Assets, Notas (maneja legacy data formats).

- RENDER:
  - Dialog Modal.
  - Header: Title, Type, Status/Severity Badges.
  - Body:
    - Grid Details (Time, Location + Link to Maps).
    - Description / Narrative Sections.
    - Tables (Units, Assets) if data exists.
    - List (Notes) if data exists.
  - Error/Loading states handling.
