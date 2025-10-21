import type {
  IncidentListItem,
  IncidentListResponse,
  IncidentMetadata,
} from '../types/api/incidents';
import type { Incident } from '../types';
import { apiClient, type FetchIncidentsParams } from './api-client';

export const listIncidents = async (
  options?: FetchIncidentsParams,
): Promise<IncidentListResponse> => apiClient.incidents.list(options);

export const getIncidentMetadata = async (): Promise<IncidentMetadata> =>
  apiClient.incidents.metadata();

const extractCoordinates = (incident: IncidentListItem) => {
  const coordinates = incident.location.geometry?.coordinates;
  if (!coordinates || coordinates.length < 2) {
    return undefined;
  }

  const [lng, lat] = coordinates;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return undefined;
  }

  return { lat, lng };
};

const resolveAddress = (incident: IncidentListItem) => {
  const properties = incident.location.properties as Record<string, unknown> | undefined;
  if (!properties) {
    return undefined;
  }

  const candidates = [
    properties.label,
    properties.name,
    properties.address,
    properties.addressLine,
    properties.formatted,
    properties.description,
  ];

  const value = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.length > 0,
  );
  return (value as string | undefined) ?? undefined;
};

export const mapIncidentToUi = (incident: IncidentListItem): Incident | null => {
  const coordinates = extractCoordinates(incident);
  if (!coordinates) {
    return null;
  }

  return {
    id: incident.incidentNumber,
    type: incident.type.name,
    severity: incident.severity.name,
    severityColor: incident.severity.colorHex,
    severityCode: incident.severity.code,
    date: incident.reportedAt,
    timestamp: incident.reportedAt,
    reportedAt: incident.reportedAt,
    occurrenceAt: incident.occurrenceAt,
    location: {
      lat: coordinates.lat,
      lng: coordinates.lng,
      address: resolveAddress(incident) ?? 'Location unavailable',
    },
    description: incident.title,
    responseTime: undefined,
    status: incident.status.name,
    zoneId: incident.primaryStation?.stationCode ?? undefined,
    isActive: incident.isActive,
  };
};
