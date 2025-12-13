# client/src/hooks/useInfrastructureData.ts

## Reference

Original File: [client/src/hooks/useInfrastructureData.ts](client/src/hooks/useInfrastructureData.ts)

## Summary

Hook para cargar datos de infraestructura obsoleta.

## Pseudocode

```typescript
/*
    Hook useInfrastructureData
    
    1. Ejecutar useQuery.
       - Key: queryKeys.infrastructure.all.
       - Fn: listInfrastructure() -> mapInfrastructureToUi.
       - Cache: Stale 1 min.
*/
```
