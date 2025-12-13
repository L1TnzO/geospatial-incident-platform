# client/src/hooks/index.md

## Reference

Original Directory: [client/src/hooks](client/src/hooks)

## Summary

Este directorio contiene hooks personalizados que encapsulan la lógica de negocio, acceso a datos (React Query) y utilidades de UI. A continuación se presenta un índice de los hooks disponibles agrupados por dominio.

## Módulos

### Autenticación

- **useAuth**: Acceso al contexto de usuario y métodos de login/logout.

### Gestión de Incidentes

- **useIncidentsData / useIncidentsTableData**: Hooks principales para listados, filtrado, paginación y sincronización con repositorio local.
- **useIncidentDetail**: Detalle de un incidente simple.
- **useCreateIncident**: Mutación para crear nuevos incidentes.
- **useIncidentSearch**: Lógica de búsqueda avanzada con historial y debounce.
- **useIncidentExport**: Exportación masiva de incidentes a CSV.
- **useIncidentMetadataQuery**: Metadatos para filtros (tipos, rangos).

### Dashboard Operativo

- **useDashboard**: Contexto compartido del dashboard.
- **useDashboardDailyTrend**: Datos de tendencia diaria.
- **useDashboardExport**: Exportación de métricas del dashboard.
- **useDashboardHighSeverityKpi**: KPIs específicos para alta severidad.
- **useDashboardLast24HoursKpi**: Métricas comparativas 24h.
- **useDashboardRecentIncidents**: Listado de últimos incidentes.
- **useDashboardSeverityDistribution**: Distribución por severidad.
- **useDashboardTypeDistribution**: Distribución por tipo.

### Análisis Estratégico

- **useStrategicCoverage**: Análisis de cobertura de estaciones.
- **useStrategicDailyTrend**: Tendencias para vista estratégica.
- **useStrategicDistrictFrequentIncidents**: Frecuencia por distritos.
- **useStrategicHotspots**: Mapas de calor.
- **useStrategicPriorityZones**: Puntajes de prioridad por zona.
- **useStrategicProjections**: Proyecciones futuras.
- **useStrategicResponseTimes**: Métricas de tiempos de respuesta.
- **useStrategicStationVolume**: Volumen por estación.
- **useStrategicTimeOfDay**: Análisis temporal (mañana/tarde/noche).
- **useStrategicTrends**: Tendencias mensuales/trimestrales.
- **useStrategicZoneFrequency**: Frecuencia por zonas.

### Datos Maestros e Infraestructura

- **useStationsData**: Catálogo de estaciones de bomberos.
- **useInfrastructureData**: Catálogo de infraestructura obsoleta.
- **useReverseGeocode**: Geocodificación inversa (Coords -> Dirección).

### Utilidades

- **use-media-query**: Responsive design en JS.
- **useDebounce**: Control de frecuencia de actualizaciones.
- **useLocalWorker**: Gestión de Web Workers.

```

```
