# client/src/hooks/useReverseGeocode.ts

## Reference

Original File: [client/src/hooks/useReverseGeocode.ts](client/src/hooks/useReverseGeocode.ts)

## Summary

Hook para convertir coordenadas (lat, lng) en una dirección legible usando la API de Nominatim (OpenStreetMap).

## Pseudocode

```typescript
/*
    Hook useReverseGeocode({ lat, lng, enabled })
    
    1. Validar coordenadas.
    2. Construir URL a Nominatim (format=jsonv2, addressdetails=1).
    3. Hacer fetch.
    4. Parsear respuesta y construir "shortLabel" con partes relevantes de la dirección (calle, ciudad, región).
    5. Retornar { displayName, shortLabel }.
    
    Cache: 30 minutos (Stale Time).
*/
```
