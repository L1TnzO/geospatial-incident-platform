import { useCallback, useId, useMemo } from 'react';
import type {
  StrategicTypeTimelinesState,
  StrategicTypeTrendPoint,
} from '@/hooks/useStrategicTypeTimelines';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 320;
const CHART_PADDING_X = 48;
const CHART_PADDING_Y = 40;

interface StrategicTypeTrendExplorerProps {
  state: StrategicTypeTimelinesState;
}

interface ChartPoint extends StrategicTypeTrendPoint {
  x: number;
  y: number;
}

interface ChartData {
  actual: ChartPoint[];
  movingAverage: ChartPoint[];
  min: number;
  max: number;
}

const buildDisplayValue = (value: number | null | undefined, fractionDigits = 1) => {
  if (value === null || value === undefined) {
    return '—';
  }
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatDelta = (value: number | null, fractionDigits = 1) => {
  if (value === null) {
    return 'n/a';
  }
  const rounded = value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${value >= 0 ? '+' : ''}${rounded}`;
};

const StrategicTypeTrendExplorer = ({ state }: StrategicTypeTrendExplorerProps) => {
  const selectId = useId();
  const windowGroupId = useId();

  const hasData = state.selectedSeries.length > 0;
  const viewingLabel = state.selectedTypeName ?? 'All incident types';

  const formatPointLabel = useCallback((point: StrategicTypeTrendPoint) => {
    return new Date(point.start).toLocaleString(undefined, {
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const chartData = useMemo<ChartData>(() => {
    if (!hasData) {
      return {
        actual: [],
        movingAverage: [],
        min: 0,
        max: 0,
      };
    }

    const actual = [...state.selectedSeries].sort(
      (a, b) => Date.parse(a.start) - Date.parse(b.start)
    );
    const movingAverage = [...state.movingAverageSeries].sort(
      (a, b) => Date.parse(a.start) - Date.parse(b.start)
    );

    const allValues = [
      ...actual.map((point) => point.count),
      ...movingAverage
        .map((point) => point.movingAverage)
        .filter((value): value is number => value !== undefined && value !== null),
    ];

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    const valueRange = max === min ? 1 : max - min;
    const usableWidth = CHART_WIDTH - CHART_PADDING_X * 2;
    const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;
    const pointCount = Math.max(actual.length - 1, 1);

    const projectPoint = (value: number) =>
      CHART_PADDING_Y + (1 - (value - min) / valueRange) * usableHeight;

    const actualPoints: ChartPoint[] = actual.map((point, index) => ({
      ...point,
      x: CHART_PADDING_X + (index / pointCount) * usableWidth,
      y: projectPoint(point.count),
    }));

    const movingAveragePoints: ChartPoint[] = movingAverage.map((point, index) => ({
      ...point,
      x: CHART_PADDING_X + (index / pointCount) * usableWidth,
      y: projectPoint(point.movingAverage ?? point.count),
    }));

    return {
      actual: actualPoints,
      movingAverage: movingAveragePoints,
      min,
      max,
    };
  }, [hasData, state.movingAverageSeries, state.selectedSeries]);

  const actualPath = useMemo(() => {
    if (chartData.actual.length === 0) {
      return '';
    }
    return chartData.actual
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }, [chartData.actual]);

  const movingAveragePath = useMemo(() => {
    if (chartData.movingAverage.length === 0) {
      return '';
    }
    return chartData.movingAverage
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }, [chartData.movingAverage]);

  const areaPath = useMemo(() => {
    if (chartData.actual.length === 0) {
      return '';
    }
    const baseline = CHART_HEIGHT - CHART_PADDING_Y;
    return [
      `M ${chartData.actual[0].x} ${baseline}`,
      `L ${chartData.actual[0].x} ${chartData.actual[0].y}`,
      ...chartData.actual.slice(1).map((point) => `L ${point.x} ${point.y}`),
      `L ${chartData.actual[chartData.actual.length - 1].x} ${baseline}`,
      'Z',
    ].join(' ');
  }, [chartData.actual]);

  const latestPoint = chartData.actual.at(-1);

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    state.setSelectedTypeCode(value === 'all' ? null : value);
  };

  const handleWindowChange = (window: number) => {
    state.setMovingAverageWindow(window);
  };

  return (
    <article
      className="strategic-card strategic-type-explorer"
      aria-busy={state.isLoading}
      aria-labelledby={`${selectId}-title`}
    >
      <header className="strategic-card__header">
        <div>
          <h3 id={`${selectId}-title`}>Type trend explorer</h3>
          <p className="strategic-card__subtitle">
            Drill into historical counts for a specific incident type and compare to a
            moving-average overlay. Selecting a type updates shared filters for maps, tables, and
            other analytics.
          </p>
          <p className="strategic-type-explorer__selected">
            Viewing: <strong>{viewingLabel}</strong>
          </p>
        </div>
        <div className="strategic-type-explorer__actions">
          <label htmlFor={selectId} className="strategic-type-explorer__selector">
            <span>Select type</span>
            <select
              id={selectId}
              value={state.selectedTypeCode ?? 'all'}
              onChange={handleTypeChange}
              disabled={state.isLoading}
            >
              <option value="all">All incident types</option>
              {state.availableTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.name ?? type.code}
                </option>
              ))}
            </select>
          </label>
          <div
            className="strategic-type-explorer__windows"
            role="group"
            aria-labelledby={windowGroupId}
          >
            <span id={windowGroupId} className="visually-hidden">
              Moving average window
            </span>
            {state.availableWindows.map((window) => (
              <button
                key={window}
                type="button"
                aria-pressed={state.movingAverageWindow === window}
                onClick={() => handleWindowChange(window)}
              >
                {window}d
              </button>
            ))}
          </div>
          <button type="button" className="strategic-card__refresh" onClick={state.refresh}>
            Refresh
          </button>
        </div>
      </header>
      <div className="strategic-card__body">
        {state.isLoading || state.isIdle ? (
          <p className="strategic-card__status" role="status">
            Loading type timelines…
          </p>
        ) : null}
        {state.isError ? (
          <p className="strategic-card__status strategic-card__status--error" role="alert">
            {state.error ?? 'Unable to load incident type timelines.'}
          </p>
        ) : null}
        {state.isSuccess ? (
          <div className="strategic-card__content strategic-type-explorer__content">
            {hasData ? (
              <figure
                className="strategic-type-explorer__chart"
                role="figure"
                aria-label="Incident counts and moving average for the selected type"
              >
                <svg
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  role="presentation"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="strategicTypeActual" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.35)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                    </linearGradient>
                  </defs>
                  {areaPath && <path d={areaPath} fill="url(#strategicTypeActual)" />}
                  {actualPath && (
                    <path
                      d={actualPath}
                      fill="none"
                      stroke="rgba(59, 130, 246, 0.95)"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  )}
                  {movingAveragePath && (
                    <path
                      d={movingAveragePath}
                      fill="none"
                      stroke="rgba(248, 113, 113, 0.95)"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray="6 4"
                    />
                  )}
                  {chartData.actual.map((point) => (
                    <g key={`actual-${point.month}`} className="strategic-type-explorer__point">
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={latestPoint && point.month === latestPoint.month ? 6 : 4}
                        className={
                          latestPoint && point.month === latestPoint.month
                            ? 'strategic-type-explorer__point--latest'
                            : undefined
                        }
                      />
                      <title>
                        {formatPointLabel(point)}: {point.count.toLocaleString()} incidents
                      </title>
                    </g>
                  ))}
                  {chartData.movingAverage.map((point) => (
                    <g
                      key={`avg-${point.month}`}
                      className="strategic-type-explorer__point strategic-type-explorer__point--average"
                    >
                      <circle cx={point.x} cy={point.y} r={3} />
                      <title>
                        {formatPointLabel(point)}: Moving average{' '}
                        {point.movingAverage?.toLocaleString(undefined, {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        }) ?? 'n/a'}
                      </title>
                    </g>
                  ))}
                </svg>
                <figcaption className="strategic-type-explorer__legend">
                  <span className="strategic-type-explorer__legend-item strategic-type-explorer__legend-item--actual">
                    ● Incident count
                  </span>
                  <span className="strategic-type-explorer__legend-item strategic-type-explorer__legend-item--average">
                    ● Moving average
                  </span>
                </figcaption>
              </figure>
            ) : (
              <p className="strategic-card__status" role="status">
                Incident timelines will appear once data becomes available for the selected type and
                window.
              </p>
            )}

            <dl className="strategic-card__metrics strategic-type-explorer__metrics">
              <div>
                <dt>Latest month</dt>
                <dd>{buildDisplayValue(state.summary.latestCount, 0)} incidents</dd>
              </div>
              <div>
                <dt>Change vs previous</dt>
                <dd>
                  {formatDelta(state.summary.change, 0)} incidents
                  {state.summary.changePercentage !== null
                    ? ` (${formatDelta(state.summary.changePercentage)}%)`
                    : ''}
                </dd>
              </div>
              <div>
                <dt>Moving average</dt>
                <dd>
                  {buildDisplayValue(state.summary.movingAverage)} incidents ·{' '}
                  {state.movingAverageWindow}d
                </dd>
              </div>
              <div>
                <dt>Moving average delta</dt>
                <dd>
                  {formatDelta(state.summary.movingAverageDelta)}
                  {state.summary.movingAveragePercentage !== null
                    ? ` (${formatDelta(state.summary.movingAveragePercentage)}%)`
                    : ''}
                </dd>
              </div>
            </dl>

            <div className="strategic-type-explorer__recent">
              <h4>Recent points</h4>
              <ul>
                {state.selectedSeries.slice(-4).map((point) => (
                  <li key={point.month}>
                    <span className="strategic-type-explorer__recent-month">
                      {formatPointLabel(point)}
                    </span>
                    <span className="strategic-type-explorer__recent-count">
                      {point.count.toLocaleString()} incidents
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

export default StrategicTypeTrendExplorer;
