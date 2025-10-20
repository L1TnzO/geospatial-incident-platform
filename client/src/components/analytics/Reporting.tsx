import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Download, FileText } from 'lucide-react';
import { Incident } from '../../types';
import { toast } from 'sonner@2.0.3';

interface ReportingProps {
  incidents: Incident[];
}

export function Reporting({ incidents }: ReportingProps) {
  const generateDistrictFrequencyReport = () => {
    // Generate report data
    const zones = ['Zone-A', 'Zone-B', 'Zone-C'];
    const reportData = zones.map((zone) => {
      const zoneIncidents = incidents.filter((inc) => inc.zoneId === zone);
      const typeBreakdown = zoneIncidents.reduce(
        (acc, inc) => {
          acc[inc.type] = (acc[inc.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        zone,
        totalIncidents: zoneIncidents.length,
        typeBreakdown,
        avgResponseTime:
          zoneIncidents
            .filter((inc) => inc.responseTime)
            .reduce((sum, inc) => sum + (inc.responseTime || 0), 0) /
          zoneIncidents.filter((inc) => inc.responseTime).length,
      };
    });

    // Create CSV content
    const csvLines = [
      'District Frequency Report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Zone,Total Incidents,Avg Response Time (min)',
      ...reportData.map(
        (data) => `${data.zone},${data.totalIncidents},${data.avgResponseTime.toFixed(2)}`
      ),
      '',
      'Incident Type Breakdown by Zone',
      'Zone,Type,Count',
      ...reportData.flatMap((data) =>
        Object.entries(data.typeBreakdown).map(([type, count]) => `${data.zone},${type},${count}`)
      ),
    ].join('\n');

    // Download
    const blob = new Blob([csvLines], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `district_frequency_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('District Frequency Report generated successfully');
  };

  const generateAnnualSummaryReport = () => {
    // Calculate annual statistics
    const totalIncidents = incidents.length;
    const byType = incidents.reduce(
      (acc, inc) => {
        acc[inc.type] = (acc[inc.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const bySeverity = incidents.reduce(
      (acc, inc) => {
        acc[inc.severity] = (acc[inc.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const avgResponseTime =
      incidents
        .filter((inc) => inc.responseTime)
        .reduce((sum, inc) => sum + (inc.responseTime || 0), 0) /
      incidents.filter((inc) => inc.responseTime).length;

    const monthlyStats = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(2025, i, 1).toLocaleDateString('en-US', { month: 'long' });
      const count = incidents.filter((inc) => new Date(inc.timestamp).getMonth() === i).length;
      return { month, count };
    });

    // Create comprehensive report
    const reportLines = [
      'ANNUAL SUMMARY REPORT - 2025',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '=== OVERVIEW ===',
      `Total Incidents: ${totalIncidents}`,
      `Average Response Time: ${avgResponseTime.toFixed(2)} minutes`,
      '',
      '=== INCIDENTS BY TYPE ===',
      ...Object.entries(byType).map(
        ([type, count]) => `${type}: ${count} (${((count / totalIncidents) * 100).toFixed(1)}%)`
      ),
      '',
      '=== INCIDENTS BY SEVERITY ===',
      ...Object.entries(bySeverity).map(
        ([severity, count]) =>
          `${severity}: ${count} (${((count / totalIncidents) * 100).toFixed(1)}%)`
      ),
      '',
      '=== MONTHLY BREAKDOWN ===',
      ...monthlyStats.map(({ month, count }) => `${month}: ${count} incidents`),
      '',
      '=== KEY INSIGHTS ===',
      `- Busiest month: ${monthlyStats.reduce((max, curr) => (curr.count > max.count ? curr : max)).month}`,
      `- Most common incident type: ${Object.entries(byType).reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0]}`,
      `- Critical incidents: ${bySeverity['Critical'] || 0} (${(((bySeverity['Critical'] || 0) / totalIncidents) * 100).toFixed(1)}%)`,
      '',
      '=== RECOMMENDATIONS ===',
      '- Review resource allocation in high-incident zones',
      '- Implement preventive measures for top incident types',
      '- Focus on reducing response times in underperforming areas',
      '',
    ].join('\n');

    // Download
    const blob = new Blob([reportLines], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual_summary_report_2025_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Annual Summary Report generated successfully');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>District Frequency Report</CardTitle>
          <CardDescription>
            Comprehensive breakdown of incident frequency across all districts, including type
            distribution and response time metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="mb-2">Report Contents:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Total incidents per zone/district</li>
                <li>Incident type breakdown by zone</li>
                <li>Average response times per zone</li>
                <li>Zone comparison metrics</li>
              </ul>
            </div>
            <Button onClick={generateDistrictFrequencyReport} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Generate District Frequency Report (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Annual Summary Report</CardTitle>
          <CardDescription>
            Complete year-end report with statistics, trends, insights, and recommendations for
            strategic planning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="mb-2">Report Contents:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Annual incident overview and totals</li>
                <li>Monthly breakdown and trends</li>
                <li>Type and severity distribution</li>
                <li>Response time analysis</li>
                <li>Key insights and patterns</li>
                <li>Recommendations for improvement</li>
              </ul>
            </div>
            <Button onClick={generateAnnualSummaryReport} className="w-full gap-2">
              <FileText className="h-4 w-4" />
              Generate Annual Summary Report (TXT)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>Previously generated reports (demo data)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              {
                name: 'District Frequency Report - September 2025',
                date: '2025-10-01',
                type: 'CSV',
              },
              { name: 'Annual Summary Report - 2024', date: '2025-01-15', type: 'TXT' },
              { name: 'District Frequency Report - June 2025', date: '2025-07-01', type: 'CSV' },
            ].map((report, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm">{report.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {report.date} • {report.type}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
