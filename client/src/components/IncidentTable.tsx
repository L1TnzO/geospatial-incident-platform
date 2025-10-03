import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useIncidentTableData } from '@/hooks/useIncidentTableData';

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

const BASE_SEVERITY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'CRITICAL', label: 'Critical' },
  { code: 'MODERATE', label: 'Moderate' },
  { code: 'LOW', label: 'Low' },
];

const BASE_STATUS_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'REPORTED', label: 'Reported' },
  { code: 'DISPATCHED', label: 'Dispatched' },
  { code: 'ON_SCENE', label: 'On Scene' },
  { code: 'RESOLVED', label: 'Resolved' },
];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const summaryDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

const formatDateTime = (isoString: string): string => {
  if (!isoString) {
    return '—';
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return dateFormatter.format(date);
};

const toDateInputValue = (isoString: string | undefined): string => {
  if (!isoString) {
    return '';
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
};

const toStartOfDayIso = (dateValue: string): string | undefined => {
  if (!dateValue) {
    return undefined;
  }
  return `${dateValue}T00:00:00.000Z`;
};

const toEndOfDayIso = (dateValue: string): string | undefined => {
  if (!dateValue) {
    return undefined;
  }
  return `${dateValue}T23:59:59.999Z`;
};

const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((value, index) => value === sortedB[index]);
};

interface FilterOption {
  code: string;
  label: string;
}

const sortOptions = (options: FilterOption[]): FilterOption[] =>
  [...options].sort((a, b) => a.label.localeCompare(b.label));

const formatDateSummary = (startIso?: string, endIso?: string): string | undefined => {
  if (startIso && endIso) {
    return `Dates: ${summaryDateFormatter.format(new Date(startIso))} – ${summaryDateFormatter.format(
      new Date(endIso)
    )}`;
  }

  if (startIso) {
    return `Start date: ${summaryDateFormatter.format(new Date(startIso))}`;
  }

  if (endIso) {
    return `End date: ${summaryDateFormatter.format(new Date(endIso))}`;
  }

  return undefined;
};

const IncidentTable = () => {
  const {
    rows,
    isLoading,
    isError,
    error,
    refresh,
    filters,
    remainder,
    total,
    totalPages,
    nextPage,
    previousPage,
    setPage,
    setPageSize,
    setFilters,
    lastUpdated,
  } = useIncidentTableData();

  const severityOptions = useMemo(() => {
    const map = new Map<string, string>();
    BASE_SEVERITY_OPTIONS.forEach((option) => map.set(option.code, option.label));
    rows.forEach((incident) => map.set(incident.severity.code, incident.severity.name));

    return sortOptions(Array.from(map.entries()).map(([code, label]) => ({ code, label })));
  }, [rows]);

  const statusOptions = useMemo(() => {
    const map = new Map<string, string>();
    BASE_STATUS_OPTIONS.forEach((option) => map.set(option.code, option.label));
    rows.forEach((incident) => map.set(incident.status.code, incident.status.name));

    return sortOptions(Array.from(map.entries()).map(([code, label]) => ({ code, label })));
  }, [rows]);

  const severityLabelMap = useMemo(
    () => new Map(severityOptions.map((option) => [option.code, option.label])),
    [severityOptions]
  );

  const statusLabelMap = useMemo(
    () => new Map(statusOptions.map((option) => [option.code, option.label])),
    [statusOptions]
  );

  const [severityDraft, setSeverityDraft] = useState<string[]>(() => filters.severityCodes ?? []);
  const [statusDraft, setStatusDraft] = useState<string[]>(() => filters.statusCodes ?? []);
  const [startDateDraft, setStartDateDraft] = useState<string>(() =>
    toDateInputValue(filters.startDate)
  );
  const [endDateDraft, setEndDateDraft] = useState<string>(() => toDateInputValue(filters.endDate));

  useEffect(() => {
    const next = filters.severityCodes ?? [];
    setSeverityDraft((current) => (arraysEqual(current, next) ? current : next));
  }, [filters.severityCodes]);

  useEffect(() => {
    const next = filters.statusCodes ?? [];
    setStatusDraft((current) => (arraysEqual(current, next) ? current : next));
  }, [filters.statusCodes]);

  useEffect(() => {
    const next = toDateInputValue(filters.startDate);
    setStartDateDraft((current) => (current === next ? current : next));
  }, [filters.startDate]);

  useEffect(() => {
    const next = toDateInputValue(filters.endDate);
    setEndDateDraft((current) => (current === next ? current : next));
  }, [filters.endDate]);

  const handleSeverityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = event.target;
    setSeverityDraft((current) => {
      if (checked) {
        return [...new Set([...current, value])];
      }
      return current.filter((code) => code !== value);
    });
  };

  const handleStatusChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { checked, value } = event.target;
    setStatusDraft((current) => {
      if (checked) {
        return [...new Set([...current, value])];
      }
      return current.filter((code) => code !== value);
    });
  };

  const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStartDateDraft(event.target.value);
  };

  const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setEndDateDraft(event.target.value);
  };

  const handlePageSizeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = Number.parseInt(event.target.value, 10);
    if (!Number.isNaN(value)) {
      setPageSize(value);
    }
  };

  const handleNextPage = () => {
    if (nextPage !== null && !isLoading) {
      setPage(nextPage);
    }
  };

  const handlePreviousPage = () => {
    if (previousPage !== null && !isLoading) {
      setPage(previousPage);
    }
  };

  const startDateIsoDraft = toStartOfDayIso(startDateDraft);
  const endDateIsoDraft = toEndOfDayIso(endDateDraft);

  const isDateRangeInvalid = Boolean(
    startDateDraft && endDateDraft && startDateDraft > endDateDraft
  );

  const isDirty =
    !arraysEqual(severityDraft, filters.severityCodes ?? []) ||
    !arraysEqual(statusDraft, filters.statusCodes ?? []) ||
    (startDateIsoDraft ?? '') !== (filters.startDate ?? '') ||
    (endDateIsoDraft ?? '') !== (filters.endDate ?? '');

  const hasActiveFilters = Boolean(
    (filters.severityCodes && filters.severityCodes.length > 0) ||
      (filters.statusCodes && filters.statusCodes.length > 0) ||
      filters.startDate ||
      filters.endDate
  );

  const applyFilters = () => {
    if (isDateRangeInvalid) {
      return;
    }

    setFilters({
      severityCodes: severityDraft.length ? severityDraft : undefined,
      statusCodes: statusDraft.length ? statusDraft : undefined,
      startDate: startDateIsoDraft,
      endDate: endDateIsoDraft,
    });
  };

  const clearFilters = () => {
    setSeverityDraft([]);
    setStatusDraft([]);
    setStartDateDraft('');
    setEndDateDraft('');
    setFilters({
      severityCodes: undefined,
      statusCodes: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const currentPage = filters.page ?? 1;
  const currentPageSize = filters.pageSize ?? PAGE_SIZE_OPTIONS[0];

  const pageStartIndex = rows.length > 0 ? (currentPage - 1) * currentPageSize + 1 : 0;
  const pageEndIndex = rows.length > 0 ? pageStartIndex + rows.length - 1 : 0;
  const rangeText =
    rows.length > 0 ? `${pageStartIndex.toLocaleString()}-${pageEndIndex.toLocaleString()}` : '0-0';

  const totalMeta =
    total > 0
      ? `Showing ${rangeText} of ${total.toLocaleString()} incidents${
          remainder > 0 ? ` (+${remainder.toLocaleString()} more)` : ''
        }`
      : 'No incidents loaded yet.';

  const resolvedTotalPages = totalPages > 0 ? totalPages : 1;

  const isApplyDisabled = isLoading || isDateRangeInvalid || !isDirty;
  const isClearDisabled = isLoading || !hasActiveFilters;

  const severitySummary = filters.severityCodes?.length
    ? `Severity: ${filters.severityCodes
        .map((code) => severityLabelMap.get(code) ?? code)
        .join(', ')}`
    : undefined;

  const statusSummary = filters.statusCodes?.length
    ? `Status: ${filters.statusCodes.map((code) => statusLabelMap.get(code) ?? code).join(', ')}`
    : undefined;

  const dateSummary = formatDateSummary(filters.startDate, filters.endDate);

  const filterSummaries = [severitySummary, statusSummary, dateSummary].filter(Boolean) as string[];

  return (
    <section className="map-card incident-table-card" aria-label="Incidents table">
      <header className="incident-table-card__header">
        <div className="incident-table-card__heading">
          <h2 className="incident-table-card__title">Incident Table</h2>
          <p className="incident-table-card__subtitle">
            Filter and browse recent incidents alongside the operations map. Additional analytics
            will continue to roll out in upcoming milestones.
          </p>
        </div>
        <div className="incident-table-card__meta" aria-live="polite">
          <span>{totalMeta}</span>
          {lastUpdated && (
            <span className="incident-table-card__updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      <div className="incident-table-card__filters" aria-label="Incident filters">
        <div className="incident-table-card__filter-groups">
          <fieldset className="incident-table-card__filter-group">
            <legend>Severity</legend>
            <div className="incident-table-card__filter-list">
              {severityOptions.map((option) => (
                <label key={option.code} className="incident-table-card__filter-option">
                  <input
                    type="checkbox"
                    value={option.code}
                    checked={severityDraft.includes(option.code)}
                    onChange={handleSeverityChange}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="incident-table-card__filter-group">
            <legend>Status</legend>
            <div className="incident-table-card__filter-list">
              {statusOptions.map((option) => (
                <label key={option.code} className="incident-table-card__filter-option">
                  <input
                    type="checkbox"
                    value={option.code}
                    checked={statusDraft.includes(option.code)}
                    onChange={handleStatusChange}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="incident-table-card__filter-group incident-table-card__filter-group--dates">
            <fieldset className="incident-table-card__date-fields">
              <legend>Occurrence date</legend>
              <label htmlFor="incident-table-start-date">Start</label>
              <input
                id="incident-table-start-date"
                type="date"
                value={startDateDraft}
                onChange={handleStartDateChange}
              />
              <label htmlFor="incident-table-end-date">End</label>
              <input
                id="incident-table-end-date"
                type="date"
                value={endDateDraft}
                onChange={handleEndDateChange}
              />
            </fieldset>
          </div>
        </div>

        <div className="incident-table-card__filter-actions">
          <div className="incident-table-card__filter-summary" aria-live="polite">
            {filterSummaries.length > 0 ? (
              <ul className="incident-table-card__chip-list">
                {filterSummaries.map((summary) => (
                  <li key={summary} className="incident-table-card__chip">
                    {summary}
                  </li>
                ))}
              </ul>
            ) : (
              <span>No filters applied.</span>
            )}
          </div>
          <div className="incident-table-card__filter-buttons">
            {isDateRangeInvalid && (
              <p className="incident-table-card__filter-error" role="alert">
                Start date must be before end date.
              </p>
            )}
            <div className="incident-table-card__filter-button-row">
              <button
                type="button"
                className="incident-table-card__filter-button incident-table-card__filter-button--primary"
                onClick={applyFilters}
                disabled={isApplyDisabled}
              >
                Apply filters
              </button>
              <button
                type="button"
                className="incident-table-card__filter-button incident-table-card__filter-button--ghost"
                onClick={clearFilters}
                disabled={isClearDisabled}
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="incident-table-card__content">
        {isLoading && (
          <div
            className="incident-table-card__status incident-table-card__status--loading"
            role="status"
            aria-live="polite"
          >
            Loading incidents…
          </div>
        )}

        {!isLoading && isError && (
          <div
            className="incident-table-card__status incident-table-card__status--error"
            role="alert"
          >
            <p>{error ?? 'Something went wrong while loading incidents.'}</p>
            <button type="button" className="incident-table-card__retry" onClick={refresh}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="incident-table-card__status incident-table-card__status--empty">
            No incidents to display right now.
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <div className="incident-table-card__table-wrapper">
            <table className="incident-table" role="table">
              <thead>
                <tr>
                  <th scope="col">Incident #</th>
                  <th scope="col">Title</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col">Reported</th>
                  <th scope="col">Primary Station</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((incident) => {
                  const severityColor = incident.severity.colorHex || '#1f2937';
                  return (
                    <tr key={incident.incidentNumber}>
                      <td data-label="Incident #">{incident.incidentNumber}</td>
                      <td data-label="Title">{incident.title}</td>
                      <td data-label="Severity">
                        <span
                          className="incident-table__severity"
                          style={{ backgroundColor: severityColor }}
                        >
                          {incident.severity.name}
                        </span>
                      </td>
                      <td data-label="Status">{incident.status.name}</td>
                      <td data-label="Reported">{formatDateTime(incident.reportedAt)}</td>
                      <td data-label="Primary Station">{incident.primaryStation?.name ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <footer className="incident-table-card__footer">
        <div className="incident-table-card__pagination" aria-live="polite">
          <button
            type="button"
            className="incident-table-card__page-button"
            onClick={handlePreviousPage}
            disabled={isLoading || previousPage === null}
          >
            Previous
          </button>
          <span className="incident-table-card__page-indicator">
            Page {currentPage.toLocaleString()} of {resolvedTotalPages.toLocaleString()}
          </span>
          <button
            type="button"
            className="incident-table-card__page-button"
            onClick={handleNextPage}
            disabled={isLoading || nextPage === null}
          >
            Next
          </button>
        </div>
        <div className="incident-table-card__page-size">
          <label htmlFor="incident-table-page-size">Page size</label>
          <select
            id="incident-table-page-size"
            value={String(currentPageSize)}
            onChange={handlePageSizeChange}
            disabled={isLoading}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={String(size)}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </footer>
    </section>
  );
};

export default IncidentTable;
