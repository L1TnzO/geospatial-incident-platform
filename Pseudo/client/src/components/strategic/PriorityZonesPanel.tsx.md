# client/src/components/strategic/PriorityZonesPanel.tsx

## Reference

Original File: [client/src/components/strategic/PriorityZonesPanel.tsx](client/src/components/strategic/PriorityZonesPanel.tsx)

## Summary

Panel for managing or viewing priority zones.

## Pseudocode

MÓDULO components/strategic/PriorityZonesPanel

IMPORTAR: UI Card, Button, Icons.

COMPONENTE PriorityZonesPanel(props):

- PROPS: data, isLoading, error, callbacks.

- HELPER getRiskLevel(score): Retorna color/label (Critical/High/Med/Low).
- HELPER getRecommendation(zone): Retorna string de acción sugerida según score.

- CALCULOS:
  - Top Lists filtradas y sorteadas por normalizedScore.

- RENDER:
  - Listado de Zones Cards.
  - Card Item:
    - Header con Risk Level Badge.
    - Grid Stats: Incidents, Risk Score, Avg Severity.
    - Action Button: View on Map.
    - Footer Recommendation text.
