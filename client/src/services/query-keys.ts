export const queryKeys = {
  incidents: {
    all: ['incidents'] as const,
    list: (params?: Record<string, unknown>) =>
      ['incidents', 'list', params ? JSON.stringify(params) : 'default'] as const,
    metadata: ['incidents', 'metadata'] as const,
    detail: (incidentNumber: string) => ['incidents', 'detail', incidentNumber] as const,
    search: (incidentNumber?: string) => ['incidents', 'search', incidentNumber ?? ''] as const,
  },
  stations: {
    all: ['stations'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    kpiLast24Hours: (params?: Record<string, unknown>) =>
      ['dashboard', 'kpi-last-24h', params ? JSON.stringify(params) : 'default'] as const,
    typeDistribution: (params?: Record<string, unknown>) =>
      ['dashboard', 'type-distribution', params ? JSON.stringify(params) : 'default'] as const,
    severityDistribution: (params?: Record<string, unknown>) =>
      ['dashboard', 'severity-distribution', params ? JSON.stringify(params) : 'default'] as const,
    dailyTrend: (params?: Record<string, unknown>) =>
      ['dashboard', 'daily-trend', params ? JSON.stringify(params) : 'default'] as const,
    recentIncidents: (params?: Record<string, unknown>) =>
      ['dashboard', 'recent-incidents', params ? JSON.stringify(params) : 'default'] as const,
  },
  strategic: {
    all: ['strategic'] as const,
    monthlyTrends: (params?: Record<string, unknown>) =>
      ['strategic', 'monthly-trends', params ? JSON.stringify(params) : 'default'] as const,
    dailyTrend: (params?: Record<string, unknown>) =>
      ['strategic', 'daily-trend', params ? JSON.stringify(params) : 'default'] as const,
    timeOfDay: (params?: Record<string, unknown>) =>
      ['strategic', 'time-of-day', params ? JSON.stringify(params) : 'default'] as const,
    quarterlyTrends: (params?: Record<string, unknown>) =>
      ['strategic', 'quarterly-trends', params ? JSON.stringify(params) : 'default'] as const,
    typeTimelines: (params?: Record<string, unknown>) =>
      ['strategic', 'type-timelines', params ? JSON.stringify(params) : 'default'] as const,
    hotspots: (params?: Record<string, unknown>) =>
      ['strategic', 'hotspots', params ? JSON.stringify(params) : 'default'] as const,
    coverageBuffers: (params?: Record<string, unknown>) =>
      ['strategic', 'coverage-buffers', params ? JSON.stringify(params) : 'default'] as const,
    responseMetrics: (params?: Record<string, unknown>) =>
      ['strategic', 'response-metrics', params ? JSON.stringify(params) : 'default'] as const,
    priorityScores: (params?: Record<string, unknown>) =>
      ['strategic', 'priority-scores', params ? JSON.stringify(params) : 'default'] as const,
  },
  location: {
    reverseGeocode: (lat?: number, lng?: number) =>
      ['location', 'reverse-geocode', lat ?? null, lng ?? null] as const,
  },
};
