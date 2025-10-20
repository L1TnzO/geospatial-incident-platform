export interface Incident {
  id: string;
  type: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  date: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  description: string;
  responseTime?: number; // in minutes
  status: 'Active' | 'Resolved' | 'Investigating';
  zoneId?: string;
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

export interface Filters {
  idSearch: string;
  dateRange: {
    start: string;
    end: string;
  };
  types: string[];
  severity: string;
}
