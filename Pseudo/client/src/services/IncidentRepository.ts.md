# client/src/services/IncidentRepository.ts

## Reference

Original File: [client/src/services/IncidentRepository.ts](client/src/services/IncidentRepository.ts)

## Summary

Client-side database (IndexedDB) manager. Handles offline storage, synchronization, and optimistic UI updates.

## Pseudocode

MÓDULO services/IncidentRepository

IMPORTAR: idb-keyval (IndexedDB), apiClient

CLASE IncidentRepository (Singleton)
PROPIEDADES: - incidents: Map<string, Incident> (Memoria) - syncStatus: Estado de última sincronización - listeners: Set de funciones callback - isInitialized: boolean

    MÉTODO static getInstance():
        - Retornar instancia única.

    MÉTODO subscribe(listener):
        - Agregar listener y retornar función de unsubscribe.

    MÉTODO getIncidents():
        - Retornar array ordenado por fecha de lo que hay en memoria.

    MÉTODO sync():
        - Si ya hay sync en progreso, retornar esa promesa.
        - Ejecutar performSync().

    MÉTODO PRIVADO performSync():
        1. Si no está inicializado, llamar initialize().
        2. Consultar estado del servidor (syncStatus).
        3. Si servidor tiene cambios (timestamp > local):
           a. Intentar obtener DELTA (apiClient.getDelta).
              - Aplicar cambios (Upsert/Delete) al mapa en memoria.
           b. Si falla delta o hay demasiada divergencia:
              - Ejecutar FULL FETCH paginado.
              - Iterar páginas hasta completar.
              - Reemplazar mapa local.
        4. Guardar snapshot actualizado en IndexedDB (para persistencia offline).
        5. Notificar listeners.

    MÉTODO initialize():
        - Cargar datos desde IndexedDB a memoria al arrancar.

EXPORTAR incidentRepository (Singleton)
