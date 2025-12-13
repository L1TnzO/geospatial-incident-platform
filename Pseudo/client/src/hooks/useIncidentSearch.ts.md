# client/src/hooks/useIncidentSearch.ts

## Reference

Original File: [client/src/hooks/useIncidentSearch.ts](client/src/hooks/useIncidentSearch.ts)

## Summary

Hook avanzado para la barra de búsqueda de incidentes. Gestiona input debounced, historial de búsqueda en localStorage, sugerencias y ejecución de búsquedas con cancelación (AbortController).

## Pseudocode

```typescript
/*
    Hook useIncidentSearch(options)
    
    Estado:
    - term: valor del input.
    - debouncedTerm: valor retrasado.
    - history: historial cargado de localStorage.
    - isSearching, searchError, lastResult.

    Funciones:
    - search(value): 
      1. Normalizar término.
      2. Abortar búsqueda anterior si existe.
      3. Ejecutar apiClient.incidents.search.
      4. Si el resultado es válido, actualizar historial (persistir localStorage) y lastResult.
    
    - updateHistory: Añadir nueva entrada y limitar tamaño.
    - clearHistory: Borrar localStorage.
    
    Efectos:
    - Sincronizar term -> debouncedTerm.
    - Auto-search: Si debouncedTerm cambia y autoSearch es true, disparar search().
    
    Retorno: Objeto completo de control (term, setters, history, funciones).
*/
```
