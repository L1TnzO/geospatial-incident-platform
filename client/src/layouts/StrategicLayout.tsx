import { useEffect, useState } from 'react';
import StrategicCoverageOverlayCard from '@/components/strategic/StrategicCoverageOverlayCard';
import StrategicHotspotOverlayCard from '@/components/strategic/StrategicHotspotOverlayCard';
import StrategicHotspotSummary from '@/components/strategic/StrategicHotspotSummary';
import StrategicMonthlyTrendCard from '@/components/strategic/StrategicMonthlyTrendCard';
import StrategicPriorityScoreCard from '@/components/strategic/StrategicPriorityScoreCard';
import StrategicQuarterComparisonChart from '@/components/strategic/StrategicQuarterComparisonChart';
import StrategicResponseMetricsCard from '@/components/strategic/StrategicResponseMetricsCard';
import StrategicResponseOverlayCard from '@/components/strategic/StrategicResponseOverlayCard';
import StrategicTypeTrendExplorer from '@/components/strategic/StrategicTypeTrendExplorer';
import { useStrategicCoverageBuffers } from '@/hooks/useStrategicCoverageBuffers';
import { useStrategicHotspots } from '@/hooks/useStrategicHotspots';
import { useStrategicMonthlyTrends } from '@/hooks/useStrategicMonthlyTrends';
import { useStrategicQuarterlyTrends } from '@/hooks/useStrategicQuarterlyTrends';
import { useStrategicPriorityScores } from '@/hooks/useStrategicPriorityScores';
import { useStrategicResponseMetrics } from '@/hooks/useStrategicResponseMetrics';
import { useStrategicTypeTimelines } from '@/hooks/useStrategicTypeTimelines';

const DEFAULT_HOTSPOT_RESOLUTION = 4;
const DEFAULT_INTENSITY_SCALE = 1.5;

const StrategicLayout = () => {
  const [hotspotResolution, setHotspotResolution] = useState<number>(DEFAULT_HOTSPOT_RESOLUTION);
  const [intensityScale, setIntensityScale] = useState<number>(DEFAULT_INTENSITY_SCALE);
  const [userChangedResolution, setUserChangedResolution] = useState<boolean>(false);
  const [responseGroupBy, setResponseGroupBy] = useState<'grid' | 'station'>('grid');

  const monthly = useStrategicMonthlyTrends({ months: 12, autoRefreshMs: 5 * 60 * 1000 });
  const quarterly = useStrategicQuarterlyTrends({
    quarters: 8,
    availableTimeframes: [4, 8],
    autoRefreshMs: 5 * 60 * 1000,
  });
  const timelines = useStrategicTypeTimelines({ months: 12, autoRefreshMs: 5 * 60 * 1000 });
  const hotspots = useStrategicHotspots({
    resolution: hotspotResolution,
    autoRefreshMs: 5 * 60 * 1000,
  });
  const coverage = useStrategicCoverageBuffers({ autoRefreshMs: 5 * 60 * 1000 });
  const responseMetrics = useStrategicResponseMetrics({
    groupBy: responseGroupBy,
    autoRefreshMs: 5 * 60 * 1000,
  });
  const priorityScores = useStrategicPriorityScores({
    groupBy: 'station',
    decayHalfLifeDays: 45,
    autoRefreshMs: 5 * 60 * 1000,
  });

  const handleRefreshAll = () => {
    monthly.refresh();
    quarterly.refresh();
    timelines.refresh();
    hotspots.refresh();
    coverage.refresh();
    responseMetrics.refresh();
    priorityScores.refresh();
  };

  useEffect(() => {
    if (!hotspots.data?.metadata.resolution || userChangedResolution) {
      return;
    }

    setHotspotResolution(hotspots.data.metadata.resolution);
  }, [hotspots.data?.metadata.resolution, userChangedResolution]);

  const handleResolutionChange = (value: number) => {
    setUserChangedResolution(true);
    setHotspotResolution(value);
  };

  const handleIntensityScaleChange = (value: number) => {
    setIntensityScale(value);
  };

  const lastUpdatedCandidates = [
    monthly.lastUpdated,
    quarterly.lastUpdated,
    timelines.lastUpdated,
    hotspots.lastUpdated,
    coverage.lastUpdated,
    responseMetrics.lastUpdated,
    priorityScores.lastUpdated,
  ].filter((value): value is string => Boolean(value));
  const lastUpdated = lastUpdatedCandidates.reduce<string | null>((latest, current) => {
    if (!latest) {
      return current;
    }
    return latest > current ? latest : current;
  }, null);

  return (
    <div className="strategic-shell" role="region" aria-label="Strategic analytics">
      <header className="strategic-shell__header">
        <h1>Strategic Analytics</h1>
        <p>
          Long-range trends and hotspot intelligence powering executive planning. Widgets refresh
          automatically every five minutes or on demand as you explore filters shared with the
          incident table.
        </p>
        <div className="strategic-shell__header-actions">
          <button type="button" className="strategic-refresh" onClick={handleRefreshAll}>
            Refresh all
          </button>
          {lastUpdated ? (
            <p className="strategic-shell__timestamp">
              Last updated{' '}
              <time dateTime={lastUpdated}>{new Date(lastUpdated).toLocaleString()}</time>
            </p>
          ) : null}
        </div>
      </header>

      <section aria-labelledby="strategic-trends" className="strategic-shell__section">
        <div className="strategic-section__header">
          <h2 id="strategic-trends">Trend intelligence</h2>
          <p>Compare monthly and quarterly windows to spot sustained changes in incident volume.</p>
        </div>
        <div className="strategic-grid strategic-grid--two-column">
          <StrategicMonthlyTrendCard state={monthly} />
          <StrategicQuarterComparisonChart state={quarterly} />
        </div>
      </section>

      <section aria-labelledby="strategic-composition" className="strategic-shell__section">
        <div className="strategic-section__header">
          <h2 id="strategic-composition">Composition &amp; concentration</h2>
          <p>
            Break down incident types over time and visualize geographic hotspots and station
            coverage buffers for advanced planning overlays.
          </p>
        </div>
        <div className="strategic-grid strategic-grid--wide strategic-grid--hotspot">
          <StrategicHotspotOverlayCard
            state={hotspots}
            resolution={hotspotResolution}
            onResolutionChange={handleResolutionChange}
            intensityScale={intensityScale}
            onIntensityScaleChange={handleIntensityScaleChange}
          />
          <StrategicCoverageOverlayCard state={coverage} />
          <StrategicResponseOverlayCard
            state={responseMetrics}
            groupBy={responseGroupBy}
            onGroupByChange={setResponseGroupBy}
          />
          <StrategicTypeTrendExplorer state={timelines} />
          <StrategicHotspotSummary state={hotspots} />
        </div>
      </section>

      <section aria-labelledby="strategic-response" className="strategic-shell__section">
        <div className="strategic-section__header">
          <h2 id="strategic-response">Response &amp; readiness</h2>
          <p>
            Early-look views for response time benchmarking and severity-weighted demand scoring.
            These feeds power the upcoming heatmap overlays and alerting playbooks.
          </p>
        </div>
        <div className="strategic-grid strategic-grid--two-column">
          <StrategicResponseMetricsCard state={responseMetrics} />
          <StrategicPriorityScoreCard state={priorityScores} />
        </div>
      </section>

      <section aria-labelledby="strategic-roadmap" className="strategic-shell__section">
        <div className="strategic-section__header">
          <h2 id="strategic-roadmap">Upcoming strategic panels</h2>
          <p>
            Placeholder widgets document future analytics scope—swap in production components as
            they arrive.
          </p>
        </div>
        <div className="strategic-grid strategic-grid--two-column">
          <article className="strategic-card strategic-card--placeholder">
            <h3>Recommended mitigations</h3>
            <p>
              Planned feature: surfaces policy and infrastructure recommendations based on hotspot
              persistence and severity trends.
            </p>
          </article>
          <article className="strategic-card strategic-card--placeholder">
            <h3>Capacity stress tests</h3>
            <p>
              Planned feature: simulates station availability, unit deployment, and surge events to
              forecast staffing requirements.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default StrategicLayout;
