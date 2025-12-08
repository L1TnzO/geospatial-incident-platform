import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// import { subYears, startOfDay, endOfDay } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useMapPreferencesStore } from '../../store/map-preferences-store';
import { useMapStore } from '../../store/map-store';
import { useStrategicHotspots } from '../../hooks/useStrategicHotspots';
import { useStrategicCoverage } from '../../hooks/useStrategicCoverage';
import { useStrategicResponseTimes } from '../../hooks/useStrategicResponseTimes';
import { useStrategicPriorityZones } from '../../hooks/useStrategicPriorityZones';
import { useLocalWorker } from '../../hooks/useLocalWorker'; // Import new hook

import { useStrategicTimeOfDay } from '../../hooks/useStrategicTimeOfDay';
import { useStrategicZoneFrequency } from '../../hooks/useStrategicZoneFrequency';
import { useStrategicStationVolume } from '../../hooks/useStrategicStationVolume';
import { useStrategicProjections } from '../../hooks/useStrategicProjections';
import { useIncidentsData } from '../../hooks/useIncidentsData';

import { useStationsData } from '../../hooks/useStationsData';
import { useInfrastructureData } from '../../hooks/useInfrastructureData';

import { ResponseTimeChart } from './ResponseTimeChart';
import { PriorityZonesPanel } from './PriorityZonesPanel';
import { StrategicTimeOfDayChart } from './StrategicTimeOfDayChart';
import { ZoneFrequencyTable } from './ZoneFrequencyTable';
import { StationVolumeChart } from './StationVolumeChart';
import { HighResponseTimeZones } from './HighResponseTimeZones';
import { IncidentProjectionTable } from './IncidentProjectionTable';
import { DistrictFrequentIncidentsTable } from './DistrictFrequentIncidentsTable';
import { useStrategicDistrictFrequentIncidents } from '../../hooks/useStrategicDistrictFrequentIncidents';
import { MapView } from '../MapView';
import { Button } from '../ui/button';

import type { Incident } from '../../types';
import type { PriorityScoreGroup } from '../../types/api/strategic';
import { useDashboard } from '../../providers/dashboard-provider';



interface StrategicLayoutProps {
  hideMap?: boolean;
  className?: string;
}

export function StrategicLayout({ hideMap = false, className }: StrategicLayoutProps) {
  const { timeRange, setTimeRange, filters, isYoY } = useDashboard();

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
  // Use daily trend for all dashboard time ranges (24h, 7d, 30d)
  const trendFilters = useMemo(() => ({
    ...filters,
    compare: (isYoY ? 'year' : 'previous') as 'year' | 'previous',
  }), [filters, isYoY]);

  const timeOfDayQuery = useStrategicTimeOfDay(trendFilters);
  const zoneFrequencyQuery = useStrategicZoneFrequency(trendFilters);
  const stationVolumeQuery = useStrategicStationVolume(trendFilters);
  const projectionsQuery = useStrategicProjections(trendFilters);
  const districtFrequentIncidentsQuery = useStrategicDistrictFrequentIncidents(trendFilters);

  const hotspotsQuery = useStrategicHotspots({ resolution: 4, ...filters });
  const coverageQuery = useStrategicCoverage(filters);
  const responseTimesQuery = useStrategicResponseTimes({ groupBy: 'station', ...filters });
  const zoneResponseTimesQuery = useStrategicResponseTimes({ groupBy: 'zone', ...filters });
  const priorityZonesQuery = useStrategicPriorityZones({
    groupBy: 'grid',
    decayHalfLifeDays: 45,
    ...filters,
  });


  const mapFilters = useMemo(() => {
    // Explicitly destructure to remove isActive property so it doesn't leak into the spread
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { isActive: _ignore, ...cleanFilters } = filters;

    return {
      ...cleanFilters,
      isActive: undefined, // Force ALL incidents (active + inactive) based on repository definition
    };
  }, [filters]); // Re-fetch only if filters object changes


  const incidentsData = useIncidentsData(mapFilters);
  const stationsQuery = useStationsData({ isActive: true });
  const infrastructureQuery = useInfrastructureData();

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



  // Local worker for strategic map clustering
  const [worker, setWorker] = useState<Worker | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../../workers/incident-worker.ts', import.meta.url), {
      type: 'module',
    });
    setWorker(workerRef.current);

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Feed data to worker
  useEffect(() => {
    if (!worker) return;

    worker.postMessage({
      type: 'SET_DATA',
      payload: {
        incidents,
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      },
    });
  }, [incidents, worker, filters.startDate, filters.endDate]);
  // Independent worker for strategic map to prevent global filter leakage
  const localWorker = useLocalWorker(incidents);

  return (
    <div className={`p-6 ${className || ''}`}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header with refresh */}
        {/* Sticky Controls Layer */}
        <div className="sticky top-0 z-[60] flex justify-end -mt-6 pt-6 pb-2">
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-xl border shadow-sm">
            <div className="flex items-center gap-4">
              <Select value={timeRange.startsWith('custom') ? 'custom' : timeRange} onValueChange={(val: string) => setTimeRange(val as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="3m">Last 3 Months</SelectItem>
                  <SelectItem value="1y">Last 12 Months</SelectItem>
                  <SelectItem value="custom" disabled>Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Title Layer (Underneath/Scrolling) */}
        <div className="flex items-center justify-between -mt-16 mb-6">
          <div className="relative z-0">
            <h1 className="text-3xl font-bold">Strategic Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Long-range planning insights and geographic analysis
            </p>
          </div>
          {/* Spacer to prevent overlap if screen is small */}
          <div className="w-[200px] h-10 invisible"></div>
        </div>

        {/* Trend Analysis - Full Width */}


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
          <StationVolumeChart
            data={stationVolumeQuery.data || null}
            isLoading={stationVolumeQuery.isLoading}
            isError={stationVolumeQuery.isError}
            error={stationVolumeQuery.error}
            onRefresh={() => stationVolumeQuery.refetch()}
          />
          <HighResponseTimeZones query={zoneResponseTimesQuery} />
          <IncidentProjectionTable query={projectionsQuery} />
          <DistrictFrequentIncidentsTable query={districtFrequentIncidentsQuery} />
        </div>

        {/* Map with Overlays - Full Width */}
        {!hideMap && (
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
              infrastructure={infrastructureQuery.infrastructure}
              infrastructureLoading={infrastructureQuery.isLoading}
              infrastructureError={infrastructureQuery.error}
              useStrategicPreferences={true}
              strategicOverlays={{
                hotspots: showHotspots ? hotspotsQuery.data?.cells || [] : [],
                coverage: showCoverage ? coverageQuery.data?.features || [] : [],
                priorityZones: showPriorityZones ? priorityZonesQuery.data?.groups || [] : [],
                highlightedZone,
              }}
              worker={localWorker} // Pass injected worker
            />
          </div>
        )}

        {/* Overlay controls */}
        {!hideMap && (
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
        )}
      </div>
    </div>
  );
}
