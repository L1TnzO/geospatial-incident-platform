# client/src/pages/CreateIncidentPage.tsx

## Reference

Original File: [client/src/pages/CreateIncidentPage.tsx](client/src/pages/CreateIncidentPage.tsx)

## Summary

Página dedicada a la creación de nuevos incidentes. Divide la interfaz en un formulario de datos y un selector de ubicación en el mapa.

## Pseudocode

```typescript
/*
    Componente CreateIncidentPage
    
    Estructura (Grid Layout):
    1. Columna Izquierda (Formulario):
       - Componente IncidentForm.
       - Scrollable independientemente.
    2. Columna Derecha (Mapa e Instrucciones):
       - Tarjeta "Location Selection":
         - Contiene LocationPickerMap (componente interactivo para fijar coordenadas).
         - Ocupa el espacio flexible verticalmente.
       - Tarjeta "Instructions":
         - Pasos simples para el usuario (Seleccionar ubicación -> Llenar datos -> Guardar).
*/
```
