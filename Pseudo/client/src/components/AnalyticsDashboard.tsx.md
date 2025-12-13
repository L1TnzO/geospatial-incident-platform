MÓDULO components/AnalyticsDashboard

IMPORTAR: UI Tabs, Card, Input. Analytics Subcomponents.

COMPONENTE AnalyticsDashboard(props):

- PROPS: incidents, fireStations.
- ESTADO: dateRange (start, end).

- FILTRADO:
  - filteredIncidents = incidents.filter(dateRange).

- RENDER:
  - Card con Global Date Filter inputs.
  - Tabs (Tactical, Strategic, Geospatial, Reporting).
  - TabsContent -> Renderiza los subcomponentes pasando filteredIncidents.
