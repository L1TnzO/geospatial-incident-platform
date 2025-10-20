import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Incident, FireStation } from '../types';
import { TacticalOverview } from './analytics/TacticalOverview';
import { StrategicInsights } from './analytics/StrategicInsights';
import { GeospatialAnalysis } from './analytics/GeospatialAnalysis';
import { Reporting } from './analytics/Reporting';

interface AnalyticsDashboardProps {
  incidents: Incident[];
  fireStations: FireStation[];
}

export function AnalyticsDashboard({ incidents, fireStations }: AnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  // Filter incidents by global date range
  const filteredIncidents = incidents.filter((incident) => {
    if (!dateRange.start && !dateRange.end) return true;
    const incidentDate = new Date(incident.date);
    if (dateRange.start && incidentDate < new Date(dateRange.start)) return false;
    if (dateRange.end && incidentDate > new Date(dateRange.end)) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Global Date Range Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
          {(dateRange.start || dateRange.end) && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {filteredIncidents.length} of {incidents.length} incidents
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="tactical" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tactical">Tactical Overview</TabsTrigger>
          <TabsTrigger value="strategic">Strategic Insights</TabsTrigger>
          <TabsTrigger value="geospatial">Geospatial Analysis</TabsTrigger>
          <TabsTrigger value="reporting">Reporting</TabsTrigger>
        </TabsList>

        <TabsContent value="tactical" className="space-y-6">
          <TacticalOverview incidents={filteredIncidents} />
        </TabsContent>

        <TabsContent value="strategic" className="space-y-6">
          <StrategicInsights incidents={filteredIncidents} />
        </TabsContent>

        <TabsContent value="geospatial">
          <GeospatialAnalysis incidents={filteredIncidents} fireStations={fireStations} />
        </TabsContent>

        <TabsContent value="reporting" className="space-y-6">
          <Reporting incidents={filteredIncidents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
