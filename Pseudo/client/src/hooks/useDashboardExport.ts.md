# client/src/hooks/useDashboardExport.ts

## Reference

Original File: [client/src/hooks/useDashboardExport.ts](client/src/hooks/useDashboardExport.ts)

## Summary

Hook complejo que gestiona el estado y ciclo de vida de la exportación de datos del dashboard a CSV (progreso, éxito, error, cancelación). Usa un reducer interno.

## Pseudocode

```typescript
/*
    Hook useDashboardExport
    
    Estado Interno (useReducer):
    - isExporting: false
    - exportError: null
    
    Acciones Reducer:
    - START_EXPORT, EXPORT_SUCCESS, EXPORT_ERROR, RESET, CANCEL.

    Referencias (useRef):
    - abortController: Para cancelar la petición fetch.
    - currentPromise: Para trackear la promesa activa.

    Función exportFn(params):
    1. Crear nuevo AbortController.
    2. Dispatch START_EXPORT.
    3. Llamar a exportDashboardCsv pasando signal.
    4. Si tiene éxito -> Dispatch EXPORT_SUCCESS, retornar resultado.
    5. Si falla -> Dispatch EXPORT_ERROR, lanzar error.
    6. Finally -> Limpiar controller.

    Función cancelExport():
    1. Abortar controller actual.
    2. Dispatch CANCEL.

    Retorno: exportFn, isExporting, error, cancel, reset.
*/
```
