import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function DashboardPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Operational Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Task 7.5 will populate this view with real-time incident KPIs, charts, and summary
            widgets. The shared layout and route scaffolding are now in place so the downstream work
            can focus on data wiring and visualization without additional routing chores.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
