MÓDULO store/map-store

IMPORTAR: zustand.

INTERFACE MapState:

- center: [lat, lng].
- zoom: number.
- bounds.
- hasUserAdjusted boolean.
- Actions: setView, setBounds.

STORE useMapStore:

- Simple state holder.
- Helper serializeBounds for API params.
