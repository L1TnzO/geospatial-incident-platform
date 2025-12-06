export interface Incident {
  id: string;
  type: string;
  typeCode?: string;
  severity: string;
  severityCode?: string;
  severityColor?: string;
  date: string;
  timestamp: string;
  reportedAt?: string;
  occurrenceAt?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  description: string;
  responseTime?: number; // in minutes
  status: string;
  statusCode?: string;
  zoneId?: string;
  isActive: boolean;
  narrative?: string | null;
  metadata?: Record<string, unknown>;
  units?: IncidentUnitSummary[];
  assets?: IncidentAssetSummary[];
  notes?: IncidentNoteSummary[];
}

export interface LiteIncident {
  id: string;
  type: string;
  typeCode?: string;
  severity: string;
  severityCode?: string;
  severityColor?: string;
  date: string;
  timestamp: string;
  reportedAt?: string;
  occurrenceAt?: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: string;
  statusCode?: string;
  isActive: boolean;
  description: string;
  // Excluded: narrative, metadata, units, assets, notes, history
}

export interface FireStation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    location: {
      lat: number;
      lng: number;
    };
  }

export interface ObsoleteInfrastructure {
  id: string;
  description: string;
  status: string;
  location: {
    lat: number;
    lng: number;
  };
  incidentNumber?: string;
}

export interface User {
  username: string;
  role: 'admin' | 'viewer';
}

export interface IncidentUnitSummary {
  stationCode: string;
  stationName: string;
  assignmentRole?: string | null;
  dispatchedAt?: string | null;
  clearedAt?: string | null;
}

export interface IncidentAssetSummary {
  assetIdentifier: string;
  assetType: string;
  status?: string | null;
  notes?: string | null;
}

export interface IncidentNoteSummary {
  author: string;
  note: string;
  createdAt: string;
}
