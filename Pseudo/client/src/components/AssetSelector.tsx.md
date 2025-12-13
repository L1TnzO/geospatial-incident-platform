MÓDULO components/AssetSelector

IMPORTAR: UI Table, Select, Input, Button.

COMPONENTE AssetSelector(props):

- PROPS: selectedAssets, onChange.
- ESTADO: newAsset (identifier, type, status, notes).
- CONSTANTES: ASSET_TYPES, ASSET_STATUSES.

- HANDLERS:
  - handleAdd: Validar ID, duplicados. Append a list. Reset form.
  - handleRemove: Filter out by ID.

- RENDER:
  - Formulario inline (Grid) para newAsset.
  - Botón Add (+)
  - Tabla de assets seleccionados con botón Remove (X).
