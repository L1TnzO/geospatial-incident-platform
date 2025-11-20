import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../services/query-keys';

interface UseReverseGeocodeOptions {
  lat?: number;
  lng?: number;
  enabled?: boolean;
}

interface ReverseGeocodeAddress {
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  country?: string;
}

interface ReverseGeocodeResponse {
  display_name?: string;
  address?: ReverseGeocodeAddress;
}

const buildShortLabel = (address?: ReverseGeocodeAddress) => {
  if (!address) {
    return '';
  }

  const firstLevel =
    address.road || address.pedestrian || address.neighbourhood || address.suburb || '';
  const cityLevel =
    address.city || address.town || address.village || address.municipality || address.county || '';
  const regionLevel = address.state || address.region || address.country || '';

  return [firstLevel, cityLevel, regionLevel].filter(Boolean).join(', ');
};

export const useReverseGeocode = ({ lat, lng, enabled = true }: UseReverseGeocodeOptions) =>
  useQuery<{ displayName: string; shortLabel: string } | null, Error>({
    queryKey: queryKeys.location.reverseGeocode(lat, lng),
    queryFn: async ({ signal }) => {
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return null;
      }

      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', lat.toString());
      url.searchParams.set('lon', lng.toString());
      url.searchParams.set('zoom', '16');
      url.searchParams.set('addressdetails', '1');

      const response = await fetch(url.toString(), {
        signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('No pudimos resolver la ubicación');
      }

      const data = (await response.json()) as ReverseGeocodeResponse;
      const shortLabel = buildShortLabel(data.address);

      return {
        displayName: data.display_name ?? shortLabel ?? '',
        shortLabel: shortLabel || data.display_name || '',
      };
    },
    enabled: Boolean(enabled && typeof lat === 'number' && typeof lng === 'number'),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
