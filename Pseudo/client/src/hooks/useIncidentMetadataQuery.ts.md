# client/src/hooks/useIncidentMetadataQuery.ts

## Reference

Original File: [client/src/hooks/useIncidentMetadataQuery.ts](client/src/hooks/useIncidentMetadataQuery.ts)

## Summary

Hook para cargar metadatos globales de incidentes (rangos de fechas válidos, tipos disponibles, severidades) usados en filtros.

## Pseudocode

```typescript
/*
    Hook useIncidentMetadataQuery(options)
    
    1. Ejecutar useQuery:
       - Key: queryKeys.incidents.metadata.
       - Fn: apiClient.incidents.metadata.
       - StaleTime: 5 min (datos poco cambiantes).
*/
```
