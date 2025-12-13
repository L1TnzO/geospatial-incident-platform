# client/src/components/dashboard/DashboardExportButton.tsx

## Reference

Original File: [client/src/components/dashboard/DashboardExportButton.tsx](client/src/components/dashboard/DashboardExportButton.tsx)

## Summary

Button to trigger dashboard data export.

## Pseudocode

MÓDULO components/dashboard/DashboardExportButton

IMPORTAR: UI Button, hook useDashboardExport

COMPONENTE DashboardExportButton(props):

- PROPS: filters, disabled, callbacks.
- HOOK: useDashboardExport.

- HANDLER handleExport:
  - Llama triggerExport con filtros.
  - Crea elemento <a> oculto con blobUrl.
  - Simula click para descargar.
  - Limpia URL.revokeObjectURL.
  - Notifica éxito o error.

- EFECTO: Propaga errores del hook al callback onError.

- RENDER:
  - Botón "Export CSV" (o "Exporting...").

COMPONENTE DashboardExportErrorBanner(props):

- RENDER: Alert mostrando error de exportación con Retry/Dismiss.
