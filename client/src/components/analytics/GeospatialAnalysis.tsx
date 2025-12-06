import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Incident, FireStation } from '../../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Flame } from 'lucide-react';

interface GeospatialAnalysisProps {
  incidents: Incident[];
  fireStations: FireStation[];
}

interface Zone {
  id: string;
  name: string;
  center: [number, number];
  incidents: number;
  highSeverity: number;
  avgResponseTime: number;
}

export function GeospatialAnalysis({ incidents, fireStations }: GeospatialAnalysisProps) {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [heatmapPeriod, setHeatmapPeriod] = useState('all');
  const [showHotspots, setShowHotspots] = useState(false);
  const [showStationCoverage, setShowStationCoverage] = useState(false);
  const [showHighResponseZones, setShowHighResponseZones] = useState(false);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });

  // Filter incidents based on heatmap period
  const getFilteredIncidents = () => {
    if (heatmapPeriod === 'all') return incidents;

    const now = new Date();
    const daysMap: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    const days = daysMap[heatmapPeriod] || 0;
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return incidents.filter((inc) => new Date(inc.timestamp) >= cutoffDate);
  };

  const filteredIncidents = getFilteredIncidents();

  // Identify hotspots (locations with 2+ incidents)
  const locationCounts = filteredIncidents.reduce(
    (acc, inc) => {
      const key = `${inc.location.lat.toFixed(3)},${inc.location.lng.toFixed(3)}`;
      if (!acc[key]) {
        acc[key] = { lat: inc.location.lat, lng: inc.location.lng, count: 0, incidents: [] };
      }
      acc[key].count++;
      acc[key].incidents.push(inc);
      return acc;
    },
    {} as Record<string, { lat: number; lng: number; count: number; incidents: Incident[] }>
  );

  const hotspots = Object.values(locationCounts).filter((loc) => loc.count >= 2);

  // Zone data
  const zones: Zone[] = [
    {
      id: 'Zone-A',
      name: 'Downtown District',
      center: [40.7128, -74.006],
      incidents: incidents.filter((inc) => inc.zoneId === 'Zone-A').length,
      highSeverity: incidents.filter(
        (inc) => inc.zoneId === 'Zone-A' && (inc.severity === 'High' || inc.severity === 'Critical')
      ).length,
      avgResponseTime: 5.2,
    },
    {
      id: 'Zone-B',
      name: 'Midtown Area',
      center: [40.7589, -73.9851],
      incidents: incidents.filter((inc) => inc.zoneId === 'Zone-B').length,
      highSeverity: incidents.filter(
        (inc) => inc.zoneId === 'Zone-B' && (inc.severity === 'High' || inc.severity === 'Critical')
      ).length,
      avgResponseTime: 4.8,
    },
    {
      id: 'Zone-C',
      name: 'Commercial District',
      center: [40.7489, -73.968],
      incidents: incidents.filter((inc) => inc.zoneId === 'Zone-C').length,
      highSeverity: incidents.filter(
        (inc) => inc.zoneId === 'Zone-C' && (inc.severity === 'High' || inc.severity === 'Critical')
      ).length,
      avgResponseTime: 6.1,
    },
  ];

  // Calculate zonal priority index (based on incidents, severity, response time)
  const zonesWithPriority = zones
    .map((zone) => ({
      ...zone,
      priorityIndex: Math.round(
        zone.incidents * 0.4 +
        zone.highSeverity * 2 * 0.4 +
        (zone.avgResponseTime > 5 ? zone.avgResponseTime * 0.2 : 0)
      ),
    }))
    .sort((a, b) => b.priorityIndex - a.priorityIndex);

  const handleZoneSelect = (zoneId: string) => {
    setSelectedZone(zoneId === selectedZone ? null : zoneId);
  };

  // Convert lat/lng to x/y coordinates for display
  const latLngToXY = (lat: number, lng: number) => {
    const centerLat = 40.7128;
    const centerLng = -74.006;
    const scale = 4000;

    const x = (lng - centerLng) * scale * zoom + pan.x;
    const y = -(lat - centerLat) * scale * zoom + pan.y;

    return { x, y };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return '#ef4444';
      case 'High':
        return '#f97316';
      case 'Medium':
        return '#eab308';
      case 'Low':
        return '#3b82f6';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Map Panel */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Analysis Map</CardTitle>
          </CardHeader>
          <CardContent className="h-[calc(100%-5rem)]">
            <div className="h-full rounded-lg overflow-hidden relative bg-slate-100">
              {/* Background grid */}
              <svg className="absolute inset-0 w-full h-full">
                <defs>
                  <pattern id="analysis-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="rgba(0,0,0,0.1)"
                      strokeWidth="1"
                    />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#analysis-grid)" />
              </svg>

              {/* Heatmap - incident markers */}
              {showHeatmap &&
                filteredIncidents.map((incident, idx) => {
                  const { x, y } = latLngToXY(incident.location.lat, incident.location.lng);
                  return (
                    <div
                      key={`heatmap-${idx}`}
                      className="absolute rounded-full opacity-60"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        width: '16px',
                        height: '16px',
                        backgroundColor: getSeverityColor(incident.severity),
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${incident.type} - ${incident.date}`}
                    />
                  );
                })}

              {/* Hotspots */}
              {showHotspots &&
                hotspots.map((hotspot, idx) => {
                  const { x, y } = latLngToXY(hotspot.lat, hotspot.lng);

                  // Calculate most frequent type
                  const typeCounts = hotspot.incidents.reduce((typeAcc, inc) => {
                    typeAcc[inc.type] = (typeAcc[inc.type] || 0) + 1;
                    return typeAcc;
                  }, {} as Record<string, number>);

                  const mostFrequentType = Object.entries(typeCounts).reduce((a, b) =>
                    typeCounts[a] > typeCounts[b[0]] ? a : b[0],
                    Object.keys(typeCounts)[0]
                  );

                  return (
                    <div
                      key={`hotspot-${idx}`}
                      className="absolute rounded-full border-2 border-red-600 opacity-30"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        width: '60px',
                        height: '60px',
                        backgroundColor: '#dc2626',
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`Hotspot: ${hotspot.count} incidents\nMost Frequent: ${mostFrequentType}`}
                    />
                  );
                })}

              {/* Station coverage circles */}
              {showStationCoverage &&
                fireStations.map((station) => {
                  const { x, y } = latLngToXY(station.location.lat, station.location.lng);
                  return (
                    <div
                      key={`coverage-${station.id}`}
                      className="absolute rounded-full border-2 border-purple-500 opacity-20"
                      style={{
                        left: `calc(50% + ${x}px)`,
                        top: `calc(50% + ${y}px)`,
                        width: '120px',
                        height: '120px',
                        backgroundColor: '#8b5cf6',
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${station.name} coverage`}
                    />
                  );
                })}

              {/* Fire station markers */}
              {fireStations.map((station) => {
                const { x, y } = latLngToXY(station.location.lat, station.location.lng);
                return (
                  <div
                    key={station.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                      zIndex: 10,
                    }}
                  >
                    <Flame
                      className="w-6 h-6 drop-shadow-lg"
                      fill="#8b5cf6"
                      stroke="white"
                      strokeWidth={1}
                    />
                  </div>
                );
              })}

              {/* High response time zones */}
              {showHighResponseZones &&
                zones
                  .filter((zone) => zone.avgResponseTime > 5)
                  .map((zone) => {
                    const { x, y } = latLngToXY(zone.center[0], zone.center[1]);
                    return (
                      <div
                        key={`high-response-${zone.id}`}
                        className="absolute rounded-full border-2 border-amber-500 opacity-20"
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: `calc(50% + ${y}px)`,
                          width: '100px',
                          height: '100px',
                          backgroundColor: '#f59e0b',
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={`${zone.name}: ${zone.avgResponseTime} min avg`}
                      />
                    );
                  })}

              {/* Selected zone highlight */}
              {selectedZone &&
                zones
                  .filter((zone) => zone.id === selectedZone)
                  .map((zone) => {
                    const { x, y } = latLngToXY(zone.center[0], zone.center[1]);
                    return (
                      <div
                        key={`selected-${zone.id}`}
                        className="absolute rounded-full border-4 border-green-500 opacity-30"
                        style={{
                          left: `calc(50% + ${x}px)`,
                          top: `calc(50% + ${y}px)`,
                          width: '140px',
                          height: '140px',
                          backgroundColor: '#10b981',
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    );
                  })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <div className="space-y-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>Layer Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="heatmap">Heatmap</Label>
                <Switch id="heatmap" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
              </div>

              {showHeatmap && (
                <div className="ml-4 space-y-2">
                  <Label htmlFor="period" className="text-sm">
                    Time Period
                  </Label>
                  <Select value={heatmapPeriod} onValueChange={setHeatmapPeriod}>
                    <SelectTrigger id="period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="hotspots">Hotspots</Label>
                <Switch id="hotspots" checked={showHotspots} onCheckedChange={setShowHotspots} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="coverage">Station Coverage</Label>
                <Switch
                  id="coverage"
                  checked={showStationCoverage}
                  onCheckedChange={setShowStationCoverage}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="response">High Response Zones</Label>
                <Switch
                  id="response"
                  checked={showHighResponseZones}
                  onCheckedChange={setShowHighResponseZones}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Incident Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zonesWithPriority.slice(0, 3).map((zone) => (
                  <TableRow
                    key={zone.id}
                    className={`cursor-pointer ${selectedZone === zone.id ? 'bg-muted' : ''}`}
                    onClick={() => handleZoneSelect(zone.id)}
                  >
                    <TableCell>{zone.name}</TableCell>
                    <TableCell>{zone.incidents}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zonal Priority Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {zonesWithPriority.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedZone === zone.id ? 'border-primary bg-muted' : 'hover:bg-muted/50'
                    }`}
                  onClick={() => handleZoneSelect(zone.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span>{zone.name}</span>
                    <Badge variant={zone.priorityIndex > 15 ? 'destructive' : 'secondary'}>
                      {zone.priorityIndex}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div>Incidents: {zone.incidents}</div>
                    <div>High Sev: {zone.highSeverity}</div>
                    <div className="col-span-2">Avg Response: {zone.avgResponseTime} min</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
