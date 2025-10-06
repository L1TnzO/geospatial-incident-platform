import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { StrategicMonthlyTrendsState } from '@/hooks/useStrategicMonthlyTrends';
import { triggerBrowserDownload } from '@/utils/download';
import type { StrategicMonthlyTrendPoint } from '@/types/strategic';

const formatNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '—';
  }
  return value.toLocaleString();
};

const renderChange = (delta: number | null, percentage: number | null) => {
  if (delta === null && percentage === null) {
    return 'Change data unavailable';
  }

  const pieces: string[] = [];
  if (delta !== null) {
    const sign = delta > 0 ? '+' : '';
    pieces.push(`${sign}${delta.toLocaleString()} incidents`);
  }
  if (percentage !== null) {
    const sign = percentage > 0 ? '+' : '';
    const rounded = Math.abs(percentage) < 1 ? percentage.toFixed(2) : percentage.toFixed(1);
    pieces.push(`${sign}${rounded}%`);
  }
  return pieces.join(' • ');
};

const CHART_WIDTH = 640;
const CHART_HEIGHT = 320;
const CHART_PADDING_X = 48;
const CHART_PADDING_Y = 40;
const DEFAULT_FILENAME_PREFIX = 'strategic-monthly-trend';

interface StrategicMonthlyTrendCardProps {
  state: StrategicMonthlyTrendsState;
}

const StrategicMonthlyTrendCard = ({ state }: StrategicMonthlyTrendCardProps) => {
  const titleId = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const handleRefresh = () => {
    state.refresh();
  };

  const handleTimeframeChange = (months: number) => {
    state.setTimeframe(months);
  };

  const latestPoint = state.data?.series.at(-1) ?? null;
  const hasData = Boolean(state.data && state.data.series.length > 0);

  const timeline = useMemo(() => {
    const series = state.data?.series ?? [];
    if (series.length === 0) {
      return {
        current: [] as Array<StrategicMonthlyTrendPoint & { x: number; y: number }>,
        previous: [] as Array<{
          month: string;
          label: string;
          count: number;
          x: number;
          y: number;
        }>,
        min: 0,
        max: 0,
      };
    }

    const allValues = series.flatMap((point) =>
      [point.count, point.previousYearCount].filter((value): value is number => value !== null)
    );
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue === minValue ? 1 : maxValue - minValue;

    const usableWidth = CHART_WIDTH - CHART_PADDING_X * 2;
    const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
    const pointCount = Math.max(series.length - 1, 1);

    const projectY = (value: number) =>
      CHART_PADDING_Y + (1 - (value - minValue) / valueRange) * usableHeight;

    const currentPoints = series.map((point, index) => ({
      ...point,
      x: CHART_PADDING_X + (index / pointCount) * usableWidth,
      y: projectY(point.count),
    }));

    const previousPoints = series
      .map((point, index) =>
        point.previousYearCount === null
          ? null
          : {
              month: point.month,
              label: point.label,
              count: point.previousYearCount,
              x: CHART_PADDING_X + (index / pointCount) * usableWidth,
              y: projectY(point.previousYearCount),
            }
      )
      .filter(
        (value): value is { month: string; label: string; count: number; x: number; y: number } =>
          value !== null
      );

    return {
      current: currentPoints,
      previous: previousPoints,
      min: minValue,
      max: maxValue,
    };
  }, [state.data]);

  const currentPath = useMemo(() => {
    if (timeline.current.length === 0) {
      return '';
    }
    return timeline.current
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }, [timeline]);

  const previousPath = useMemo(() => {
    if (timeline.previous.length === 0) {
      return '';
    }
    return timeline.previous
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }, [timeline]);

  const areaPath = useMemo(() => {
    if (timeline.current.length === 0) {
      return '';
    }
    const baseLine = CHART_HEIGHT - CHART_PADDING_Y;
    return [
      `M ${timeline.current[0].x} ${baseLine}`,
      `L ${timeline.current[0].x} ${timeline.current[0].y}`,
      ...timeline.current.slice(1).map((point) => `L ${point.x} ${point.y}`),
      `L ${timeline.current[timeline.current.length - 1].x} ${baseLine}`,
      'Z',
    ].join(' ');
  }, [timeline]);

  const handleExportCsv = useCallback(() => {
    if (!state.data) {
      return;
    }

    const header =
      'month,label,current_count,previous_year_count,year_over_year_delta,year_over_year_percentage';
    const rows = state.data.series.map((point) => [
      point.month,
      point.label,
      point.count.toString(),
      point.previousYearCount ?? '',
      point.yearOverYearDelta ?? '',
      point.yearOverYearPercentage ?? '',
    ]);

    const csv = [header, ...rows.map((columns) => columns.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const filename = `${DEFAULT_FILENAME_PREFIX}-${state.timeframe}m.csv`;
    triggerBrowserDownload(blob, filename);
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
            triggerBrowserDownload(blob, `${DEFAULT_FILENAME_PREFIX}-${state.timeframe}m.png`);
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
    () => `${state.timeframe} month${state.timeframe === 1 ? '' : 's'}`,
    [state.timeframe]
  );
  const highlight = state.data?.series.slice(-3) ?? [];

  return (
    <article
      className="strategic-card strategic-monthly-trend"
      aria-busy={state.isLoading}
      aria-labelledby={titleId}
    >
      <header className="strategic-card__header">
        <div>
          <h3 id={titleId}>Monthly trendline</h3>
          <p className="strategic-card__subtitle">
            {timeframeLabel} · Current vs previous year incident totals. Select a timeframe to
            explore trends and export snapshots for offline analysis.
          </p>
        </div>
        <div className="strategic-monthly-trend__actions">
          <div className="strategic-monthly-trend__timeframes" role="group" aria-label="Timeframe">
            {state.availableTimeframes.map((months) => (
              <button
                key={months}
                type="button"
                className="strategic-monthly-trend__timeframe"
                aria-pressed={state.timeframe === months}
                onClick={() => handleTimeframeChange(months)}
              >
                {months}m
              </button>
            ))}
          </div>
          <div className="strategic-monthly-trend__export">
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
            Loading monthly trend data…
          </p>
        ) : null}
        {state.isError ? (
          <div className="strategic-card__status" role="alert">
            <p>{state.error ?? 'Unable to load monthly trends.'}</p>
            <button type="button" onClick={handleRefresh}>
              Try again
            </button>
          </div>
        ) : null}
        {state.isSuccess && state.data ? (
          <div className="strategic-card__content strategic-monthly-trend__content">
            {hasData ? (
              <figure
                className="strategic-monthly-trend__chart"
                role="figure"
                aria-label="Monthly incident counts compared to previous year"
              >
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  role="presentation"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="strategicMonthlyCurrent" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(79, 70, 229, 0.35)" />
                      <stop offset="100%" stopColor="rgba(79, 70, 229, 0)" />
                    </linearGradient>
                  </defs>
                  {areaPath && <path d={areaPath} fill="url(#strategicMonthlyCurrent)" />}
                  {previousPath && (
                    <path
                      d={previousPath}
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.9)"
                      strokeWidth={2.5}
                      strokeDasharray="6 6"
                    />
                  )}
                  {currentPath && (
                    <path
                      d={currentPath}
                      fill="none"
                      stroke="rgba(79, 70, 229, 0.95)"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  )}
                  {timeline.previous.map((point) => (
                    <g key={`previous-${point.month}`} className="strategic-monthly-trend__point">
                      <circle cx={point.x} cy={point.y} r={4} fill="rgba(71, 85, 105, 0.9)" />
                      <title>
                        {point.label} (previous year): {point.count.toLocaleString()} incidents
                      </title>
                    </g>
                  ))}
                  {timeline.current.map((point, index) => (
                    <g key={`current-${point.month}`} className="strategic-monthly-trend__point">
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={point.month === latestPoint?.month ? 6 : 4}
                        className={
                          point.month === latestPoint?.month
                            ? 'strategic-monthly-trend__point--latest'
                            : undefined
                        }
                      />
                      <title>
                        {point.label}: {point.count.toLocaleString()} incidents
                        {point.yearOverYearDelta !== null
                          ? ` (YoY ${point.yearOverYearDelta >= 0 ? '+' : ''}${point.yearOverYearDelta.toLocaleString()} | ${
                              point.yearOverYearPercentage !== null
                                ? `${point.yearOverYearPercentage.toFixed(1)}%`
                                : 'n/a'
                            })`
                          : ''}
                      </title>
                      {index === timeline.current.length - 1 && (
                        <text
                          className="strategic-monthly-trend__label"
                          x={point.x + 10}
                          y={point.y - 12}
                        >
                          Latest
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
                <figcaption className="strategic-monthly-trend__legend">
                  <span className="strategic-monthly-trend__legend-item strategic-monthly-trend__legend-item--current">
                    ● Current year
                  </span>
                  <span className="strategic-monthly-trend__legend-item strategic-monthly-trend__legend-item--previous">
                    ● Previous year
                  </span>
                </figcaption>
              </figure>
            ) : (
              <p className="strategic-card__status" role="status">
                Monthly trend data is not yet available for the selected timeframe and filters.
              </p>
            )}
            <dl className="strategic-card__metrics">
              <div>
                <dt>Current period total</dt>
                <dd>{formatNumber(state.data.totals.currentPeriodTotal)}</dd>
              </div>
              <div>
                <dt>Previous period total</dt>
                <dd>{formatNumber(state.data.totals.previousPeriodTotal)}</dd>
              </div>
              <div>
                <dt>Change</dt>
                <dd>
                  {renderChange(state.data.totals.periodDelta, state.data.totals.periodPercentage)}
                </dd>
              </div>
            </dl>
            <div className="strategic-card__highlight">
              <h4>Recent months</h4>
              <ul>
                {highlight.map((point) => (
                  <li key={point.month}>
                    <span className="strategic-card__highlight-month">{point.label}</span>
                    <span className="strategic-card__highlight-count">
                      {point.count.toLocaleString()} incidents
                    </span>
                    <span className="strategic-card__highlight-change">
                      {renderChange(point.monthOverMonthDelta, point.monthOverMonthPercentage)}
                    </span>
                    {point.yearOverYearDelta !== null ? (
                      <span className="strategic-monthly-trend__highlight-yoy">
                        YoY {point.yearOverYearDelta >= 0 ? '+' : ''}
                        {point.yearOverYearDelta.toLocaleString()} (
                        {point.yearOverYearPercentage !== null
                          ? `${point.yearOverYearPercentage.toFixed(1)}%`
                          : 'n/a'}
                        )
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
            {state.lastUpdated ? (
              <p className="strategic-card__timestamp">
                Updated at{' '}
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

export default StrategicMonthlyTrendCard;
