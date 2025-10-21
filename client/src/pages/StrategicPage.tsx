import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function StrategicPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Strategic Analytics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Task 7.6 will replace this placeholder with the strategic planning experience and
            supporting analytics. The route and page shell ensure charts, filters, and contextual
            insights can be slotted in without further navigation work.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
