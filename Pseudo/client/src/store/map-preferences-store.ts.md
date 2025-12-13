MÓDULO store/map-preferences-store

IMPORTAR: zustand check middleware.

INTERFACE MapPreferencesState:

- Toggles booleanas para cada Layer (Stations, Incidents, Hotspots, Coverage, Priority) x 2 (Tactical vs Strategic).
- Actions: setShowXY, toggleXY.

STORE useMapPreferencesStore:

- Uses `persist` middleware.
- Migration logic (V1->V2->V3) handling new keys.
- Default values (Incidents ON, others OFF).
