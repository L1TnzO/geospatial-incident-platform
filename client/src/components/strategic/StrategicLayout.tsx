import { useState, useCallback, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useMapPreferencesStore } from '../../store/map-preferences-store';
import { useMapStore } from '../../store/map-store';
import { useStrategicHotspots } from '../../hooks/useStrategicHotspots';
import { useStrategicCoverage } from '../../hooks/useStrategicCoverage';
import { useStrategicResponseTimes } from '../../hooks/useStrategicResponseTimes';
import { useStrategicPriorityZones } from '../../hooks/useStrategicPriorityZones';
import { useStrategicDailyTrend } from '../../hooks/useStrategicDailyTrend';
import { useStrategicTimeOfDay } from '../../hooks/useStrategicTimeOfDay';
import { useStrategicZoneFrequency } from '../../hooks/useStrategicZoneFrequency';
import { useIncidentsContext } from '../../providers/incidents-provider';
import { useStationsData } from '../../hooks/useStationsData';
import { StrategicTrendsChart } from './StrategicTrendsChart';
import { ResponseTimeChart } from './ResponseTimeChart';
import { PriorityZonesPanel } from './PriorityZonesPanel';
import { StrategicTimeOfDayChart } from './StrategicTimeOfDayChart';
import { ZoneFrequencyTable } from './ZoneFrequencyTable';
import { MapView } from '../MapView';
import { Button } from '../ui/button';

import type { Incident } from '../../types';
import type { PriorityScoreGroup } from '../../types/api/strategic';
import { useDashboard } from '../../providers/dashboard-provider';

import { useIncidentMetadataQuery } from '../../hooks/useIncidentMetadataQuery';

export function StrategicLayout() {
  const { timeRange, setTimeRange, filters, comparisonLabel } = useDashboard();

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
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const metadataQuery = useIncidentMetadataQuery();

  // Strategic data hooks
  // Use daily trend for all dashboard time ranges (24h, 7d, 30d)
  const trendFilters = useMemo(() => ({
    ...filters,
    typeCodes: selectedType ? [selectedType] : undefined,
  }), [filters, selectedType]);

  const dailyTrendQuery = useStrategicDailyTrend(trendFilters);
  const timeOfDayQuery = useStrategicTimeOfDay(trendFilters);
  const zoneFrequencyQuery = useStrategicZoneFrequency(trendFilters);

  const hotspotsQuery = useStrategicHotspots({ resolution: 4, ...filters });
  const coverageQuery = useStrategicCoverage(filters);
  const responseTimesQuery = useStrategicResponseTimes({ groupBy: 'station', ...filters });
  const priorityZonesQuery = useStrategicPriorityZones({
    groupBy: 'grid',
    decayHalfLifeDays: 45,
    ...filters,
  });

  // Map data
  // Use global filters for the map to show "truth" (same as main map)
  const incidentsData = useIncidentsContext();
  const stationsQuery = useStationsData({ isActive: true });

  const incidents = incidentsData.incidents;
  const fireStations = stationsQuery.stations || [];

  const mapCounts = useMemo(
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

  // Handle trend period click - update date filters
  // Note: DashboardProvider currently controls date ranges based on timeRange.
  // Manual date selection would require extending DashboardProvider to support 'custom' range.
  const handlePeriodClick = useCallback(
    (_period: string, _startDate: string, _endDate: string) => {
      console.log('Period clicked:', _period);
      // setFilters({ startDate, endDate }); // Not supported by DashboardProvider yet
    },
    [],
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

            <Select value={timeRange} onValueChange={(val: string) => setTimeRange(val as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="3m">Last 3 Months</SelectItem>
                <SelectItem value="1y">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>

          </div>
        </div>

        {/* Trend Analysis - Full Width */}
        <div>
          <StrategicTrendsChart
            data={dailyTrendQuery.data || null}
            trendType="daily"
            isLoading={dailyTrendQuery.isLoading}
            isError={dailyTrendQuery.isError}
            error={dailyTrendQuery.error}
            onRefresh={() => dailyTrendQuery.refresh(true)}

            onPeriodClick={handlePeriodClick}
            comparisonLabel={comparisonLabel}
            timeRange={timeRange}
            selectedType={selectedType}
            onTypeChange={setSelectedType}
            incidentTypes={metadataQuery.data?.types || []}
          />
        </div>

        {/* Response Times, Priority Zones & Time of Day */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
          <StrategicTimeOfDayChart query={timeOfDayQuery} />
          <ZoneFrequencyTable query={zoneFrequencyQuery} />
        </div>

        {/* Map with Overlays - Full Width */}
        <div className="rounded-lg overflow-hidden border" style={{ height: '600px' }}>
          <MapView
            incidents={incidents}
            fireStations={fireStations}
            onIncidentClick={handleIncidentClick}
            isLoading={incidentsData.isLoading}
            isFetching={incidentsData.isFetching}
            isError={incidentsData.isError}
            error={incidentsData.error}
            onRetry={incidentsData.refresh}
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
