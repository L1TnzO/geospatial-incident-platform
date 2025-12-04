import type {
  IncidentListResponse,
  IncidentMetadata,
} from '../types/api/incidents';
import { apiClient, type FetchIncidentsParams } from './api-client';
import { mapIncidentToUi, mapIncidentDetailToUi } from '../utils/incident-mapper';

export const listIncidents = async (
  options?: FetchIncidentsParams,
): Promise<IncidentListResponse> => apiClient.incidents.list(options);

export const getIncidentMetadata = async (): Promise<IncidentMetadata> =>
  apiClient.incidents.metadata();

export { mapIncidentToUi, mapIncidentDetailToUi };
