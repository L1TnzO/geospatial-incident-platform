import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient, type FetchIncidentsParams } from '../services/api-client';
import { mapIncidentToUi } from '../services/incidents';

export const useIncidentExport = () => {
    const [isExporting, setIsExporting] = useState(false);

    const exportData = async (filters: FetchIncidentsParams) => {
        setIsExporting(true);
        try {
            const CHUNK_SIZE = 1000; // Use a safe chunk size
            const allIncidents: any[] = [];

            // First request to get total count and first chunk
            const firstResponse = await apiClient.incidents.list({
                ...filters,
                page: 1,
                pageSize: CHUNK_SIZE,
            });

            if (!firstResponse || !firstResponse.data) {
                throw new Error('No data received');
            }

            const firstChunk = firstResponse.data
                .map(mapIncidentToUi)
                .filter((i) => i !== null);

            allIncidents.push(...firstChunk);

            const totalPages = firstResponse.pagination.totalPages;

            // Fetch remaining pages
            if (totalPages > 1) {
                const promises = [];
                for (let page = 2; page <= totalPages; page++) {
                    promises.push(
                        apiClient.incidents.list({
                            ...filters,
                            page: page,
                            pageSize: CHUNK_SIZE,
                        })
                    );
                }

                // Execute all promises (or could batch them if too many)
                // For now, assuming not millions of records, parallel is okay-ish
                // But to be safe, let's do batches of 5
                const BATCH_SIZE = 5;
                for (let i = 0; i < promises.length; i += BATCH_SIZE) {
                    const batch = promises.slice(i, i + BATCH_SIZE);
                    const responses = await Promise.all(batch);

                    responses.forEach(response => {
                        if (response && response.data) {
                            const chunk = response.data
                                .map(mapIncidentToUi)
                                .filter((i) => i !== null);
                            allIncidents.push(...chunk);
                        }
                    });
                }
            }

            if (allIncidents.length === 0) {
                toast.info('No incidents to export');
                return;
            }

            const headers = [
                'Incident Number',
                'Status',
                'Severity',
                'Type',
                'Reported At',
                'Occurrence At',
                'Location',
                'Description',
            ];

            const rows = allIncidents.map((incident) => [
                incident.id,
                incident.status,
                incident.severity,
                incident.type,
                incident.reportedAt ?? incident.timestamp,
                incident.occurrenceAt ?? '—',
                incident.location.address,
                incident.description,
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `incidents_export_all_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success(`Exported ${allIncidents.length} incidents`);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export incidents');
        } finally {
            setIsExporting(false);
        }
    };

    return { exportData, isExporting };
};
