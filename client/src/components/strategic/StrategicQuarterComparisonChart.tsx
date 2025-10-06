import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { StrategicQuarterlyTrendsState } from '@/hooks/useStrategicQuarterlyTrends';
import type { StrategicQuarterlyTrendPoint } from '@/types/strategic';
import { triggerBrowserDownload } from '@/utils/download';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 320;
const CHART_PADDING_X = 48;
const CHART_PADDING_Y = 36;
const DEFAULT_FILENAME_PREFIX = 'strategic-quarterly-comparison';

const safePercentage = (value: number | null | undefined, digits: number = 1) => {
  if (value === null || value === undefined) {
    return null;
  }
  const rounded = Math.abs(value) < 1 ? value.toFixed(2) : value.toFixed(digits);
  return `${value > 0 ? '+' : ''}${rounded}%`;
};

const deltaSummary = (delta: number | null, percentage: number | null) => {
  if (delta === null && percentage === null) {
    return 'Change data unavailable';
  }
  const parts: string[] = [];
  if (delta !== null) {
    parts.push(`${delta > 0 ? '+' : ''}${delta.toLocaleString()} incidents`);
  }
  const percentageLabel = safePercentage(percentage);
  if (percentageLabel) {
    parts.push(percentageLabel);
  }
  return parts.join(' • ');
};

interface ChartGroup {
  point: StrategicQuarterlyTrendPoint;
  labelX: number;
  barWidth: number;
  currentBar: {
    x: number;
    y: number;
    height: number;
  } | null;
  previousBar: {
    x: number;
    y: number;
    height: number;
  } | null;
  deltaLabel: string | null;
  deltaX: number;
  deltaY: number;
}

const StrategicQuarterComparisonChart = ({ state }: { state: StrategicQuarterlyTrendsState }) => {
  const titleId = useId();
  const timeframeGroupId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const hasData = Boolean(state.data && state.data.series.length > 0);

  const chart = useMemo(() => {
    const series = state.data?.series ?? [];
    if (series.length === 0) {
      return {
        groups: [] as ChartGroup[],
        baseline: CHART_HEIGHT - CHART_PADDING_Y,
      };
    }

    const values = series.flatMap((point) => [point.count, point.previousYearCount ?? 0]);
    const maxValue = Math.max(...values, 1);
    const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
    const groupWidth = (CHART_WIDTH - CHART_PADDING_X * 2) / Math.max(series.length, 1);
    const barWidth = Math.min(32, Math.max(16, groupWidth / 3));
    const barGap = Math.max(8, (groupWidth - barWidth * 2) / 3);
    const baseline = CHART_HEIGHT - CHART_PADDING_Y;

    const projection = (value: number) => (value / maxValue) * usableHeight;

    const groups: ChartGroup[] = series.map((point, index) => {
      const groupStart = CHART_PADDING_X + index * groupWidth;
      const labelX = groupStart + groupWidth / 2;
      const currentHeight = projection(point.count);
      const currentBar = {
        x: groupStart + barGap,
        y: baseline - currentHeight,
        height: currentHeight,
      };
      const previousValue = point.previousYearCount ?? null;
      const previousHeight = previousValue !== null ? projection(previousValue) : null;
      const previousBar =
        previousHeight !== null
          ? {
              x: groupStart + barGap * 2 + barWidth,
              y: baseline - previousHeight,
              height: previousHeight,
            }
          : null;

      const deltaLabel = (() => {
        const delta = point.yearOverYearDelta;
        const percent = safePercentage(point.yearOverYearPercentage);
        if (delta === null && !percent) {
          return null;
        }
        const pieces: string[] = [];
        if (delta !== null) {
          pieces.push(`${delta > 0 ? '+' : ''}${delta.toLocaleString()}`);
        }
        if (percent) {
          pieces.push(`(${percent})`);
        }
        return pieces.join(' ');
      })();

      return {
        point,
        labelX,
        barWidth,
        currentBar,
        previousBar,
        deltaLabel,
        deltaX: labelX,
        deltaY: Math.min(currentBar.y, previousBar?.y ?? currentBar.y) - 12,
      };
    });

    return {
      groups,
      baseline,
    };
  }, [state.data]);

  const handleRefresh = () => {
    state.refresh();
  };

  const handleTimeframeChange = (quarters: number) => {
    state.setTimeframe(quarters);
  };

  const handleExportCsv = useCallback(() => {
    if (!state.data) {
      return;
    }

    const header = [
      'year',
      'quarter',
      'label',
      'current_count',
      'previous_year_count',
      'quarter_over_quarter_delta',
      'quarter_over_quarter_percentage',
      'year_over_year_delta',
      'year_over_year_percentage',
    ].join(',');

    const rows = state.data.series.map((point) => [
      point.year.toString(),
      point.quarter.toString(),
      point.label,
      point.count.toString(),
      point.previousYearCount ?? '',
      point.quarterOverQuarterDelta ?? '',
      point.quarterOverQuarterPercentage ?? '',
      point.yearOverYearDelta ?? '',
      point.yearOverYearPercentage ?? '',
    ]);

    const csv = [header, ...rows.map((columns) => columns.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    triggerBrowserDownload(blob, `${DEFAULT_FILENAME_PREFIX}-${state.timeframe}q.csv`);
  }, [state.data, state.timeframe]);

  const handleExportPng = useCallback(async () => {
    if (!svgRef.current || typeof window === 'undefined') {
      return;
    }

    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgElement);
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/)) {
      source = source.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    source = `<?xml version="1.0" standalone="no"?>\r\n${source}`;

    const image = new Image();
    const width = CHART_WIDTH;
    const height = CHART_HEIGHT;

    const pngPromise = new Promise<void>((resolve) => {
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve();
          return;
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            triggerBrowserDownload(blob, `${DEFAULT_FILENAME_PREFIX}-${state.timeframe}q.png`);
          }
          resolve();
        });
      };
      image.onerror = () => resolve();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    });

    setIsExportingPng(true);
    await pngPromise;
    setIsExportingPng(false);
  }, [state.timeframe]);

  const timeframeLabel = useMemo(
    () => `${state.timeframe} quarter${state.timeframe === 1 ? '' : 's'}`,
    [state.timeframe]
  );

  const highlight: StrategicQuarterlyTrendPoint[] = useMemo(
    () => state.data?.series.slice(-3) ?? [],
    [state.data]
  );

  return (
    <article
      className="strategic-card strategic-quarter-comparison"
      aria-busy={state.isLoading}
      aria-labelledby={titleId}
    >
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Quarterly comparison</h3>
          <p className="strategic-card__subtitle">
            {timeframeLabel} · Compare current year quarterly totals against the previous year to
            spotlight emerging trends, then export data snapshots for executive decks.
          </p>
        </div>
        <div className="strategic-quarter-comparison__actions">
          <div
            className="strategic-quarter-comparison__timeframes"
            role="group"
            aria-labelledby={timeframeGroupId}
          >
            <span id={timeframeGroupId} className="visually-hidden">
              Timeframe
            </span>
            {state.availableTimeframes.map((quarters) => (
              <button
                key={quarters}
                type="button"
                aria-pressed={state.timeframe === quarters}
                onClick={() => handleTimeframeChange(quarters)}
              >
                {quarters}q
              </button>
            ))}
          </div>
          <div className="strategic-quarter-comparison__export">
            <button type="button" onClick={handleExportCsv} disabled={!hasData}>
              Export CSV
            </button>
            <button type="button" onClick={handleExportPng} disabled={isExportingPng || !hasData}>
              {isExportingPng ? 'Exporting…' : 'Export PNG'}
            </button>
            <button type="button" className="strategic-card__refresh" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        </div>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading quarterly trend data…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load quarterly trends.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {state.isSuccess && state.data ? (
          <div className="strategic-card__content strategic-quarter-comparison__content">
            {hasData ? (
              <figure
                className="strategic-quarter-comparison__chart"
                role="figure"
                aria-label="Quarterly incident counts compared to previous year"
              >
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  role="presentation"
                  aria-hidden="true"
                >
                  <line
                    x1={CHART_PADDING_X}
                    y1={chart.baseline}
                    x2={CHART_WIDTH - CHART_PADDING_X}
                    y2={chart.baseline}
                    stroke="rgba(148, 163, 184, 0.6)"
                    strokeWidth={1}
                  />
                  {chart.groups.map((group) => (
                    <g key={group.point.label} className="strategic-quarter-comparison__group">
                      {group.previousBar ? (
                        <rect
                          className="strategic-quarter-comparison__bar strategic-quarter-comparison__bar--previous"
                          x={group.previousBar.x}
                          y={group.previousBar.y}
                          width={group.barWidth}
                          height={group.previousBar.height}
                        >
                          <title>
                            {group.point.label} (previous year):{' '}
                            {(group.point.previousYearCount ?? 0).toLocaleString()} incidents
                          </title>
                        </rect>
                      ) : null}
                      {group.currentBar ? (
                        <rect
                          className="strategic-quarter-comparison__bar strategic-quarter-comparison__bar--current"
                          x={group.currentBar.x}
                          y={group.currentBar.y}
                          width={group.barWidth}
                          height={group.currentBar.height}
                        >
                          <title>
                            {group.point.label}: {group.point.count.toLocaleString()} incidents
                          </title>
                        </rect>
                      ) : null}
                      {group.deltaLabel ? (
                        <text
                          className="strategic-quarter-comparison__delta"
                          x={group.deltaX}
                          y={Math.max(group.deltaY, 12)}
                        >
                          {group.deltaLabel}
                        </text>
                      ) : null}
                      <text
                        className="strategic-quarter-comparison__label"
                        x={group.labelX}
                        y={CHART_HEIGHT - CHART_PADDING_Y / 2}
                      >
                        {group.point.label}
                      </text>
                    </g>
                  ))}
                </svg>
                <figcaption className="strategic-quarter-comparison__legend">
                  <span className="strategic-quarter-comparison__legend-item strategic-quarter-comparison__legend-item--current">
                    ■ Current year
                  </span>
                  <span className="strategic-quarter-comparison__legend-item strategic-quarter-comparison__legend-item--previous">
                    ■ Previous year
                  </span>
                </figcaption>
              </figure>
            ) : (
              <p className="strategic-card__status" role="status">
                Quarterly trend data is not yet available for the selected timeframe and filters.
              </p>
            )}

            <dl className="strategic-card__metrics strategic-card__metrics--grid">
              <div>
                <dt>Current quarter</dt>
                <dd>
                  <strong>{state.data.summary.current?.label ?? '—'}</strong>
                  <span>
                    {state.data.summary.current
                      ? `${state.data.summary.current.count.toLocaleString()} incidents`
                      : '—'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Previous quarter</dt>
                <dd>
                  <strong>{state.data.summary.previous?.label ?? '—'}</strong>
                  <span>
                    {state.data.summary.previous
                      ? `${state.data.summary.previous.count.toLocaleString()} incidents`
                      : '—'}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Quarter-over-quarter change</dt>
                <dd>{deltaSummary(state.data.summary.delta, state.data.summary.percentage)}</dd>
              </div>
              <div>
                <dt>Year-over-year reference</dt>
                <dd>
                  <strong>{state.data.summary.yearOverYearReference?.label ?? '—'}</strong>
                  <span>
                    {deltaSummary(
                      state.data.summary.yearOverYearDelta,
                      state.data.summary.yearOverYearPercentage
                    )}
                  </span>
                </dd>
              </div>
            </dl>

            <div className="strategic-card__highlight">
              <h4>Recent quarters</h4>
              <ul>
                {highlight.map((point) => (
                  <li key={`${point.year}-Q${point.quarter}`}>
                    <span className="strategic-card__highlight-month">{point.label}</span>
                    <span className="strategic-card__highlight-count">
                      {point.count.toLocaleString()} incidents
                    </span>
                    <span className="strategic-card__highlight-change">
                      {deltaSummary(point.yearOverYearDelta, point.yearOverYearPercentage)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {state.lastUpdated ? (
              <p className="strategic-card__timestamp">
                Last refreshed{' '}
                <time dateTime={state.lastUpdated}>
                  {new Date(state.lastUpdated).toLocaleString()}
                </time>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default StrategicQuarterComparisonChart;
