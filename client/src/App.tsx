import { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { LoginScreen } from './components/LoginScreen';
import { MainNavigation } from './components/MainNavigation';
import { FiltersPanel } from './components/FiltersPanel';
import { MapView } from './components/MapView';
import { TableView } from './components/TableView';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { AuthProvider } from './providers/auth-provider';
import { QueryProvider } from './providers/query-client-provider';
import { useIncidentFiltersStore } from './store/incident-filters-store';
import { useIncidentsData } from './hooks/useIncidentsData';
import { useStationsData } from './hooks/useStationsData';
import { useIncidentDetailStore } from './store/incident-detail-store';
import { useAuth } from './hooks/useAuth';
import { DashboardPage } from './pages/DashboardPage';
import { StrategicPage } from './pages/StrategicPage';
import { useShallow } from 'zustand/react/shallow';

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
}

function AppContent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const filters = useIncidentFiltersStore(
    useShallow((state) => ({
      typeCodes: state.typeCodes,
      severityCodes: state.severityCodes,
      statusCodes: state.statusCodes,
      startDate: state.startDate,
      endDate: state.endDate,
      incidentNumber: state.incidentNumber,
      isActive: state.isActive,
    })),
  );
  const openIncident = useIncidentDetailStore((state) => state.openIncident);

  const incidentQueryParams = useMemo(
    () => ({
      typeCodes: filters.typeCodes,
      severityCodes: filters.severityCodes,
      statusCodes: filters.statusCodes,
      startDate: filters.startDate,
      endDate: filters.endDate,
      incidentNumber: filters.incidentNumber,
      isActive: filters.isActive,
    }),
    [filters],
  );

  const incidentsData = useIncidentsData(incidentQueryParams);

  const stationsData = useStationsData({ isActive: true });

  const handleLogin = (username: string, password: string) => {
    login(username, password).catch((error) => {
      alert(
        error instanceof Error
          ? error.message
          : 'Invalid credentials. Use admin/admin or viewer/viewer',
      );
    });
  };

  const incidents = incidentsData.incidents;

  if (!isAuthenticated || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col">
        <MainNavigation user={user} onLogout={logout} />

        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/overview" element={<Navigate to="/map" replace />} />

          <Route
            path="/map"
            element={
              <div className="flex-1 flex overflow-hidden">
                <div className="w-80 border-r overflow-y-auto p-4">
                  <FiltersPanel />
                </div>
                <div className="flex-1">
                  <MapView
                    incidents={incidents}
                    fireStations={stationsData.stations}
                    onIncidentClick={openIncident}
                    isLoading={incidentsData.isLoading}
                    isError={incidentsData.isError}
                    error={incidentsData.error}
                    onRetry={incidentsData.refresh}
                    counts={{
                      rendered: incidentsData.renderedCount,
                      total: incidentsData.totalCount,
                      remainder: incidentsData.remainder,
                    }}
                    stationsLoading={stationsData.isLoading}
                    stationsError={stationsData.isError ? stationsData.error : undefined}
                  />
                </div>
              </div>
            }
          />

          <Route
            path="/table"
            element={
              <div className="flex-1 flex overflow-hidden">
                <div className="w-80 border-r overflow-y-auto p-4">
                  <FiltersPanel />
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <TableView
                    incidents={incidents}
                    totalCount={incidentsData.totalCount}
                    onIncidentClick={openIncident}
                    isLoading={incidentsData.isLoading}
                    isError={incidentsData.isError}
                    error={incidentsData.error}
                    onRetry={incidentsData.refresh}
                  />
                </div>
              </div>
            }
          />

          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/strategic" element={<StrategicPage />} />

          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>

        <IncidentDetailModal />

        <Toaster />
      </div>
    </BrowserRouter>
  );
}
