MÓDULO components/IncidentCreateDrawer

IMPORTAR: UI Drawer, IncidentForm, incident-create-store.

COMPONENTE IncidentCreateDrawer:

- STORE: isOpen, open/close, coordinates state, beginLocationSelection.

- RENDER:
  - Drawer Root controlled by isOpen.
  - DrawerContent:
    - Header: Title.
    - Body:
      - Button "Pick location on map" (toggle store selecting state).
      - Display selected coordinates text.
      - IncidentForm component.
    - Footer: Close button.
