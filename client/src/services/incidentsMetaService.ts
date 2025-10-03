import type { IncidentMetadata } from '@/types/incidents';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const METADATA_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: IncidentMetadata;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
let inflight: Promise<IncidentMetadata> | null = null;

const buildMetaUrl = (): string => {
  const normalizedBase = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/$/, '')
    : `${window.location.origin}${API_BASE_URL.replace(/\/$/, '')}`;

  return `${normalizedBase}/incidents/meta`;
};

export interface FetchIncidentMetadataOptions {
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

export const fetchIncidentMetadata = async (
  options: FetchIncidentMetadataOptions = {}
): Promise<IncidentMetadata> => {
  const { signal, forceRefresh = false } = options;
  const now = Date.now();

  if (!forceRefresh && cache && cache.expiresAt > now) {
    return cache.value;
  }

  if (!forceRefresh && inflight) {
    return inflight;
  }

  const metaUrl = buildMetaUrl();
  const request = fetch(metaUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
    credentials: 'same-origin',
  })
    .then(async (response) => {
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Failed to load incidents metadata (${response.status})`);
      }

      const metadata = (await response.json()) as IncidentMetadata;
      cache = {
        value: metadata,
        expiresAt: Date.now() + METADATA_CACHE_TTL_MS,
      };
      return metadata;
    })
    .finally(() => {
      inflight = null;
    });

  inflight = request;
  return request;
};

export const clearIncidentMetadataCache = () => {
  cache = null;
  inflight = null;
};
