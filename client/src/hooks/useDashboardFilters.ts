import { useMemo } from 'react';
import type { DashboardFilterParams } from '@/types/dashboard';
import { useIncidentTableData } from './useIncidentTableData';

export const useDashboardFilters = (): DashboardFilterParams => {
  const { filters } = useIncidentTableData();
  const { typeCodes, severityCodes, statusCodes, startDate, endDate, incidentNumber, isActive } =
    filters;

  return useMemo(
    () => ({
      typeCodes,
      severityCodes,
      statusCodes,
      startDate,
      endDate,
      incidentNumber,
      isActive,
    }),
    [typeCodes, severityCodes, statusCodes, startDate, endDate, incidentNumber, isActive]
  );
};
