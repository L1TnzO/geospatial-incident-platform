import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IncidentListItem } from '@/types/incidents';
import IncidentPopup from './IncidentPopup';

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-2025',
  title: 'Test Incident',
  occurrenceAt: '2025-10-01T12:00:00Z',
  reportedAt: '2025-10-01T12:05:00Z',
  dispatchAt: null,
  arrivalAt: null,
  resolvedAt: null,
  isActive: true,
  casualtyCount: 0,
  responderInjuries: 0,
  estimatedDamageAmount: null,
  location: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-73.9, 40.7] },
    properties: {},
  },
  locationGeohash: null,
  externalReference: null,
  type: { code: 'FIRE', name: 'Fire', description: null },
  severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
  status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
  source: null,
  weather: null,
  primaryStation: null,
  ...overrides,
});

describe('IncidentPopup', () => {
  it('renders incident metadata and severity badge', () => {
    const incident = buildIncident();
    const viewDetails = vi.fn();

    render(<IncidentPopup incident={incident} onViewDetails={viewDetails} />);

    expect(screen.getByText('Test Incident')).toBeInTheDocument();
    expect(screen.getByText('INC-2025')).toBeInTheDocument();
    const severityBadge = screen.getByText('High');
    expect(severityBadge).toHaveClass('incident-popup__severity');
  });

  it('emits view details action when button clicked', () => {
    const incident = buildIncident();
    const viewDetails = vi.fn();

    render(<IncidentPopup incident={incident} onViewDetails={viewDetails} />);

    fireEvent.click(screen.getByRole('button', { name: /view details/i }));
    expect(viewDetails).toHaveBeenCalledWith(incident);
  });
});
