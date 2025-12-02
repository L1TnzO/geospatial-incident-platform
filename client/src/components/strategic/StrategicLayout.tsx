import { useState, useCallback, useMemo, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useIncidentFiltersStore } from '../../store/incident-filters-store';
import { useMapPreferencesStore } from '../../store/map-preferences-store';
import { useMapStore } from '../../store/map-store';
import { useStrategicTrends } from '../../hooks/useStrategicTrends';
import { useStrategicHotspots } from '../../hooks/useStrategicHotspots';
import { useStrategicCoverage } from '../../hooks/useStrategicCoverage';
import { useStrategicResponseTimes } from '../../hooks/useStrategicResponseTimes';
import { useStrategicPriorityZones } from '../../hooks/useStrategicPriorityZones';
import { useIncidentsQuery } from '../../hooks/useIncidentsQuery';
import { useStationsData } from '../../hooks/useStationsData';
import { mapIncidentToUi } from '../../services/incidents';
import { StrategicTrendsChart } from './StrategicTrendsChart';
import { ResponseTimeChart } from './ResponseTimeChart';
import { PriorityZonesPanel } from './PriorityZonesPanel';
import { MapView } from '../MapView';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import type { Incident } from '../../types';
import type { PriorityScoreGroup } from '../../types/api/strategic';

export function StrategicLayout() {
  const filterState = useIncidentFiltersStore();

  // Normalize dates to YYYY-MM-DD format (strip time if present)
  const normalizeDate = (date: string | undefined): string | undefined => {
    if (!date) return undefined;
    // If the date contains 'T', split it and take only the date part
    return date.includes('T') ? date.split('T')[0] : date;
  };

  // Only include isActive if it's explicitly true (backend might not support false)
  const [timeRange, setTimeRange] = useState('30d');
  const [localDateRange, setLocalDateRange] = useState<{ start?: string; end?: string }>({});

  // Calculate dates based on time range
  useEffect(() => {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    setLocalDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  }, [timeRange]);

  // Only include isActive if it's explicitly true (backend might not support false)
  const filters = {
    typeCodes: filterState.typeCodes,
    severityCodes: filterState.severityCodes,
    statusCodes: filterState.statusCodes,
    startDate: localDateRange.start,
    endDate: localDateRange.end,
    ...(filterState.isActive === true && { isActive: true }),
    incidentNumber: filterState.incidentNumber,
  };
  const setFilters = filterState.setFilters;
  const {
    showIncidentsStrategic: showIncidents,
    showHotspotsStrategic: showHotspots,
    showCoverageStrategic: showCoverage,
    showPriorityZonesStrategic: showPriorityZones,
    toggleIncidentsStrategic: toggleIncidents,
    toggleHotspotsStrategic: toggleHotspots,
    toggleCoverageStrategic: toggleCoverage,
    togglePriorityZonesStrategic: togglePriorityZones,
  } = useMapPreferencesStore();
  const { setView } = useMapStore();
  const [highlightedZone, setHighlightedZone] = useState<PriorityScoreGroup | null>(null);

  // Strategic data hooks
  const trendsQuery = useStrategicTrends({ months: 12, ...filters });
  const hotspotsQuery = useStrategicHotspots({ resolution: 4, ...filters });
  const coverageQuery = useStrategicCoverage(filters);
  const responseTimesQuery = useStrategicResponseTimes({ groupBy: 'station', ...filters });
  const priorityZonesQuery = useStrategicPriorityZones({
    groupBy: 'grid',
    decayHalfLifeDays: 45,
    ...filters,
  });

  // Map data
  const incidentsQuery = useIncidentsQuery({
    page: 1,
    pageSize: 100, // Backend max is 100
    ...filters,
  });
  const stationsQuery = useStationsData({ isActive: true });

  const incidents: Incident[] = useMemo(() => {
    if (!incidentsQuery.data?.data) return [];
    return incidentsQuery.data.data
      .map(mapIncidentToUi)
      .filter((incident): incident is Incident => incident !== null);
  }, [incidentsQuery.data]);

  const fireStations = stationsQuery.stations || [];

  const mapCounts = useMemo(
    () => ({
      rendered: incidents.length,
      total: incidentsQuery.data?.pagination.total || 0,
      remainder: Math.max(0, (incidentsQuery.data?.pagination.total || 0) - incidents.length),
      limit: incidents.length,
    }),
    [incidents.length, incidentsQuery.data?.pagination.total],
  );

  // Handle trend period click - update date filters
  const handlePeriodClick = useCallback(
    (_month: string, startDate: string, endDate: string) => {
      setFilters({
        startDate: startDate.split('T')[0],
        endDate: endDate.split('T')[0],
      });
    },
    [setFilters],
  );

  // Handle "View on Map" from priority zones
  const handleViewOnMap = useCallback(
    (zone: PriorityScoreGroup) => {
      setHighlightedZone(zone);

      // Enable priority zones overlay if not already visible
      if (!showPriorityZones) {
        togglePriorityZones();
      }

      // Center map on zone
      if (zone.cell?.centroid) {
        setView([zone.cell.centroid.latitude, zone.cell.centroid.longitude], 15);
      }

      // Scroll to map after a short delay to allow overlay to render
      setTimeout(() => {
        const mapElement = document.querySelector('.rounded-lg.overflow-hidden.border');
        if (mapElement) {
          mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Auto-clear highlight after 8 seconds
      setTimeout(() => {
        setHighlightedZone(null);
      }, 8000);
    },
    [showPriorityZones, togglePriorityZones, setView],
  );

  // Handle incident click (from map)
  const handleIncidentClick = useCallback((incident: Incident) => {
    // Could navigate to incident detail or open modal
    console.log('Incident clicked:', incident);
  }, []);

  // Refresh all strategic data
  const handleRefreshAll = useCallback(() => {
    trendsQuery.refresh(true);
    hotspotsQuery.refresh(true);
    coverageQuery.refresh(true);
    responseTimesQuery.refresh(true);
    priorityZonesQuery.refresh(true);
  }, [trendsQuery, hotspotsQuery, coverageQuery, responseTimesQuery, priorityZonesQuery]);

  return (
    <div className="p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header with refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Strategic Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Long-range planning insights and geographic analysis
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefreshAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </div>

        {/* Trend Analysis - Full Width */}
        <div>
          <StrategicTrendsChart
            data={trendsQuery.data || null}
            isLoading={trendsQuery.isLoading}
            isError={trendsQuery.isError}
            error={trendsQuery.error}
            onRefresh={() => trendsQuery.refresh(true)}
            onPeriodClick={handlePeriodClick}
          />
        </div>

        {/* Response Times & Priority Zones - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponseTimeChart
            data={responseTimesQuery.data || null}
            isLoading={responseTimesQuery.isLoading}
            isError={responseTimesQuery.isError}
            error={responseTimesQuery.error}
            onRefresh={() => responseTimesQuery.refresh(true)}
          />
          <PriorityZonesPanel
            data={priorityZonesQuery.data || null}
            isLoading={priorityZonesQuery.isLoading}
            isError={priorityZonesQuery.isError}
            error={priorityZonesQuery.error}
            onRefresh={() => priorityZonesQuery.refresh(true)}
            onViewOnMap={handleViewOnMap}
          />
        </div>

        {/* Map with Overlays - Full Width */}
        <div className="rounded-lg overflow-hidden border" style={{ height: '600px' }}>
          <MapView
            incidents={incidents}
            fireStations={fireStations}
            onIncidentClick={handleIncidentClick}
            isLoading={incidentsQuery.isLoading}
            isFetching={incidentsQuery.isFetching}
            isError={incidentsQuery.isError}
            error={incidentsQuery.error?.message}
            onRetry={incidentsQuery.refetch}
            counts={mapCounts}
            stationsLoading={stationsQuery.isLoading}
            stationsError={stationsQuery.error}
            useStrategicPreferences={true}
            strategicOverlays={{
              hotspots: showHotspots ? hotspotsQuery.data?.cells || [] : [],
              coverage: showCoverage ? coverageQuery.data?.features || [] : [],
              priorityZones: showPriorityZones ? priorityZonesQuery.data?.groups || [] : [],
              highlightedZone,
            }}
          />
        </div>

        {/* Overlay controls */}
        <div className="flex items-center gap-4 justify-center">
          <Button
            variant={showIncidents ? 'default' : 'outline'}
            size="sm"
            onClick={toggleIncidents}
          >
            {showIncidents ? 'Hide' : 'Show'} Incidents
          </Button>
          <Button variant={showHotspots ? 'default' : 'outline'} size="sm" onClick={toggleHotspots}>
            {showHotspots ? 'Hide' : 'Show'} Hotspots
          </Button>
          <Button variant={showCoverage ? 'default' : 'outline'} size="sm" onClick={toggleCoverage}>
            {showCoverage ? 'Hide' : 'Show'} Coverage
          </Button>
          <Button
            variant={showPriorityZones ? 'default' : 'outline'}
            size="sm"
            onClick={togglePriorityZones}
          >
            {showPriorityZones ? 'Hide' : 'Show'} Priority Zones
          </Button>
        </div>
      </div>
    </div>
  );
}
