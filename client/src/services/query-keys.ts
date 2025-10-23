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
};
