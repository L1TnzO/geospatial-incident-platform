import type { IncidentSearchResult } from '@/types/incidents';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const buildSearchUrl = (incidentNumber: string): string => {
  const normalizedBase = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/$/, '')
    : `${window.location.origin}${API_BASE_URL.replace(/\/$/, '')}`;

  const url = new URL(`${normalizedBase}/incidents/search`);
  url.searchParams.set('incidentNumber', incidentNumber.trim());
  return url.toString();
};

export const searchIncidentByNumber = async (
  incidentNumber: string,
  signal?: AbortSignal
): Promise<IncidentSearchResult> => {
  const normalized = incidentNumber?.trim();
  if (!normalized) {
    throw new Error('Incident number is required.');
  }

  const response = await fetch(buildSearchUrl(normalized), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Incident '${normalized}' was not found.`);
    }

    const message = await response.text();
    throw new Error(message || `Failed to search incident (${response.status})`);
  }

  const result = (await response.json()) as IncidentSearchResult;
  return result;
};
