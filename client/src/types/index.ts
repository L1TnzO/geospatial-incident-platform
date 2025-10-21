export interface Incident {
  id: string;
  type: string;
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
  zoneId?: string;
  isActive: boolean;
}

export interface FireStation {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface User {
  username: string;
  role: 'admin' | 'viewer';
}
