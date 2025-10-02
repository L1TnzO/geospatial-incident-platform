import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import IncidentDetailModal from './IncidentDetailModal';
import { resetIncidentDetailStore, useIncidentDetailStore } from '@/store/useIncidentDetailStore';
import type { IncidentListItem } from '@/types/incidents';

const buildIncident = (overrides: Partial<IncidentListItem> = {}): IncidentListItem => ({
  incidentNumber: 'INC-100',
  title: 'Detail Test',
  occurrenceAt: new Date().toISOString(),
  reportedAt: new Date().toISOString(),
  dispatchAt: null,
  arrivalAt: null,
  resolvedAt: null,
  isActive: true,
  casualtyCount: 0,
  responderInjuries: 0,
  estimatedDamageAmount: null,
  location: {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-74, 40.7] },
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

describe('IncidentDetailModal', () => {
  afterEach(() => {
    act(() => {
      resetIncidentDetailStore();
    });
  });

  it('is hidden when no incident is selected', () => {
    render(<IncidentDetailModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders placeholder content when incident selected', () => {
    const incident = buildIncident();
    act(() => {
      useIncidentDetailStore.setState({ selectedIncident: incident, isOpen: true });
    });

    render(<IncidentDetailModal />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/detail view placeholder/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(useIncidentDetailStore.getState().isOpen).toBe(false);
  });
});
