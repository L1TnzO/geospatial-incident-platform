MÓDULO components/StationSelector

IMPORTAR: Hooks useStationsData, UI Table/Input.

COMPONENTE StationSelector(props):

- PROPS: selectedUnits[], onChange.
- DATA: stations list.
- ESTADO: inputValue (search), isOpen (autocomplete).

- LOGIC:
  - handleSelect: Resolve station code/name discrepancies. Check duplicates. Add to list with default timestamps.
  - handleUpdateField: Modificar Dispatch/Clear times in place.
  - filteredStations: Search logic.

- RENDER:
  - Input Search con Autocomplete dropdown (custom popover).
  - Table of Selected Units:
    - Unit Name.
    - Role Input.
    - Times Inputs (Out/In).
    - Remove Button.
