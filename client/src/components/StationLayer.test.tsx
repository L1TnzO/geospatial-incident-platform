import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { StationSummary } from '@/types/stations';
import StationLayer from './StationLayer';

vi.mock('react-leaflet', () => ({
  Marker: ({
    position,
    title,
    alt,
    children,
  }: {
    position: { lat: number; lng: number };
    title?: string;
    alt?: string;
    children?: ReactNode;
  }) => (
    <div
      data-testid="station-marker"
      data-lat={position.lat}
      data-lng={position.lng}
      data-title={title}
      data-alt={alt}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: ReactNode }) => (
    <div data-testid="station-popup">{children}</div>
  ),
}));

const buildStation = (overrides: Partial<StationSummary> = {}): StationSummary => ({
  stationCode: 'ST-100',
  name: 'Station 100',
  battalion: 'B1',
  phone: '555-0001',
  address: {
    line1: '1 Firehouse Way',
    city: 'Metropolis',
    region: 'NY',
    postalCode: '10001',
  },
  isActive: true,
  commissionedOn: null,
  decommissionedOn: null,
  coverageRadiusMeters: null,
  location: {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [-74.0, 40.7],
    },
    properties: {},
  },
  responseZone: null,
  ...overrides,
});

describe('StationLayer', () => {
  it('returns null when layer is hidden', () => {
    const { container } = render(<StationLayer stations={[buildStation()]} isVisible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders station markers with metadata when visible', () => {
    render(<StationLayer stations={[buildStation()]} isVisible />);

    const marker = screen.getByTestId('station-marker');
    expect(marker).toHaveAttribute('data-lat', '40.7');
    expect(marker).toHaveAttribute('data-lng', '-74');
    expect(marker).toHaveAttribute('data-title', 'Station 100 (ST-100)');
    expect(marker).toHaveAttribute('data-alt', 'Station 100 fire station');

    expect(screen.getByTestId('station-popup')).toBeInTheDocument();
    expect(screen.getByText('Station 100')).toBeInTheDocument();
    expect(screen.getByText('ST-100')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('ignores stations missing coordinates', () => {
    render(
      <StationLayer
        stations={[
          buildStation({ stationCode: 'ST-1' }),
          buildStation({
            stationCode: 'ST-2',
            location: {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [] },
              properties: {},
            },
          }),
        ]}
        isVisible
      />
    );

    const markers = screen.getAllByTestId('station-marker');
    expect(markers).toHaveLength(1);
    expect(markers[0]).toHaveAttribute('data-title', 'Station 100 (ST-1)');
  });
});
