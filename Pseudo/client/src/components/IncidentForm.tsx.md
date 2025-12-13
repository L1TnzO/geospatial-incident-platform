MÓDULO components/IncidentForm

IMPORTAR: UI Form Elements, Child Selectors (Station, Asset, Note), Hooks.

COMPONENTE IncidentForm:

- STORE: coordinates (leídas desde el mapa).
- ESTADO Local: formData (cadenas de texto para inputs), selectedUnits[], selectedAssets[], selectedNotes[].
- ESTADO: Errors object.

- EFECTO:
  - Actualizar lat/lng inputs cuando store coordinates cambian.

- VALIDACIÓN:
  - Chequear required fields (Title, Type, Severity, Status, Date, Time, Location).

- SUBMIT:
  - Construir Payload complejo (incluyendo metadata object con los arrays).
  - useCreateIncident mutation.
  - On success: toast + close drawer.

- RENDER:
  - Card con Form.
  - 3 Secciones principales:
    1. Basic Details (Type, Severity, Status, DateTime).
    2. Content (Title, Narrative).
    3. Operational (StationSelector, AssetSelector, NoteSelector).
  - Read-only Location inputs (Lat/Lng).
  - Save/Cancel buttons.
