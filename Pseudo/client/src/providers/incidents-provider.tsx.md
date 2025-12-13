# client/src/providers/incidents-provider.tsx

## Reference

Original File: [client/src/providers/incidents-provider.tsx](client/src/providers/incidents-provider.tsx)

## Summary

Proveedor de datos de incidentes que orquesta la obtención de datos del servidor y el filtrado avanzado en el cliente utilizando un Web Worker para mantener la UI fluida.

## Pseudocode

```typescript
/*
    Componente IncidentsProvider
    
    Hooks y Store:
    1. Obtener filtros desde incident-filters-store (Zustand).
    2. Preparar fetchParams:
       - Incluir solo filtros de servidor (fechas, isActive).
       - OMITIR filtros de cliente (tipos, severidad, status) para traer dataset amplio.
    3. useIncidentsData(fetchParams): Hook para cargar datos crudos desde API.

    Estado Local:
    - filteredIncidents: Lista final de incidentes filtrados para renderizar.
    - workerRef: Referencia a la instancia del Web Worker.

    Ciclo de Vida del Worker:
    1. useEffect (Mount):
       - Instanciar Worker (incident-worker.ts).
       - Configurar onmessage:
         - Al recibir DATA_UPDATED o FILTER_COMPLETE -> actualizar filteredIncidents.
       - Cleanup: Terminar worker.

    Sincronización de Datos (Main -> Worker):
    1. useEffect (Data Change):
       - Cuando cambian los incidentes cargados (incidentsData):
       - Enviar mensaje SET_DATA al worker con los nuevos incidentes y los filtros actuales.
    
    Sincronización de Filtros (Main -> Worker):
    1. useEffect (Filter Change):
       - Cuando cambian los filtros de cliente (type, severity, etc.):
       - Enviar mensaje FILTER_DATA al worker para reprocesar el dataset existente sin recargar de API.

    Valores Expuestos:
    - incidents: La lista filtrada.
    - totalCount/renderedCount: Conteos basados en la lista filtrada.
    - worker: Instancia del worker.
    - ...incidentsData: Estados de carga/error del fetch original.
*/
```
