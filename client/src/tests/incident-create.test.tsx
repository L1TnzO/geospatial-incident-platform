import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
// Avoid rendering the heavy Drawer primitive in unit tests; mock to simple passthroughs
vi.mock('../components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerClose: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
import { QueryProvider } from '../providers/query-client-provider';
import { IncidentCreateDrawer } from '../components/IncidentCreateDrawer';
import { useIncidentCreateStore } from '../store/incident-create-store';

describe('Incident create drawer', () => {
  it('opens drawer and toggles location selection', () => {
    render(
      <MemoryRouter>
        <QueryProvider>
          <IncidentCreateDrawer />
        </QueryProvider>
      </MemoryRouter>,
    );

    const newBtn = screen.getByRole('button', { name: /new incident/i });
    expect(newBtn).toBeDefined();

    // open drawer
    fireEvent.click(newBtn);

    const pickBtn = screen.getByRole('button', { name: /pick location on map/i });
    expect(pickBtn).toBeDefined();

    fireEvent.click(pickBtn);

    // selection state should be reflected in store
    const selecting = useIncidentCreateStore.getState().isSelectingLocation;
    expect(selecting).toBe(true);
  });
});
