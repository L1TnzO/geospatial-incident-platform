import type { IncidentDetail } from '@/types/incidents';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const buildDetailUrl = (incidentNumber: string): string => {
  const normalizedBase = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/$/, '')
    : `${window.location.origin}${API_BASE_URL.replace(/\/$/, '')}`;

  const normalizedNumber = encodeURIComponent(incidentNumber.trim());
  const url = new URL(`${normalizedBase}/incidents/${normalizedNumber}`);
  return url.toString();
};

export const fetchIncidentDetail = async (
  incidentNumber: string,
  signal?: AbortSignal
): Promise<IncidentDetail> => {
  if (!incidentNumber?.trim()) {
    throw new Error('Incident number is required');
  }

  const response = await fetch(buildDetailUrl(incidentNumber), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    const message = `Failed to load incident detail (${response.status})`;
    throw new Error(message);
  }

  const detail = (await response.json()) as IncidentDetail;
  return detail;
};
