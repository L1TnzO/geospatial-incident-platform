# client/src/lib/query-client.ts

## Reference

Original File: [client/src/lib/query-client.ts](client/src/lib/query-client.ts)

## Summary

Configuración del cliente de React Query y su persistencia en IndexedDB.

## Pseudocode

```typescript
/*
    Constante DEFAULT_QUERY_OPTIONS
    - staleTime: 30 segundos.
    - gcTime: 24 horas.
    - refetchOnWindowFocus: Falso.
*/

/*
    Función createQueryClient()
    Crea y retorna una nueva instancia de QueryClient con las opciones por defecto configuradas.
*/

/*
    Función createIDBPersister(idbValidKey)
    Crea un persistidor asíncrono usando idb-keyval (IndexedDB).
    
    Retorna objeto Persister con:
    - persistClient: Guarda el cliente en IDB (set).
    - restoreClient: Recupera el cliente de IDB (get).
    - removeClient: Elimina el cliente de IDB (del).
*/
```
