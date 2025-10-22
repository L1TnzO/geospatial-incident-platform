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
};
