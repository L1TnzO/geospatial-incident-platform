# client/src/pages/ConsolidatedReportPage.tsx

## Reference

Original File: [client/src/pages/ConsolidatedReportPage.tsx](client/src/pages/ConsolidatedReportPage.tsx)

## Summary

Página de Informe Consolidado que combina el Dashboard operativo y el análisis Estratégico en una sola vista optimizada para impresión en PDF o papel.

## Pseudocode

```typescript
/*
    Funciones Helper
    - handlePrint: Llama a window.print() para iniciar el diálogo de impresión del navegador.
*/

/*
    Componente ConsolidatedReportPage
    
    Render:
    1. Envolver todo en DashboardProvider.
    2. Header (Oculto al imprimir):
       - Título y descripción.
       - Botón "Print Report" que ejecuta handlePrint.
    3. Contenido del Reporte:
       - Sección Dashboard:
         - Título.
         - DashboardContent (con overflow-visible para mostrar todo el contenido al imprimir).
         - Salto de página forzado en impresión (print:break-after-page).
       - Separador (hr).
       - Sección Estratégica:
         - Título.
         - StrategicLayout (con hideMap=true y overflow-visible).
    4. Estilos inyectados (<style> @media print):
       - Ocultar navegación, headers, footers.
       - Expandir contenedores scrolleables (auto height).
       - Eliminar sombras y bordes para limpieza visual.
       - Forzar fondo blanco y texto negro.
*/
```
