import { render, screen, fireEvent } from '@testing-library/react';
import { TableView } from './TableView';
import { describe, it, expect, vi } from 'vitest';
import type { LiteIncident } from '../types';

const mockIncidents: LiteIncident[] = [
    {
        id: 'INC-001',
        title: 'Test Incident',
        type: 'Fire',
        severity: 'High',
        status: 'Active',
        occurrenceAt: '2023-01-01T12:00:00Z',
        reportedAt: '2023-01-01T12:05:00Z',
        location: { address: '123 Main St', latitude: 0, longitude: 0 },
        description: 'Test description',
        timestamp: '2023-01-01T12:05:00Z',
        severityColor: '#ff0000',
    },
];

describe('TableView', () => {
    const defaultProps = {
        incidents: mockIncidents,
        totalCount: 1,
        remainder: 0,
        page: 1,
        pageSize: 25,
        sortBy: 'reportedAt' as const,
        sortDirection: 'desc' as const,
        hasNext: false,
        hasPrevious: false,
        onSortChange: vi.fn(),
        onPageChange: vi.fn(),
        onIncidentClick: vi.fn(),
        isLoading: false,
        isFetching: false,
        isError: false,
        onRetry: vi.fn(),
        onSearchChange: vi.fn(),
    };

    it('renders the search input', () => {
        render(<TableView {...defaultProps} />);
        expect(screen.getByPlaceholderText('Search by ID...')).toBeInTheDocument();
    });

    it('calls onSearchChange when typing (debounced)', async () => {
        vi.useFakeTimers();
        render(<TableView {...defaultProps} />);

        const input = screen.getByPlaceholderText('Search by ID...');
        fireEvent.change(input, { target: { value: 'INC-002' } });

        // Should not be called immediately
        expect(defaultProps.onSearchChange).not.toHaveBeenCalled();

        // Fast-forward time
        vi.advanceTimersByTime(300);

        expect(defaultProps.onSearchChange).toHaveBeenCalledWith('INC-002');
        vi.useRealTimers();
    });

    it('displays incidents', () => {
        render(<TableView {...defaultProps} />);
        expect(screen.getByText('INC-001')).toBeInTheDocument();
    });
});
