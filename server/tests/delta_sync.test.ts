import request from 'supertest';
import express from 'express';
import incidentRoutes from '../src/routes/incidents';
import { incidentRepository } from '../src/db';

const app = express();
app.use(express.json());
app.use('/api/incidents', incidentRoutes);

// Mock repository methods
jest.mock('../src/db', () => ({
    incidentRepository: {
        getSyncStatus: jest.fn(),
        getChangesSince: jest.fn(),
        listIncidents: jest.fn(),
        listIncidentsForMap: jest.fn(),
        getIncidentDetail: jest.fn(),
        getIncidentMetadata: jest.fn(),
        searchIncidentByNumber: jest.fn(),
        createIncident: jest.fn(),
        deleteIncident: jest.fn(),
    },
}));

describe('Delta Sync API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /delta should return changes since timestamp', async () => {
        const mockChanges = [
            { incidentNumber: 'INC-001', title: 'New Incident', updated_at: '2023-01-02T00:00:00Z' },
            { incidentNumber: 'INC-002', title: 'Updated Incident', updated_at: '2023-01-02T00:00:00Z' },
            { incidentNumber: 'INC-003', title: 'Deleted Incident', deletedAt: '2023-01-02T00:00:00Z' },
        ];

        (incidentRepository.getChangesSince as jest.Mock).mockResolvedValue(mockChanges);

        const since = '2023-01-01T00:00:00Z';
        const response = await request(app).get(`/api/incidents/delta?since=${since}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(mockChanges);
        expect(incidentRepository.getChangesSince).toHaveBeenCalledWith(since);
    });

    it('GET /delta should return 400 if since is missing', async () => {
        const response = await request(app).get('/api/incidents/delta');
        expect(response.status).toBe(400);
    });
});
