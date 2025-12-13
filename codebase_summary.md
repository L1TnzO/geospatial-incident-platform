# Codebase Logic Summary

## Backend (server)

### Controllers

- **[server/src/controllers/dashboardController.ts](server/src/controllers/dashboardController.ts)**: Endpoints for dashboard KPIs, trends, and distribution data.
- **[server/src/controllers/incidentsController.ts](server/src/controllers/incidentsController.ts)**: Endpoints for incident management (list, create, details, map data, sync/delta).
- **[server/src/controllers/infrastructureController.ts](server/src/controllers/infrastructureController.ts)**: Endpoints for retrieving obsolete infrastructure data.
- **[server/src/controllers/stationsController.ts](server/src/controllers/stationsController.ts)**: Endpoints for retrieving station data and coverage.
- **[server/src/controllers/strategicController.ts](server/src/controllers/strategicController.ts)**: Endpoints for advanced strategic analysis (projections, hotspots, performance zones).

### Services

- **[server/src/services/dashboardService.ts](server/src/services/dashboardService.ts)**: Business logic for aggregating dashboard metrics and handling data transformations for charts.
- **[server/src/services/incidentsService.ts](server/src/services/incidentsService.ts)**: Core logic for incident operations, including validation, caching, and delta generation.
- **[server/src/services/incidentsTableDataService.ts](server/src/services/incidentsTableDataService.ts)**: Specialized logic for formatting incident data for the tabular view, including pagination calculations.
- **[server/src/services/strategicService.ts](server/src/services/strategicService.ts)**: Complex analytical logic for strategic reports, including geospatial calculations and trend analysis.

### Repositories

- **[server/src/db/repositories/incidentsRepository.ts](server/src/db/repositories/incidentsRepository.ts)**: Knex-based data access for incidents, including PostGIS spatial queries.
- **[server/src/db/repositories/infrastructureRepository.ts](server/src/db/repositories/infrastructureRepository.ts)**: Data access for obsolete infrastructure items.
- **[server/src/db/repositories/stationsRepository.ts](server/src/db/repositories/stationsRepository.ts)**: Data access for fire stations and their response zones.

### Middleware

- **[server/src/middleware/errorHandler.ts](server/src/middleware/errorHandler.ts)**: Global error handling middleware.
- **[server/src/middleware/notFoundHandler.ts](server/src/middleware/notFoundHandler.ts)**: Middleware to handle 404 Not Found errors.
- **[server/src/middleware/index.ts](server/src/middleware/index.ts)**: Middleware aggregator exporting all middleware.

### Routes

- **server/src/routes/dashboard.ts**: Dashboard routes definition.
- **server/src/routes/incidents.ts**: Incident routes definition.
- **server/src/routes/infrastructure.ts**: Infrastructure routes definition.
- **server/src/routes/stations.ts**: Station routes definition.
- **server/src/routes/strategic.ts**: Strategic analysis routes definition.
- **[server/src/routes/index.ts](server/src/routes/index.ts)**: Main router aggregator merging all route modules.

- **[server/src/routes/health.ts](server/src/routes/health.ts)**: Health check endpoint returning uptime and service status.

### Configuration & Entry

- **[server/src/app.ts](server/src/app.ts)**: Express app setup and middleware configuration.
- **[server/src/index.ts](server/src/index.ts)**: Server entry point.
- **[server/src/config/env.ts](server/src/config/env.ts)**: Environment variable loader and parser (port, service name, version).
- **[server/src/config/pagination.ts](server/src/config/pagination.ts)**: Configuration constants for pagination.

### Database Core

- **[server/src/db/client.ts](server/src/db/client.ts)**: Manages the Knex database instance and connection lifecycle.
- **[server/src/db/index.ts](server/src/db/index.ts)**: Export barrel for DB client, types, and repositories.
- **[server/src/db/types.ts](server/src/db/types.ts)**: TypeScript definitions for database schemas/tables.

### Utils & Errors

- **[server/src/errors/httpError.ts](server/src/errors/httpError.ts)**: Custom error class for HTTP exceptions with status codes.

### Scripts

- **[server/src/scripts/check_counts.ts](server/src/scripts/check_counts.ts)**: Script to verify database record counts.
- **[server/src/scripts/verify-incident-counts.ts](server/src/scripts/verify-incident-counts.ts)**: Script to verify incident counts against expected values.
- **[server/src/scripts/test-tsnode.ts](server/src/scripts/test-tsnode.ts)**: Test script for verification.

### Utilities

- **[server/src/db/utils.ts](server/src/db/utils.ts)**: Helper functions for parsing Geometry and JSON columns from the database.

---

## Frontend (client)

### Pages

- **[client/src/pages/DashboardPage.tsx](client/src/pages/DashboardPage.tsx)**: Main dashboard page entry point.
- **[client/src/pages/StrategicPage.tsx](client/src/pages/StrategicPage.tsx)**: Strategic analysis page wrapper with DashboardProvider.
- **[client/src/pages/ConsolidatedReportPage.tsx](client/src/pages/ConsolidatedReportPage.tsx)**: Page for viewing consolidated incident reports.
- **[client/src/pages/CreateIncidentPage.tsx](client/src/pages/CreateIncidentPage.tsx)**: Page for creating new incidents.

### Authentication

- **[client/src/components/LoginScreen.tsx](client/src/components/LoginScreen.tsx)**: User login form with validation.
- **[client/src/providers/auth-provider.tsx](client/src/providers/auth-provider.tsx)**: Authentication context provider managing user session (mocked).
- **[client/src/providers/auth-context.ts](client/src/providers/auth-context.ts)**: Context definition for authentication state.
- **[client/src/providers/incidents-provider.tsx](client/src/providers/incidents-provider.tsx)**: Provider for incident-related context.
- **[client/src/providers/dashboard-provider.tsx](client/src/providers/dashboard-provider.tsx)**: Provider for dashboard state.
- **[client/src/providers/query-client-provider.tsx](client/src/providers/query-client-provider.tsx)**: React Query client provider setup.

### Components - Core & UI Structure

- **[client/src/main.tsx](client/src/main.tsx)**: Application entry point mounting the React app.
- **[client/src/App.tsx](client/src/App.tsx)**: Main application routing and provider setup.
- **[client/src/components/MainNavigation.tsx](client/src/components/MainNavigation.tsx)**: Top-level navigation bar.
- **[client/src/components/TableView.tsx](client/src/components/TableView.tsx)**: Complex data grid for incidents.
- **[client/src/components/AnalyticsDashboard.tsx](client/src/components/AnalyticsDashboard.tsx)**: Layout container for analytics tabs.
- **[client/src/components/IncidentForm.tsx](client/src/components/IncidentForm.tsx)**: Form for creating incidents.
- **[client/src/components/IncidentDetailModal.tsx](client/src/components/IncidentDetailModal.tsx)**: Modal displaying full incident details.
- **[client/src/components/FiltersPanel.tsx](client/src/components/FiltersPanel.tsx)**: Sidebar panel for global incident filtering.
- **[client/src/components/CollapsibleSidebar.tsx](client/src/components/CollapsibleSidebar.tsx)**: Reusable collapsible sidebar component.
- **[client/src/components/IncidentCreateDrawer.tsx](client/src/components/IncidentCreateDrawer.tsx)**: Drawer/Split-view for creating a new incident.
- **[client/src/components/AssetSelector.tsx](client/src/components/AssetSelector.tsx)**: Component for selecting assets.
- **[client/src/components/NoteSelector.tsx](client/src/components/NoteSelector.tsx)**: Component for adding/selecting notes.
- **[client/src/components/StationSelector.tsx](client/src/components/StationSelector.tsx)**: Dropdown or list for selecting fire stations.
- **[client/src/components/LocationPickerMap.tsx](client/src/components/LocationPickerMap.tsx)**: Map component for picking a location (lat/lng).

### Components - Map

- **[client/src/components/MapView.tsx](client/src/components/MapView.tsx)**: Main Leaflet map controller.
- **[client/src/components/map/IncidentClusterLayer.tsx](client/src/components/map/IncidentClusterLayer.tsx)**: Renders clustered incident markers.
- **[client/src/components/map/StationLayer.tsx](client/src/components/map/StationLayer.tsx)**: Renders stations and their coverage radius/zones.
- **[client/src/components/map/HotspotOverlay.tsx](client/src/components/map/HotspotOverlay.tsx)**: Heatmap or grid overlay for incident density.
- **[client/src/components/map/CoverageOverlay.tsx](client/src/components/map/CoverageOverlay.tsx)**: Visualizes coverage gaps.
- **[client/src/components/map/PriorityZoneOverlay.tsx](client/src/components/map/PriorityZoneOverlay.tsx)**: Displays high-priority areas.
- **[client/src/components/map/ObsoleteInfrastructureLayer.tsx](client/src/components/map/ObsoleteInfrastructureLayer.tsx)**: Markers for old infrastructure.
- **[client/src/components/map/popup/IncidentPopup.tsx](client/src/components/map/popup/IncidentPopup.tsx)**: Popup content for incident markers.
- **[client/src/components/map/utils.ts](client/src/components/map/utils.ts)**: Map-related utility functions.

### Components - Dashboard

- **[client/src/layouts/DashboardLayout.tsx](client/src/layouts/DashboardLayout.tsx)**: Main layout wrapper for dashboard pages, managing global filter state (time range, YoY) and rendering the control header.
- **[client/src/components/dashboard/DashboardKPICard.tsx](client/src/components/dashboard/DashboardKPICard.tsx)**: Reusable KPI display widget.
- **[client/src/components/dashboard/DashboardDailyTrendChart.tsx](client/src/components/dashboard/DashboardDailyTrendChart.tsx)**: Line chart for daily incident frequency.
- **[client/src/components/dashboard/DashboardSeverityDistributionChart.tsx](client/src/components/dashboard/DashboardSeverityDistributionChart.tsx)**: Bar/Pie chart for severity breakdown.
- **[client/src/components/dashboard/DashboardTypeDistributionChart.tsx](client/src/components/dashboard/DashboardTypeDistributionChart.tsx)**: Chart for incident types.
- **[client/src/components/dashboard/DashboardKPIRow.tsx](client/src/components/dashboard/DashboardKPIRow.tsx)**: Layout component for a row of KPI cards.
- **[client/src/components/dashboard/DashboardExportButton.tsx](client/src/components/dashboard/DashboardExportButton.tsx)**: Button to trigger dashboard data export.
- **[client/src/components/dashboard/DashboardRecentIncidents.tsx](client/src/components/dashboard/DashboardRecentIncidents.tsx)**: List view of recently added incidents.

### Components - Strategic Analysis

- **[client/src/components/strategic/StrategicLayout.tsx](client/src/components/strategic/StrategicLayout.tsx)**: Layout for the strategic view.
- **[client/src/components/strategic/DistrictFrequentIncidentsTable.tsx](client/src/components/strategic/DistrictFrequentIncidentsTable.tsx)**: Table of high-frequency districts.
- **[client/src/components/strategic/HighResponseTimeZones.tsx](client/src/components/strategic/HighResponseTimeZones.tsx)**: Analysis of slow response areas.
- **[client/src/components/strategic/IncidentProjectionTable.tsx](client/src/components/strategic/IncidentProjectionTable.tsx)**: Future incident predictions.
- **[client/src/components/strategic/ResponseTimeChart.tsx](client/src/components/strategic/ResponseTimeChart.tsx)**: Visualization of response times.
- **[client/src/components/strategic/StrategicTrendsChart.tsx](client/src/components/strategic/StrategicTrendsChart.tsx)**: Chart showing strategic trends over time.
- **[client/src/components/strategic/StrategicTimeOfDayChart.tsx](client/src/components/strategic/StrategicTimeOfDayChart.tsx)**: Analysis of incidents by time of day.
- **[client/src/components/strategic/StationVolumeChart.tsx](client/src/components/strategic/StationVolumeChart.tsx)**: Chart showing incident volume per station.
- **[client/src/components/strategic/ZoneFrequencyTable.tsx](client/src/components/strategic/ZoneFrequencyTable.tsx)**: Table showing incident frequency by zone.
- **[client/src/components/strategic/PriorityZonesPanel.tsx](client/src/components/strategic/PriorityZonesPanel.tsx)**: Panel for managing or viewing priority zones.

### Components - Analytics

- **[client/src/components/analytics/GeospatialAnalysis.tsx](client/src/components/analytics/GeospatialAnalysis.tsx)**: Advanced map analysis with heatmaps, hotspots, and station coverage visualization.
- **[client/src/components/analytics/Reporting.tsx](client/src/components/analytics/Reporting.tsx)**: Reporting interface component.
- **[client/src/components/analytics/StrategicInsights.tsx](client/src/components/analytics/StrategicInsights.tsx)**: Strategic insights dashboard component.
- **[client/src/components/analytics/TacticalOverview.tsx](client/src/components/analytics/TacticalOverview.tsx)**: Tactical overview component.
- **[client/src/components/figma/ImageWithFallback.tsx](client/src/components/figma/ImageWithFallback.tsx)**: Image component with error handling/fallback support.

### State Management (Stores)

- **[client/src/store/incident-filters-store.ts](client/src/store/incident-filters-store.ts)**: Global state for application filters (date, status, type).
- **[client/src/store/incident-detail-store.ts](client/src/store/incident-detail-store.ts)**: Manages state for the incident detail modal.
- **[client/src/store/map-preferences-store.ts](client/src/store/map-preferences-store.ts)**: Persists user map settings (layers, zoom).
- **[client/src/store/incident-create-store.ts](client/src/store/incident-create-store.ts)**: Manages state for the incident creation wizard/form.
- **[client/src/store/map-store.ts](client/src/store/map-store.ts)**: General map state management (zoom, center).

### Services & Workers

- **[client/src/services/incidents.ts](client/src/services/incidents.ts)**: Incident API service.
- **[client/src/services/stations.ts](client/src/services/stations.ts)**: Station API service.
- **[client/src/services/infrastructure.ts](client/src/services/infrastructure.ts)**: Infrastructure API service.
- **[client/src/services/IncidentRepository.ts](client/src/services/IncidentRepository.ts)**: Client-side database (IndexedDB) manager. Handles offline storage, synchronization, and optimistic UI updates.
- **[client/src/services/api-client.ts](client/src/services/api-client.ts)**: Typed wrapper for backend API calls.
- **[client/src/services/dashboard-service.ts](client/src/services/dashboard-service.ts)**: API service for fetching dashboard KPIs, charts, and handling exports.
- **[client/src/services/strategic-service.ts](client/src/services/strategic-service.ts)**: API service for strategic analysis data.
- **[client/src/services/query-keys.ts](client/src/services/query-keys.ts)**: React Query key constants.
- **[client/src/workers/incident-worker.ts](client/src/workers/incident-worker.ts)**: Web Worker for heavy incident processing (clustering, filtering) off the main thread.
- **[client/src/hooks/useLocalWorker.ts](client/src/hooks/useLocalWorker.ts)**: Hook to interface with `incident-worker.ts` for off-main-thread data processing.

### Hooks

- **[client/src/hooks/useIncidentsData.ts](client/src/hooks/useIncidentsData.ts)**: Primary hook for accessing incident data, binding generic state to UI.
- **[client/src/hooks/useDashboard\*.ts](client/src/hooks)**: (Multiple files) Specialized hooks for dashboard KPI and chart data (DailyTrend, SeverityDistribution, etc.).
- **[client/src/hooks/useStrategic\*.ts](client/src/hooks)**: (Multiple files) Specialized hooks for fetching and formatting data for each strategic chart (Trends, Coverage, Projections, etc).
- **[client/src/hooks/useAuth.ts](client/src/hooks/useAuth.ts)**: Hook for accessing authentication context.
- **[client/src/hooks/useCreateIncident.ts](client/src/hooks/useCreateIncident.ts)**: Hook managing incident creation logic.
- **[client/src/hooks/useIncidentSearch.ts](client/src/hooks/useIncidentSearch.ts)**: Hook for incident search functionality.
- **[client/src/hooks/useIncidentsQuery.ts](client/src/hooks/useIncidentsQuery.ts)**: Hook for querying incidents via React Query.
- **[client/src/hooks/useIncidentMetadataQuery.ts](client/src/hooks/useIncidentMetadataQuery.ts)**: Hook for fetching incident metadata.
- **[client/src/hooks/useStationsData.ts](client/src/hooks/useStationsData.ts)**: Hook for fetching station data.
- **[client/src/hooks/useInfrastructureData.ts](client/src/hooks/useInfrastructureData.ts)**: Hook for fetching infrastructure data.
- **[client/src/hooks/useIncidentDetail.ts](client/src/hooks/useIncidentDetail.ts)**: Hook for managing incident detail view state.
- **[client/src/hooks/useIncidentExport.ts](client/src/hooks/useIncidentExport.ts)**: Hook for handling incident data export.
- **[client/src/hooks/use-media-query.ts](client/src/hooks/use-media-query.ts)**: Hook for responsive design media queries.
- **[client/src/hooks/useReverseGeocode.ts](client/src/hooks/useReverseGeocode.ts)**: Hook to convert coordinates to address.
- **[client/src/hooks/useDebounce.ts](client/src/hooks/useDebounce.ts)**: Hook for debouncing values.

### Utilities

- **[client/src/utils/incident-mapper.ts](client/src/utils/incident-mapper.ts)**: Transformation logic to map raw API incident responses to UI-friendly types (LiteIncident, IncidentDetail).
- **[client/src/utils/platform.ts](client/src/utils/platform.ts)**: Platform detection utilities.

### Libraries & Config

- **[client/src/lib/http.ts](client/src/lib/http.ts)**: HTTP client configuration (Axios/Fetch).
- **[client/src/lib/query-client.ts](client/src/lib/query-client.ts)**: React Query client instance configuration.
- **[client/src/lib/leaflet.ts](client/src/lib/leaflet.ts)**: Leaflet map configuration.
- **[client/src/setupTests.ts](client/src/setupTests.ts)**: Test environment setup and configuration.
- **[client/src/env.d.ts](client/src/env.d.ts)**: TypeScript environment definitions.

### Types

- **[client/src/types/index.ts](client/src/types/index.ts)**: General type definitions.
- **[client/src/types/api/incidents.ts](client/src/types/api/incidents.ts)**: API response types for incidents.
- **[client/src/types/api/stations.ts](client/src/types/api/stations.ts)**: API response types for stations.
- **[client/src/types/api/dashboard.ts](client/src/types/api/dashboard.ts)**: API response types for dashboard.
- **[client/src/types/api/strategic.ts](client/src/types/api/strategic.ts)**: API response types for strategic analysis.
- **[client/src/types/api/infrastructure.ts](client/src/types/api/infrastructure.ts)**: API response types for infrastructure.
