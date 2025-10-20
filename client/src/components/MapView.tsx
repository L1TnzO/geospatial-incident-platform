import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Layers, Info, MapPin, Flame, ZoomIn, ZoomOut } from 'lucide-react';
import { Incident, FireStation } from '../types';
import { Badge } from './ui/badge';

interface MapViewProps {
  incidents: Incident[];
  fireStations: FireStation[];
  onIncidentClick: (incident: Incident) => void;
}

export function MapView({ incidents, fireStations, onIncidentClick }: MapViewProps) {
  const [baseLayer, setBaseLayer] = useState<'street' | 'satellite'>('street');
  const [showLegend, setShowLegend] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Convert lat/lng to x/y coordinates for display
  const latLngToXY = (lat: number, lng: number) => {
    // Simple mercator projection centered on NYC
    const centerLat = 40.7128;
    const centerLng = -74.006;
    const scale = 8000;

    const x = (lng - centerLng) * scale * zoom + pan.x;
    const y = -(lat - centerLat) * scale * zoom + pan.y;

    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === mapRef.current || (e.target as HTMLElement).closest('.map-background')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(zoom * 1.3, 5));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(zoom / 1.3, 0.5));
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

  const getBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'default';
      case 'Medium':
        return 'secondary';
      case 'Low':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={mapRef}
        className={`w-full h-full ${baseLayer === 'street' ? 'bg-slate-100' : 'bg-slate-700'} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Background grid pattern */}
        <svg className="absolute inset-0 w-full h-full map-background pointer-events-none">
          <defs>
            <pattern
              id="grid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % 50}, ${pan.y % 50})`}
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke={baseLayer === 'street' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Street/Satellite layer visualization */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`text-6xl opacity-5 select-none ${baseLayer === 'street' ? 'text-slate-400' : 'text-slate-300'}`}
          >
            {baseLayer === 'street' ? 'STREET VIEW' : 'SATELLITE VIEW'}
          </div>
        </div>

        {/* Incident markers */}
        {incidents.map((incident) => {
          const { x, y } = latLngToXY(incident.location.lat, incident.location.lng);
          const isSelected = selectedMarker === incident.id;

          return (
            <div
              key={incident.id}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                zIndex: isSelected ? 1000 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(isSelected ? null : incident.id);
              }}
            >
              <div className="relative group">
                <MapPin
                  className="w-8 h-8 drop-shadow-lg transition-transform group-hover:scale-110"
                  fill={getSeverityColor(incident.severity)}
                  stroke="white"
                  strokeWidth={1}
                />
                {isSelected && (
                  <Card className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 shadow-xl z-50">
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span>{incident.id}</span>
                        <Badge variant={getBadgeVariant(incident.severity)}>
                          {incident.severity}
                        </Badge>
                      </div>
                      <p className="text-sm mb-1">
                        <strong>Type:</strong> {incident.type}
                      </p>
                      <p className="text-sm mb-2">
                        <strong>Date:</strong> {incident.date}
                      </p>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onIncidentClick(incident);
                          setSelectedMarker(null);
                        }}
                        className="w-full"
                      >
                        View Details
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          );
        })}

        {/* Fire station markers */}
        {fireStations.map((station) => {
          const { x, y } = latLngToXY(station.location.lat, station.location.lng);
          const isSelected = selectedMarker === station.id;

          return (
            <div
              key={station.id}
              className="absolute transform -translate-x-1/2 -translate-y-full cursor-pointer"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                zIndex: isSelected ? 1000 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(isSelected ? null : station.id);
              }}
            >
              <div className="relative group">
                <Flame
                  className="w-8 h-8 drop-shadow-lg transition-transform group-hover:scale-110"
                  fill="#8b5cf6"
                  stroke="white"
                  strokeWidth={1}
                />
                {isSelected && (
                  <Card className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 shadow-xl z-50">
                    <div className="p-3">
                      <p>
                        <strong>{station.name}</strong>
                      </p>
                      <p className="text-sm mt-1">Fire Station</p>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Map controls */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
        <Card className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBaseLayer(baseLayer === 'street' ? 'satellite' : 'street')}
            className="gap-2"
          >
            <Layers className="h-4 w-4" />
            {baseLayer === 'street' ? 'Satellite' : 'Street'}
          </Button>
        </Card>

        <Card className="p-2 flex flex-col gap-1">
          <Button variant="ghost" size="sm" onClick={handleZoomIn} className="gap-2">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomOut} className="gap-2">
            <ZoomOut className="h-4 w-4" />
          </Button>
        </Card>

        <Card className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLegend(!showLegend)}
            className="gap-2"
          >
            <Info className="h-4 w-4" />
            Legend
          </Button>
        </Card>

        {showLegend && (
          <Card className="p-4">
            <h4 className="mb-2">Map Legend</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Low</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Fire Station</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
