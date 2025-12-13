MÓDULO utils/incident-mapper

IMPORTAR: Types (API, Inner).

LOGIC:

- extractCoordinates: Safe check for [lng, lat] in GeoJSON geometry.
- resolveAddress: Busca multiples propiedades (label, name, addressLine, formatted, etc) en location.properties.
- mapIncidentToUi: Transforma IncidentListLike -> LiteIncident. Return null si invalid coords.
- mapUnitsToUi / mapAssetsToUi / mapNotesToUi: Arrays maps.
- mapIncidentDetailToUi: Wrapper que combina base map + details arrays (units/assets/notes).
