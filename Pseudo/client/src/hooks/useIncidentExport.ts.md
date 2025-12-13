# client/src/hooks/useIncidentExport.ts

## Reference

Original File: [client/src/hooks/useIncidentExport.ts](client/src/hooks/useIncidentExport.ts)

## Summary

Hook que maneja la lógica de exportación masiva de incidentes. Itera sobre todas las páginas de resultados ("chunking") para construir un CSV completo en el cliente.

## Pseudocode

```typescript
/*
    Hook useIncidentExport
    
    Función exportData(filters):
    1. Iniciar estado isExporting = true.
    2. Obtener primera página (CHUNK_SIZE 1000) para saber total de páginas.
    3. Si hay más páginas:
       - Crear promesas para el resto.
       - Ejecutar en lotes (BATCH_SIZE 5) con Promise.all para no saturar la red.
    4. Acumular y mapear todos los incidentes.
    5. Generar contenido CSV manualmente (headers + filas escapadas).
    6. Crear Blob y disparar descarga de archivo temporalmente.
    7. Notificar éxito/error con toast.
*/
```
