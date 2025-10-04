export interface DashboardKpi {
  id: string;
  label: string;
  value: number | null;
  unit?: string | null;
  delta?: number | null;
}

export interface DashboardDistributionDatum {
  id: string;
  label: string;
  value: number;
}

export interface DashboardTrendPoint {
  date: string;
  count: number;
}

export interface DashboardSummary {
  kpis: DashboardKpi[];
  typeDistribution: DashboardDistributionDatum[];
  severityDistribution: DashboardDistributionDatum[];
  dailyTrend: DashboardTrendPoint[];
  generatedAt?: string;
}

export interface DashboardRecentIncident {
  incidentNumber: string;
  title: string;
  severity: {
    code: string;
    name: string;
  };
  status: {
    code: string;
    name: string;
  };
  reportedAt: string;
}

export interface DashboardFilterParams {
  typeCodes?: string[];
  severityCodes?: string[];
  statusCodes?: string[];
  startDate?: string;
  endDate?: string;
  incidentNumber?: string;
  isActive?: boolean;
}
