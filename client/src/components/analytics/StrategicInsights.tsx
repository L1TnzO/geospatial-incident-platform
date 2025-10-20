import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Incident } from '../../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface StrategicInsightsProps {
  incidents: Incident[];
}

export function StrategicInsights({ incidents }: StrategicInsightsProps) {
  const [selectedIncidentType, setSelectedIncidentType] = useState('all');

  // Response target compliance (< 5 min target)
  const TARGET_RESPONSE_TIME = 5;
  const incidentsWithResponseTime = incidents.filter((inc) => inc.responseTime);
  const compliantIncidents = incidentsWithResponseTime.filter(
    (inc) => inc.responseTime! <= TARGET_RESPONSE_TIME
  );
  const complianceRate = (compliantIncidents.length / incidentsWithResponseTime.length) * 100;

  // High-severity change rate (comparing last 30 days to previous 30 days)
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  const previous60Days = new Date();
  previous60Days.setDate(previous60Days.getDate() - 60);

  const recentHighSeverity = incidents.filter(
    (inc) =>
      (inc.severity === 'High' || inc.severity === 'Critical') &&
      new Date(inc.timestamp) > last30Days
  ).length;

  const previousHighSeverity = incidents.filter(
    (inc) =>
      (inc.severity === 'High' || inc.severity === 'Critical') &&
      new Date(inc.timestamp) > previous60Days &&
      new Date(inc.timestamp) <= last30Days
  ).length;

  const severityChangeRate =
    previousHighSeverity > 0
      ? ((recentHighSeverity - previousHighSeverity) / previousHighSeverity) * 100
      : 0;

  // Annual trend data (by month)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2025, i, 1).toLocaleDateString('en-US', { month: 'short' });
    const monthIncidents = incidents.filter((inc) => {
      const incDate = new Date(inc.timestamp);
      return incDate.getMonth() === i;
    });

    const filtered =
      selectedIncidentType === 'all'
        ? monthIncidents
        : monthIncidents.filter((inc) => inc.type === selectedIncidentType);

    return {
      month,
      total: filtered.length,
      critical: filtered.filter((inc) => inc.severity === 'Critical').length,
      high: filtered.filter((inc) => inc.severity === 'High').length,
    };
  });

  // Quarterly comparison
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quarterlyData = quarters.map((quarter, i) => {
    const startMonth = i * 3;
    const endMonth = startMonth + 3;
    const count = incidents.filter((inc) => {
      const month = new Date(inc.timestamp).getMonth();
      return month >= startMonth && month < endMonth;
    }).length;
    return { quarter, incidents: count };
  });

  // Incident projection (simple linear projection for next quarter)
  const lastQuarterIncidents = quarterlyData[3]?.incidents || 0;
  const avgGrowth =
    quarterlyData.reduce((acc, q, i, arr) => {
      if (i === 0) return 0;
      return acc + (q.incidents - arr[i - 1].incidents);
    }, 0) / 3;
  const projectedNextQuarter = Math.max(0, Math.round(lastQuarterIncidents + avgGrowth));

  const projectionData = [
    ...quarterlyData,
    { quarter: 'Q1 2026 (proj)', incidents: projectedNextQuarter },
  ];

  // Station performance
  const stationPerformance = [
    { station: 'Fire Station 1', incidents: 45, avgResponse: 4.2, compliance: 92 },
    { station: 'Fire Station 2', incidents: 38, avgResponse: 5.8, compliance: 78 },
    { station: 'Fire Station 3', incidents: 52, avgResponse: 3.9, compliance: 95 },
  ];

  const incidentTypes = ['all', ...Array.from(new Set(incidents.map((inc) => inc.type)))];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Response Target Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{complianceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {compliantIncidents.length} of {incidentsWithResponseTime.length} under{' '}
              {TARGET_RESPONSE_TIME} min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">High-Severity Change Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl ${severityChangeRate > 0 ? 'text-destructive' : 'text-green-600'}`}
            >
              {severityChangeRate > 0 ? '+' : ''}
              {severityChangeRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs previous 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Annual Trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Annual Trend</CardTitle>
            <div className="flex items-center gap-2">
              <Label htmlFor="type-filter" className="text-sm">
                Filter by type:
              </Label>
              <Select value={selectedIncidentType} onValueChange={setSelectedIncidentType}>
                <SelectTrigger id="type-filter" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === 'all' ? 'All Types' : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--chart-1))"
                name="Total"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="critical"
                stroke="hsl(var(--chart-5))"
                name="Critical"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="high"
                stroke="hsl(var(--chart-4))"
                name="High"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quarterly Comparison and Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={quarterlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="incidents" fill="hsl(var(--chart-2))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incident Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quarter" angle={-15} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="incidents" fill="hsl(var(--chart-3))">
                  {projectionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === projectionData.length - 1
                          ? 'hsl(var(--muted-foreground))'
                          : 'hsl(var(--chart-3))'
                      }
                      opacity={index === projectionData.length - 1 ? 0.5 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Station Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Station Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Total Incidents</TableHead>
                <TableHead>Avg Response Time</TableHead>
                <TableHead>Compliance Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stationPerformance.map((station) => (
                <TableRow key={station.station}>
                  <TableCell>{station.station}</TableCell>
                  <TableCell>{station.incidents}</TableCell>
                  <TableCell>{station.avgResponse} min</TableCell>
                  <TableCell>
                    <span
                      className={
                        station.compliance >= 90
                          ? 'text-green-600'
                          : station.compliance >= 75
                            ? 'text-yellow-600'
                            : 'text-destructive'
                      }
                    >
                      {station.compliance}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
