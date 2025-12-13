# client/src/hooks/useIncidentsQuery.ts

## Reference

Original File: [client/src/hooks/useIncidentsQuery.ts](client/src/hooks/useIncidentsQuery.ts)

## Summary

Hook simple que envuelve `useQuery` para hacer fetch directo a la API de listado de incidentes. (Menos usado que `useIncidentsData` que usa el repositorio local, pero útil para casos desconectados del store global).

## Pseudocode

```typescript
/*
    Hook useIncidentsQuery(params, options)
    
    1. Ejecutar useQuery.
       - Key: queryKeys.incidents.list(params).
       - Fn: apiClient.incidents.list.
*/
```
