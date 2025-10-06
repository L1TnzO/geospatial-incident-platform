import StrategicHotspotSummary from '@/components/strategic/StrategicHotspotSummary';
import StrategicMonthlyTrendCard from '@/components/strategic/StrategicMonthlyTrendCard';
import StrategicQuarterlySummary from '@/components/strategic/StrategicQuarterlySummary';
import StrategicTypeTimelinePanel from '@/components/strategic/StrategicTypeTimelinePanel';
import { useStrategicHotspots } from '@/hooks/useStrategicHotspots';
import { useStrategicMonthlyTrends } from '@/hooks/useStrategicMonthlyTrends';
import { useStrategicQuarterlyTrends } from '@/hooks/useStrategicQuarterlyTrends';
import { useStrategicTypeTimelines } from '@/hooks/useStrategicTypeTimelines';

const StrategicLayout = () => {
  const monthly = useStrategicMonthlyTrends({ months: 12, autoRefreshMs: 5 * 60 * 1000 });
  const quarterly = useStrategicQuarterlyTrends({ quarters: 8, autoRefreshMs: 5 * 60 * 1000 });
  const timelines = useStrategicTypeTimelines({ months: 12, autoRefreshMs: 5 * 60 * 1000 });
  const hotspots = useStrategicHotspots({ resolution: 4, autoRefreshMs: 5 * 60 * 1000 });

  const handleRefreshAll = () => {
    monthly.refresh();
    quarterly.refresh();
    timelines.refresh();
    hotspots.refresh();
  };

  const lastUpdatedCandidates = [
    monthly.lastUpdated,
    quarterly.lastUpdated,
    timelines.lastUpdated,
    hotspots.lastUpdated,
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
          <StrategicQuarterlySummary state={quarterly} />
        </div>
      </section>

      <section aria-labelledby="strategic-composition" className="strategic-shell__section">
        <div className="strategic-section__header">
          <h2 id="strategic-composition">Composition &amp; concentration</h2>
          <p>
            Break down incident types over time and identify geographic hotspots ready for advanced
            map overlays.
          </p>
        </div>
        <div className="strategic-grid strategic-grid--wide">
          <StrategicTypeTimelinePanel state={timelines} />
          <StrategicHotspotSummary state={hotspots} />
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
        <div className="strategic-grid strategic-grid--three-column">
          <article className="strategic-card strategic-card--placeholder">
            <h3>Resource readiness index</h3>
            <p>
              Planned feature: combines incident backlog, staffing levels, and turnout times to
              score readiness per district.
            </p>
          </article>
          <article className="strategic-card strategic-card--placeholder">
            <h3>Multi-quarter forecast</h3>
            <p>
              Planned feature: projects incident loads using Holt-Winters smoothing with confidence
              intervals for budget planning.
            </p>
          </article>
          <article className="strategic-card strategic-card--placeholder">
            <h3>Recommended mitigations</h3>
            <p>
              Planned feature: surfaces policy and infrastructure recommendations based on hotspot
              persistence and severity trends.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default StrategicLayout;
