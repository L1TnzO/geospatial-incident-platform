import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { LoginScreen } from './components/LoginScreen';
import { MainNavigation } from './components/MainNavigation';
import { FiltersPanel } from './components/FiltersPanel';
import { MapView } from './components/MapView';
import { TableView } from './components/TableView';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { IncidentForm } from './components/IncidentForm';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { User, Filters, Incident } from './types';
import { mockIncidents, fireStations } from './data/mockData';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<Filters>({
    idSearch: '',
    dateRange: { start: '', end: '' },
    types: [],
    severity: '',
  });
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidents] = useState<Incident[]>(mockIncidents);

  const handleLogin = (username: string, password: string) => {
    // Simple demo authentication
    if (username === 'admin' && password === 'admin') {
      setUser({ username: 'admin', role: 'admin' });
    } else if (username === 'viewer' && password === 'viewer') {
      setUser({ username: 'viewer', role: 'viewer' });
    } else {
      alert('Invalid credentials. Use admin/admin or viewer/viewer');
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  // Filter incidents based on current filters
  const filteredIncidents = incidents.filter((incident) => {
    // ID Search
    if (filters.idSearch && !incident.id.toLowerCase().includes(filters.idSearch.toLowerCase())) {
      return false;
    }

    // Date Range
    if (filters.dateRange.start && incident.date < filters.dateRange.start) {
      return false;
    }
    if (filters.dateRange.end && incident.date > filters.dateRange.end) {
      return false;
    }

    // Types
    if (filters.types.length > 0 && !filters.types.includes(incident.type)) {
      return false;
    }

    // Severity
    if (filters.severity && filters.severity !== 'all' && incident.severity !== filters.severity) {
      return false;
    }

    return true;
  });

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="h-screen flex flex-col">
        <MainNavigation user={user} onLogout={handleLogout} />

        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />

          <Route
            path="/map"
            element={
              <div className="flex-1 flex overflow-hidden">
                <div className="w-80 border-r overflow-y-auto p-4">
                  <FiltersPanel filters={filters} onFiltersChange={handleFiltersChange} />
                </div>
                <div className="flex-1">
                  <MapView
                    incidents={filteredIncidents}
                    fireStations={fireStations}
                    onIncidentClick={setSelectedIncident}
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
                  <FiltersPanel filters={filters} onFiltersChange={handleFiltersChange} />
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <TableView incidents={filteredIncidents} onIncidentClick={setSelectedIncident} />
                </div>
              </div>
            }
          />

          <Route
            path="/analytics"
            element={
              <div className="flex-1 overflow-y-auto">
                <AnalyticsDashboard incidents={incidents} fireStations={fireStations} />
              </div>
            }
          />

          {user.role === 'admin' && (
            <Route
              path="/create"
              element={
                <div className="flex-1 overflow-y-auto">
                  <IncidentForm />
                </div>
              }
            />
          )}

          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>

        <IncidentDetailModal
          incident={selectedIncident}
          open={!!selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />

        <Toaster />
      </div>
    </BrowserRouter>
  );
}
