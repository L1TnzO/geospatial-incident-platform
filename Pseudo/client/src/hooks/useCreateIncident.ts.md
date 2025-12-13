# client/src/hooks/useCreateIncident.ts

## Reference

Original File: [client/src/hooks/useCreateIncident.ts](client/src/hooks/useCreateIncident.ts)

## Summary

Hook que envuelve la mutación para crear un incidente. Maneja la actualización optimista de la UI y la invalidación de queries de React Query.

## Pseudocode

```typescript
/*
    Hook useCreateIncident
    
    Retorna useMutation:
    - mutationFn: Llamar a apiClient.incidents.create(payload).
    - onSuccess(detail):
      1. Mapear detalle de respuesta a formato UI.
      2. Cachear detalle en incident-detail-store.
      3. Abrir incidente en el store (seleccionar).
      4. Actualizar repositorio local "optimistamente" (incidentRepository.upsertIncident).
      5. Invalidar queries 'incidents.all' y 'incidents.metadata' para refrescar listas.
*/
```
