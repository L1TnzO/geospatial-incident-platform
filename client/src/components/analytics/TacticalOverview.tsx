import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Incident } from '../../types';
import { Badge } from '../ui/badge';

interface TacticalOverviewProps {
  incidents: Incident[];
}

export function TacticalOverview({ incidents }: TacticalOverviewProps) {
  // Filter last 24 hours
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);
  const recent24hIncidents = incidents.filter((inc) => new Date(inc.timestamp) > last24Hours);

  // Calculate average response time
  const avgResponseTime =
    incidents
      .filter((inc) => inc.responseTime)
      .reduce((sum, inc) => sum + (inc.responseTime || 0), 0) /
    incidents.filter((inc) => inc.responseTime).length;

  // Incidents by type
  const incidentsByType = incidents.reduce(
    (acc, inc) => {
      acc[inc.type] = (acc[inc.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const typeData = Object.entries(incidentsByType).map(([name, value]) => ({ name, value }));

  // Daily trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyTrendData = last7Days.map((date) => ({
    date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    incidents: incidents.filter((inc) => inc.date === date).length,
  }));

  // Severity distribution
  const severityData = ['Low', 'Medium', 'High', 'Critical'].map((severity) => ({
    name: severity,
    value: incidents.filter((inc) => inc.severity === severity).length,
  }));

  const COLORS = ['#3b82f6', '#eab308', '#f97316', '#ef4444'];

  // Incidents by time slot
  const timeSlots = ['00-06', '06-12', '12-18', '18-24'];
  const timeSlotData = timeSlots.map((slot) => {
    const [start, end] = slot.split('-').map(Number);
    const count = incidents.filter((inc) => {
      const hour = new Date(inc.timestamp).getHours();
      return hour >= start && hour < end;
    }).length;
    return { slot, count };
  });

  // Recent incidents list
  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const getSeverityColor = (severity: string) => {
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
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Last 24h Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{recent24hIncidents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recent24hIncidents.filter((inc) => inc.severity === 'Critical').length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{avgResponseTime.toFixed(1)} min</div>
            <p className="text-xs text-muted-foreground mt-1">Across all incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{incidents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Incidents by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daily Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="incidents"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Incidents by Time Slot</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSlotData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="slot" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-y-auto pr-4 border rounded-md" style={{ height: '400px' }}>
            <div className="space-y-3 p-1">
              {recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span>{incident.id}</span>
                      <Badge variant={getSeverityColor(incident.severity)}>{incident.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {incident.type} - {incident.location.address}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(incident.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
