import { Router } from 'express';
import {
  createIncident,
  getIncidentDetail,
  getIncidentMetadata,
  listIncidents,
  listMapIncidents,
  searchIncidentByNumber,
  getSyncStatus,
  getDelta,
} from '../controllers/incidentsController';

const router = Router();

router.get('/meta', getIncidentMetadata);
router.get('/sync-status', getSyncStatus);
router.get('/delta', getDelta);
router.get('/search', searchIncidentByNumber);
router.post('/', createIncident);
router.get('/map', listMapIncidents);
router.get('/', listIncidents);
router.get('/:incidentNumber', getIncidentDetail);

export default router;
