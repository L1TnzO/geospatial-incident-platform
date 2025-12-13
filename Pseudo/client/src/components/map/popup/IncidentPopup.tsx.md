# client/src/components/map/popup/IncidentPopup.tsx

## Reference

Original File: [client/src/components/map/popup/IncidentPopup.tsx](client/src/components/map/popup/IncidentPopup.tsx)

## Summary

Popup content for incident markers.

## Pseudocode

MÓDULO components/map/popup/IncidentPopup

IMPORTAR: UI Button, Badge.

COMPONENTE IncidentPopup(props):

- PROPS: incident, onViewDetails callback.

- RENDER:
  - Header: Badge Severity + Status text.
  - Body:
    - Incident Type (Big text).
    - Grid stats (ID, Occurrence Time).
  - Footer: Button "View details".
