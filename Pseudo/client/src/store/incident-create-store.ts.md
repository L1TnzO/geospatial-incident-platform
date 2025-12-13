MÓDULO store/incident-create-store

IMPORTAR: zustand.

INTERFACE IncidentCreateState:

- isOpen, isSelectingLocation, coordinates.
- Actions: open, close, begin/complete/cancelLocationSelection.

STORE useIncidentCreateStore:

- isOpen: default false.
- Actions implementation (set state).
