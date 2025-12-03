import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
// import { toast } from 'sonner';
// import { LoginScreen } from './components/LoginScreen';
import { MainNavigation } from './components/MainNavigation';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';
import { MapView } from './components/MapView';
import { TableView } from './components/TableView';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { IncidentForm } from './components/IncidentForm';
import { IncidentCreateDrawer } from './components/IncidentCreateDrawer';
import { DashboardPage } from './pages/DashboardPage';
import { StrategicPage } from './pages/StrategicPage';
import { Toaster } from './components/ui/sonner';
import { QueryProvider } from './providers/query-client-provider';
import { AuthProvider } from './providers/auth-provider';
// import { useAuth } from './hooks/useAuth';
import { useIncidentFiltersStore } from './store/incident-filters-store';
// import { useMapStore } from './store/map-store';
import { useIncidentsData, useIncidentsTableData } from './hooks/useIncidentsData';
import { useIncidentDetailStore } from './store/incident-detail-store';
import { useStationsData } from './hooks/useStationsData';
import type { Incident } from './types';
import type { IncidentSortField } from './types/api/incidents';
import { isMobile } from './utils/platform';

function AppRoutes() {
  // TEMPORARILY BYPASS LOGIN FOR DEBUGGING
  const user = { username: 'admin', role: 'admin' as const };
  const logout = () => { };

  const mobile = isMobile();

  // const { user, isAuthenticated, login, logout } = useAuth();
  const openIncident = useIncidentDetailStore((state) => state.openIncident);
  const selectedIncident = useIncidentDetailStore((state) => state.selectedIncident);

  const filters = useIncidentFiltersStore(
    useShallow((state) => ({
      page: state.page,
      pageSize: state.pageSize,
      sortBy: state.sortBy,
      sortDirection: state.sortDirection,
      typeCodes: state.typeCodes,
      severityCodes: state.severityCodes,
      statusCodes: state.statusCodes,
      startDate: state.startDate,
      endDate: state.endDate,
      incidentNumber: state.incidentNumber,
      isActive: state.isActive,
      renderLimit: state.renderLimit,
    })),
  );
  const setIncidentFilters = useIncidentFiltersStore((state) => state.setFilters);

  const fetchParams = {
    page: filters.page,
    pageSize: filters.pageSize,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    typeCodes: filters.typeCodes,
    severityCodes: filters.severityCodes,
    statusCodes: filters.statusCodes,
    startDate: filters.startDate,
    endDate: filters.endDate,
    incidentNumber: filters.incidentNumber,
    isActive: filters.isActive ?? true,
    renderLimit: filters.renderLimit,
  };

  // const viewportCenter = useMapStore((state) => state.center);

  const incidentsData = useIncidentsData({
    ...fetchParams,
    // priorityCenter: viewportCenter, // Disabled to prevent points from disappearing on move
  });
  const incidentsTableData = useIncidentsTableData(fetchParams);

  const stationsData = useStationsData({ isActive: filters.isActive ?? true });

  const counts = useMemo(
    () => ({
      rendered: incidentsData.renderedCount,
      total: incidentsData.totalCount,
      remainder: incidentsData.remainder,
      limit: incidentsData.targetLimit,
    }),
    [
      incidentsData.renderedCount,
      incidentsData.totalCount,
      incidentsData.remainder,
      incidentsData.targetLimit,
    ],
  );

  const handleTablePageChange = (page: number) => {
    setIncidentFilters({ page });
  };

  const handleTableSortChange = (sortBy: IncidentSortField, sortDirection: 'asc' | 'desc') => {
    setIncidentFilters({ sortBy, sortDirection, page: 1 });
  };

  /* LOGIN TEMPORARILY DISABLED FOR DEBUGGING
  if (!isAuthenticated || !user) {
    const handleLogin = (username: string, password: string) => {
      login(username, password).catch((error) => {
        toast.error(error?.message ?? 'Invalid credentials. Use admin/admin or viewer/viewer.');
      });
    };

    return (
      <>
        <LoginScreen onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }
  */

  const activeIncidentId =
    selectedIncident?.id ??
    // fallback for legacy incident shape
    (selectedIncident && 'incidentNumber' in selectedIncident
      ? ((selectedIncident as unknown as { incidentNumber?: string }).incidentNumber ?? null)
      : null);

  const handleIncidentClick = (incident: Incident) => {
    openIncident(incident);
  };

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col">
        <MainNavigation user={user} onLogout={logout} />

        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />

          <Route
            path="/map"
            element={
              <div className="flex-1 flex overflow-hidden relative">
                <CollapsibleSidebar />
                <main className="flex-1 relative z-0">
                  <MapView
                    incidents={incidentsData.incidents}
                    fireStations={stationsData.stations}
                    onIncidentClick={handleIncidentClick}
                    isLoading={incidentsData.isLoading}
                    isFetching={incidentsData.isFetching}
                    isError={incidentsData.isError}
                    error={incidentsData.error}
                    onRetry={incidentsData.refresh}
                    counts={counts}
                    stationsLoading={stationsData.isLoading}
                    stationsError={stationsData.error}
                  />
                </main>
              </div>
            }
          />

          <Route
            path="/table"
            element={
              !mobile ? (
                <div className="flex-1 flex overflow-hidden relative">
                  <CollapsibleSidebar />
                  <main className="flex-1 overflow-y-auto p-6 relative z-0">
                    <TableView
                      incidents={incidentsTableData.incidents}
                      pagination={incidentsTableData.pagination}
                      totalCount={incidentsTableData.totalCount}
                      remainder={incidentsTableData.remainder}
                      page={incidentsTableData.page}
                      pageSize={incidentsTableData.pageSize}
                      sortBy={filters.sortBy}
                      sortDirection={filters.sortDirection}
                      hasNext={incidentsTableData.hasNext}
                      hasPrevious={incidentsTableData.hasPrevious}
                      onSortChange={handleTableSortChange}
                      onPageChange={handleTablePageChange}
                      onIncidentClick={handleIncidentClick}
                      isLoading={incidentsTableData.isLoading}
                      isFetching={incidentsTableData.isFetching}
                      isError={incidentsTableData.isError}
                      error={incidentsTableData.error}
                      onRetry={incidentsTableData.refresh}
                      activeIncidentId={activeIncidentId ?? undefined}
                    />
                  </main>
                </div>
              ) : (
                <Navigate to="/map" replace />
              )
            }
          />

          <Route
            path="/dashboard"
            element={
              !mobile ? (
                <div className="flex-1 flex overflow-hidden relative">
                  <CollapsibleSidebar />
                  <main className="flex-1 flex flex-col relative z-0 overflow-hidden">
                    <DashboardPage />
                  </main>
                </div>
              ) : (
                <Navigate to="/map" replace />
              )
            }
          />
          <Route
            path="/strategic"
            element={
              !mobile ? (
                <div className="flex-1 flex overflow-hidden relative">
                  <CollapsibleSidebar />
                  <main className="flex-1 overflow-y-auto relative z-0">
                    <StrategicPage />
                  </main>
                </div>
              ) : (
                <Navigate to="/map" replace />
              )
            }
          />

          <Route
            path="/create"
            element={
              user.role === 'admin' && !mobile ? (
                <div className="flex-1 overflow-y-auto">
                  <IncidentForm />
                </div>
              ) : (
                <Navigate to="/map" replace />
              )
            }
          />

          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>

        <IncidentDetailModal />
        <IncidentCreateDrawer />
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryProvider>
  );
}
