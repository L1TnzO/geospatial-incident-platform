import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import DashboardPage from '@/pages/DashboardPage';
import { clearIncidentMetadataCache } from '@/services/incidentsMetaService';
import { resetIncidentDetailStore, useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import { resetMapPreferencesStore } from '@/store/useMapPreferencesStore';
import { useMapStore } from '@/store/useMapStore';
import {
  createDashboardErrorHandlers,
  createDashboardHandlers,
  defaultDashboardMocks,
} from '@/test-utils/dashboardHandlers';

const {
  last24h: INITIAL_LAST_24H,
  typeDistribution: INITIAL_TYPE_DISTRIBUTION,
  severityDistribution: INITIAL_SEVERITY_DISTRIBUTION,
  dailyTrend: INITIAL_DAILY_TREND,
  recentIncidents: INITIAL_RECENT_INCIDENTS,
} = defaultDashboardMocks;

const exportRequests: string[] = [];

const server = setupServer(
  ...createDashboardHandlers({
    onExportRequest: (url) => {
      exportRequests.push(url);
    },
  })
);

const originalCreateObjectURL = global.URL.createObjectURL;
const originalRevokeObjectURL = global.URL.revokeObjectURL;
const createObjectUrlMock = vi.fn(() => 'blob:dashboard-export');
const revokeObjectUrlMock = vi.fn();

const formatDelta = (value: number) => `${value >= 0 ? '+' : ''}${value.toLocaleString()}`;
const formatPercentage = (value: number) => {
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
  return `${value >= 0 ? '+' : ''}${formatted}%`;
};
const formatTypeTooltipPercentage = (value: number) => value.toFixed(1);
const severityPercentageFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});
const formatSeverityTooltipPercentage = (value: number) =>
  severityPercentageFormatter.format(value);

describe('DashboardPage analytics integration', () => {
  beforeAll(() => {
    global.URL.createObjectURL = createObjectUrlMock;
    global.URL.revokeObjectURL = revokeObjectUrlMock;
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
    clearIncidentMetadataCache();
    localStorage.clear();
    act(() => {
      resetIncidentDetailStore({ clearStorage: true });
      resetMapPreferencesStore();
      useMapStore.setState({ center: [40.7128, -74.006], zoom: 11 });
    });
    exportRequests.length = 0;
    createObjectUrlMock.mockClear();
    revokeObjectUrlMock.mockClear();
  });

  afterAll(() => {
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    server.close();
  });

  it('renders dashboard sections with loaded data', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(screen.queryByText(/loading kpi metrics/i)).not.toBeInTheDocument());

    expect(screen.getByRole('heading', { name: /dashboard analytics/i })).toBeInTheDocument();
    const kpiHeading = screen.getByText(/incidents \(last 24h\)/i);
    const kpiCard = kpiHeading.closest('article');
    expect(kpiCard).not.toBeNull();
    const kpi = within(kpiCard as HTMLElement);
    expect(kpi.getByText(String(INITIAL_LAST_24H.currentCount))).toBeInTheDocument();
    expect(kpi.getByText(formatDelta(INITIAL_LAST_24H.delta))).toBeInTheDocument();
    expect(kpi.getByText(formatPercentage(INITIAL_LAST_24H.deltaPercentage))).toBeInTheDocument();
    expect(kpi.getByRole('button', { name: /refresh kpi/i })).toBeInTheDocument();

    INITIAL_TYPE_DISTRIBUTION.buckets.forEach((bucket) => {
      const title = `${bucket.type.name}: ${bucket.count.toLocaleString()} incidents (${formatTypeTooltipPercentage(bucket.percentage)}%)`;
      expect(screen.getByRole('listitem', { name: title })).toBeInTheDocument();
    });

    INITIAL_SEVERITY_DISTRIBUTION.buckets.forEach((bucket) => {
      const title = `${bucket.severity.name}: ${bucket.count.toLocaleString()} incidents (${formatSeverityTooltipPercentage(bucket.percentage)}%)`;
      expect(screen.getByRole('listitem', { name: title })).toBeInTheDocument();
    });

    expect(screen.getByRole('figure', { name: /incident counts per day/i })).toBeInTheDocument();
    const trendCard = screen.getByRole('listitem', { name: /daily incident trend/i });
    const currentTotalSummary = within(trendCard).getByText(/current 7-day total/i);
    expect(currentTotalSummary).toHaveTextContent(
      INITIAL_DAILY_TREND.trend.currentTotal.toLocaleString()
    );
    expect(screen.getByText(/last updated/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /percentage/i }));
    INITIAL_TYPE_DISTRIBUTION.buckets.forEach((bucket) => {
      expect(screen.getByText(`${bucket.percentage.toFixed(1)}%`)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /percentage/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportButton);
    expect(screen.getByRole('button', { name: /exporting…/i })).toBeDisabled();
    await screen.findByText(/export ready/i);
    expect(exportRequests).toHaveLength(1);
    expect(exportRequests[0]).toContain('/api/dashboard/export');
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /download again/i }));
    expect(createObjectUrlMock).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    await waitFor(() => expect(screen.queryByText(/export ready/i)).not.toBeInTheDocument());

    const firstRecent = INITIAL_RECENT_INCIDENTS[0]!;
    const recentItem = screen.getByRole('listitem', {
      name: new RegExp(firstRecent.incidentNumber, 'i'),
    });
    const viewOnMapButton = within(recentItem).getByRole('button', { name: /view on map/i });
    await act(async () => {
      fireEvent.click(viewOnMapButton);
    });
    await waitFor(() => {
      const mapState = useMapStore.getState();
      expect(mapState.center[0]).toBeCloseTo(37.79, 2);
      expect(mapState.center[1]).toBeCloseTo(-122.41, 2);
      expect(mapState.zoom).toBe(14);
    });
    await waitFor(() =>
      expect(useIncidentDetailStore.getState().selectedIncident?.incidentNumber).toBe(
        firstRecent.incidentNumber
      )
    );

    const openDetailsButton = within(recentItem).getByRole('button', { name: /open details/i });
    await act(async () => {
      fireEvent.click(openDetailsButton);
    });
    const dialog = await screen.findByRole('dialog', undefined, { timeout: 3000 });
    expect(dialog).toHaveTextContent(firstRecent.incidentNumber);
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: /^close$/i }));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('refreshes analytics widgets via the dashboard header control', async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.queryByText(/loading kpi metrics/i)).not.toBeInTheDocument());

    const refreshedMocks = {
      last24h: {
        ...INITIAL_LAST_24H,
        currentCount: 22,
        previousCount: 20,
        delta: 2,
        deltaPercentage: 10,
      },
      typeDistribution: {
        total: 20,
        buckets: [
          {
            type: { code: 'FIRE_STRUCTURE', name: 'Structure Fire', description: null },
            count: 10,
            percentage: 50,
          },
          {
            type: { code: 'RESCUE', name: 'Rescue', description: null },
            count: 6,
            percentage: 30,
          },
          {
            type: { code: 'HAZMAT', name: 'Hazmat', description: null },
            count: 4,
            percentage: 20,
          },
        ],
      },
      severityDistribution: {
        total: 20,
        buckets: [
          {
            severity: {
              code: 'CRITICAL',
              name: 'Critical',
              description: null,
              priority: 4,
              colorHex: '#dc2626',
            },
            count: 9,
            percentage: 45,
          },
          {
            severity: {
              code: 'HIGH',
              name: 'High',
              description: null,
              priority: 3,
              colorHex: '#f97316',
            },
            count: 5,
            percentage: 25,
          },
          {
            severity: {
              code: 'MODERATE',
              name: 'Moderate',
              description: null,
              priority: 2,
              colorHex: '#f59e0b',
            },
            count: 6,
            percentage: 30,
          },
        ],
      },
      dailyTrend: {
        points: [
          { date: '2025-01-05T00:00:00Z', count: 3 },
          { date: '2025-01-06T00:00:00Z', count: 4 },
          { date: '2025-01-07T00:00:00Z', count: 5 },
          { date: '2025-01-08T00:00:00Z', count: 6 },
          { date: '2025-01-09T00:00:00Z', count: 7 },
          { date: '2025-01-10T00:00:00Z', count: 8 },
          { date: '2025-01-11T00:00:00Z', count: 9 },
        ],
        trend: {
          currentTotal: 21,
          previousTotal: 15,
          change: 6,
          percentageChange: 40,
          direction: 'up' as const,
        },
      },
      recentIncidents: [
        {
          incidentNumber: 'INC-555',
          title: 'Pier Fire Response',
          occurrenceAt: '2025-01-11T14:10:00Z',
          reportedAt: '2025-01-11T14:12:00Z',
          isActive: true,
          location: {
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [-122.3, 37.8] },
            properties: {},
          },
          severity: {
            code: 'HIGH',
            name: 'High',
            description: null,
            priority: 3,
            colorHex: '#f97316',
          },
          status: { code: 'ON_SCENE', name: 'On Scene', description: null, isTerminal: false },
          type: { code: 'RESCUE', name: 'Rescue', description: null },
          primaryStation: { stationCode: 'FS07', name: 'Fire Station 7' },
        },
      ],
    };

    server.use(
      ...createDashboardHandlers({
        last24h: refreshedMocks.last24h,
        typeDistribution: refreshedMocks.typeDistribution,
        severityDistribution: refreshedMocks.severityDistribution,
        dailyTrend: refreshedMocks.dailyTrend,
        recentIncidents: refreshedMocks.recentIncidents,
        onExportRequest: (url) => {
          exportRequests.push(url);
        },
      })
    );

    const refreshButtons = screen.getAllByRole('button', { name: /^refresh data$/i });
    const headerRefresh = refreshButtons.find((button) =>
      button.classList.contains('dashboard-refresh')
    );
    expect(headerRefresh).toBeDefined();
    fireEvent.click(headerRefresh!);

    await screen.findByText(String(refreshedMocks.last24h.currentCount));
    expect(screen.getByText(formatDelta(refreshedMocks.last24h.delta))).toBeInTheDocument();
    expect(
      screen.getByText(formatPercentage(refreshedMocks.last24h.deltaPercentage))
    ).toBeInTheDocument();

    refreshedMocks.typeDistribution.buckets.forEach((bucket) => {
      const title = `${bucket.type.name}: ${bucket.count.toLocaleString()} incidents (${formatTypeTooltipPercentage(bucket.percentage)}%)`;
      expect(screen.getByRole('listitem', { name: title })).toBeInTheDocument();
    });

    refreshedMocks.severityDistribution.buckets.forEach((bucket) => {
      const title = `${bucket.severity.name}: ${bucket.count.toLocaleString()} incidents (${formatSeverityTooltipPercentage(bucket.percentage)}%)`;
      expect(screen.getByRole('listitem', { name: title })).toBeInTheDocument();
    });

    const refreshedTrendCard = screen.getByRole('listitem', { name: /daily incident trend/i });
    const refreshedCurrentTotal = within(refreshedTrendCard).getByText(/current 7-day total/i);
    expect(refreshedCurrentTotal).toHaveTextContent(
      refreshedMocks.dailyTrend.trend.currentTotal.toLocaleString()
    );

    expect(
      screen.getByRole('listitem', {
        name: new RegExp(refreshedMocks.recentIncidents[0]!.incidentNumber, 'i'),
      })
    ).toBeInTheDocument();
  });

  it('surfaces error states when dashboard endpoints fail', async () => {
    server.use(...createDashboardErrorHandlers({ errorBody: 'Export failed' }));

    render(<DashboardPage />);

    const errorBanners = await screen.findAllByText(/export failed/i);
    expect(errorBanners.length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByRole('button', { name: /try again/i })).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));
    await screen.findByRole('button', { name: /retry export/i });
    expect(screen.getByRole('button', { name: /retry export/i })).toBeInTheDocument();
  });
});
