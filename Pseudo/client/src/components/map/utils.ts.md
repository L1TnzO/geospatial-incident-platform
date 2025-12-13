# client/src/components/map/utils.ts

## Reference

Original File: [client/src/components/map/utils.ts](client/src/components/map/utils.ts)

## Summary

Funciones de utilidad para operaciones relacionadas con el mapa, como la resolución de colores por severidad y el cálculo de límites geográficos (bounds).

## Pseudocode

```typescript
/*
    Constante FALLBACK_SEVERITY_COLORS
    Mapea niveles de severidad ('Critical', 'High', 'Medium', 'Low') a códigos de color hexadecimales.
*/

/*
    Función resolveSeverityColor(incident)
    Propósito: Determinar el color de visualización para un incidente.
    Entrada: Objeto incident (LiteIncident).
    Salida: String de color.
    
    1. Retornar incident.severityColor si existe.
    2. Si no, retornar el color correspondiente en FALLBACK_SEVERITY_COLORS según incident.severity.
    3. Si no hay coincidencia, retornar un color azul por defecto ('#2563eb').
*/

/*
    Función computeIncidentBounds(incidents)
    Propósito: Calcular los límites geográficos (bounds) que encierran un conjunto de incidentes.
    Entrada: Array de incidentes (LiteIncident[]).
    Salida: Objeto LatLngBounds de Leaflet o null.

    1. Mapear incidents a un array de puntos [lat, lng]:
       a. Extraer lat y lng de incident.location.
       b. Si lat o lng no son números, retornar null (filtrado posteriormente).
       c. Retornar par [lat, lng].
    2. Filtrar el array para eliminar valores null.
    3. Si el array de puntos está vacío, retornar null.
    4. Convertir el array de puntos a LatLngBounds usando latLngBounds de leaflet.
    5. Retornar el objeto bounds.
*/
```
