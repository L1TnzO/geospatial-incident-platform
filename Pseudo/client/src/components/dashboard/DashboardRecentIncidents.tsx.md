# client/src/components/dashboard/DashboardRecentIncidents.tsx

## Reference

Original File: [client/src/components/dashboard/DashboardRecentIncidents.tsx](client/src/components/dashboard/DashboardRecentIncidents.tsx)

## Summary

List view of recently added incidents.

## Pseudocode

MÓDULO components/dashboard/DashboardRecentIncidents

IMPORTAR: UI Card, Badge, Store (Map, IncidentDetail), router navigate

HELPER toIncident(raw): Mapea DB object a LiteIncident interface.

COMPONENTE DashboardRecentIncidents(props):

- PROPS: recentQuery.
- HOOKS: useMapStore, useIncidentDetailStore.

- HANDLERS:
  - handleViewOnMap(incident):
    - Extrae coords.
    - setView map store.
    - set selectedIncident (sin abrir modal completo).
    - navigate('/map').
  - handleOpenDetails(incident):
    - openIncident (abre modal detalle completo).

- RENDER:
  - Loading: Lista de Cards Skeleton.
  - Error: Alert.
  - Success: Lista scrollable de incidentes.
    - Card por incidente:
      - Header: Severity Badge, Status, ID.
      - Title.
      - Metadata (Type, Station, Reported Time).
      - Footer Buttons (View on Map, Details).
