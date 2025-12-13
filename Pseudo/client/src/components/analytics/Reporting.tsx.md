# client/src/components/analytics/Reporting.tsx

## Reference

Original File: [client/src/components/analytics/Reporting.tsx](client/src/components/analytics/Reporting.tsx)

## Summary

Reporting interface component.

## Pseudocode

MÓDULO components/analytics/Reporting

IMPORTAR: UI Cards, Buttons, toast

COMPONENTE Reporting(props):

- PROPS: incidents[].

- FUNCIONES GENERADORAS:
  - generateDistrictFrequencyReport():
    - Calcula stats por zona.
    - Genera string CSV (encabezados, datos de frecuencia, breakdown por tipo).
    - Crea Blob y dispara descarga (a.click()).
    - Toast éxito.
  - generateAnnualSummaryReport():
    - Calcula totales anuales, promedio respuesta.
    - Totales por tipo y severidad.
    - Breakdown mensual.
    - Genera TXT formateado.
    - Crea Blob y dispara descarga.

- RENDER:
  - Card 1: District Frequency Report (Acción: Descargar CSV).
  - Card 2: Annual Summary Report (Acción: Descargar TXT).
  - Card 3: Historial de Reportes (Mock list).
