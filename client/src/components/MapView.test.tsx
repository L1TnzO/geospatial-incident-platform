import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UseIncidentsResult } from '@/hooks/useIncidents';
import MapView from './MapView';

type PartialIncident = UseIncidentsResult['incidents'][number];

const mockedUseIncidents = vi.fn<() => UseIncidentsResult>(() => {
  throw new Error('useIncidents mock not configured');
});

vi.mock('@/hooks/useIncidents', () => ({
  useIncidents: () => mockedUseIncidents(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile" />,
  Marker: ({
    children,
    position,
  }: {
    children?: ReactNode;
    position: { lat: number; lng: number };
  }) => (
    <div data-testid="marker" data-lat={position.lat} data-lng={position.lng}>
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: ReactNode }) => <div data-testid="popup">{children}</div>,
}));

describe('MapView', () => {
  afterEach(() => {
    mockedUseIncidents.mockReset();
  });

  it('renders markers when incidents are available', async () => {
    const incident: PartialIncident = {
      incidentNumber: 'INC-123',
      title: 'Test Incident',
      severity: { code: 'HIGH', name: 'High', description: null, priority: 1, colorHex: '#ff0000' },
      status: { code: 'OPEN', name: 'Open', description: null, isTerminal: false },
      type: { code: 'FIRE', name: 'Fire', description: null },
      externalReference: null,
      occurrenceAt: new Date().toISOString(),
      reportedAt: new Date().toISOString(),
      dispatchAt: null,
      arrivalAt: null,
      resolvedAt: null,
      isActive: true,
      casualtyCount: 0,
      responderInjuries: 0,
      estimatedDamageAmount: null,
      locationGeohash: null,
      location: {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-74, 40.7] } as const,
        properties: {},
      } as PartialIncident['location'],
      source: null,
      weather: null,
      primaryStation: null,
    };

    mockedUseIncidents.mockReturnValue({
      incidents: [incident],
      isLoading: false,
      isError: false,
      error: undefined,
      refresh: vi.fn(),
      lastUpdated: undefined,
    });

    render(<MapView />);

    expect(screen.getByTestId('map')).toBeInTheDocument();
    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(1);
    expect(markers[0]).toHaveAttribute('data-lat', '40.7');
    expect(markers[0]).toHaveAttribute('data-lng', '-74');
  });

  it('shows error overlay with retry button when load fails', () => {
    const refreshMock = vi.fn();

    mockedUseIncidents.mockReturnValue({
      incidents: [],
      isLoading: false,
      isError: true,
      error: 'Network error',
      refresh: refreshMock,
      lastUpdated: undefined,
    });

    render(<MapView />);

    expect(screen.getByText('Network error')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(button);
    expect(refreshMock).toHaveBeenCalled();
  });
});
